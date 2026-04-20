"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { toast } from "react-hot-toast";
import { collection, query, onSnapshot, addDoc, doc, updateDoc, writeBatch, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShoppingCart, Plus, Minus, X, CreditCard, Banknote, Loader2, PackageOpen, Pencil, Trash2, SwitchCamera } from "lucide-react";

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: number;
}

export default function POSPage() {
  const { user, isCajaOpen } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Mode State
  const [editMode, setEditMode] = useState(false);

  // Cart State (Local to POS)
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [processingMethod, setProcessingMethod] = useState<"EFECTIVO" | "YAPE" | null>(null);

  // Modal State (From Inventario)
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: "", price: "", stock: "", status: "ACTIVE" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.storeId) return;

    // Obtenemos todos los productos. Filtramos visualmente después si no estamos en editMode.
    const q = query(collection(db, `stores/${user.storeId}/products`));
    const unsub = onSnapshot(q, (snap) => {
      const data: Product[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const visibleProducts = editMode
    ? products
    : products.filter(p => p.status === "ACTIVE");

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Stock máximo alcanzado para ${product.name}`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      if (product.stock <= 0) {
        toast.error("Producto sin stock disponible.");
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQ = item.quantity + delta;
          if (newQ > item.product.stock) {
            toast.error("No hay suficiente stock.");
            return item;
          }
          if (newQ < 1) return item;
          return { ...item, quantity: newQ };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const handleCheckout = async (payMethod: "EFECTIVO" | "YAPE") => {
    if (!user?.storeId) return;
    if (cart.length === 0) return;
    if (!isCajaOpen) {
      toast.error("Debes abrir la caja chica desde la sección 'Caja' antes de cobrar.");
      return;
    }

    setProcessingMethod(payMethod);
    try {
      // 1. Guardar la venta en directSales
      const salePayload = {
        items: cart.map(c => ({
          productId: c.product.id,
          name: c.product.name,
          price: c.product.price,
          quantity: c.quantity
        })),
        total: cartTotal,
        payMethod,
        date: new Date().toISOString(),
        employeeId: user.email || user.uid,
      };

      await addDoc(collection(db, `stores/${user.storeId}/directSales`), salePayload);

      // 2. Descontar stock usando batch
      const batch = writeBatch(db);
      cart.forEach(item => {
        const pRef = doc(db, `stores/${user.storeId}/products`, item.product.id);
        const newStock = Math.max(item.product.stock - item.quantity, 0);
        batch.update(pRef, { stock: newStock });
      });
      await batch.commit();

      setCart([]);
      toast.success("Venta procesada con éxito.");
    } catch (error) {
      console.error(error);
      toast.error("Error al procesar la venta.");
    } finally {
      setProcessingMethod(null);
    }
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price.toString(),
        stock: product.stock.toString(),
        status: product.status
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: "", price: "", stock: "", status: "ACTIVE" });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.storeId) return;
    if (!formData.name || !formData.price || !formData.stock) {
      toast.error("Llena todos los campos vacíos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        status: formData.status as "ACTIVE" | "INACTIVE",
        createdAt: editingProduct ? editingProduct.createdAt : Date.now(),
      };

      if (editingProduct) {
        await updateDoc(doc(db, `stores/${user.storeId}/products`, editingProduct.id), payload);

        // Update cart items if price or name changed
        setCart(prev => prev.map(item => {
          if (item.product.id === editingProduct.id) {
            return {
              ...item,
              product: { ...item.product, ...payload, id: editingProduct.id } as Product
            }
          }
          return item;
        }));

        toast.success("Producto modificado correctamente.");
      } else {
        await addDoc(collection(db, `stores/${user.storeId}/products`), payload);
        toast.success("Producto nuevo creado.");
      }
      handleCloseModal();
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!user?.storeId) return;
    if (confirm(`¿Seguro que deseas eliminar definitivamente ${name}? Esto no afectará las ventas pasadas.`)) {
      try {
        await deleteDoc(doc(db, `stores/${user.storeId}/products`, id));
        // Remove from cart if it was there
        setCart(prev => prev.filter(item => item.product.id !== id));
        toast.success("Producto eliminado.");
      } catch (err) {
        toast.error("Error al eliminar.");
      }
    }
  };

  return (
    <div className="animate-in fade-in flex flex-col md:flex-row gap-6 h-auto md:h-[calc(100vh-120px)] pb-10 md:pb-0">

      {/* Zona de Productos */}
      <div className="flex-1 flex flex-col min-h-[400px] md:min-h-0 bg-transparent">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="text-primary" size={24} />
            Tienda
          </h1>

          {user?.role === "ADMIN" && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-white/50 px-3 py-1.5 rounded-xl border border-black/5 select-none hover:bg-white transition-colors">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} />
                  <div className={`block w-9 h-5 rounded-full transition-colors ${editMode ? 'bg-[#10b981]' : 'bg-black/20'}`}></div>
                  <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${editMode ? 'translate-x-4' : ''}`}></div>
                </div>
                <span className="text-sm font-bold text-foreground/80"></span>
              </label>

              {editMode && (
                <button
                  onClick={() => handleOpenModal()}
                  className="bg-primary hover:bg-primary-hover active:scale-95 transition-all text-white font-black rounded-xl p-2 sm:px-3 sm:py-1.5 flex items-center justify-center gap-2 shadow-sm shadow-primary/20 shrink-0"
                >
                  <Plus size={16} strokeWidth={3} />
                  <span className="hidden sm:inline text-sm">Nuevo Producto</span>
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 size={32} className="animate-spin text-primary" /></div>
        ) : visibleProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-foreground/40 glass-card">
            <PackageOpen size={48} className="mb-4 opacity-50" />
            <p className="font-bold text-lg">No hay productos disponibles</p>
            {editMode ? (
              <p className="text-sm">Empieza agregando tu primer producto.</p>
            ) : (
              <p className="text-sm">Pide a tu administrador que añada productos.</p>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-visible md:overflow-y-auto min-h-0 md:pb-10 scrollbar-hide py-2">
            <div className="bg-white/60 rounded-2xl border border-black/5 shadow-sm overflow-hidden flex flex-col">
              {visibleProducts.map((p, index) => {
                const isOutOfStock = p.stock <= 0;
                const canAddToCart = p.status === "ACTIVE" && p.stock > 0;

                return (
                  <div
                    key={p.id}
                    className={`relative flex flex-row items-center justify-between text-left transition-all p-4 sm:px-5 sm:py-4 group ${canAddToCart || editMode ? 'hover:bg-white/80' : 'opacity-60 grayscale'} ${index !== visibleProducts.length - 1 ? 'border-b border-black/5' : ''}`}
                  >
                    {!editMode && isOutOfStock && <span className="absolute inset-0 bg-white/40 z-10"></span>}
                    {editMode && p.status === "INACTIVE" && <span className="absolute inset-0 bg-[repeating-linear-gradient(45deg,_transparent,_transparent_10px,_rgba(0,0,0,0.02)_10px,_rgba(0,0,0,0.02)_20px)] z-0 pointer-events-none"></span>}

                    <div
                      className={`flex flex-col pr-4 relative z-20 flex-1 ${(!editMode && canAddToCart) ? 'cursor-pointer active:bg-black/5' : ''}`}
                      onClick={() => {
                        if (!editMode && canAddToCart) {
                          addToCart(p);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-base sm:text-lg leading-tight line-clamp-2 transition-colors ${!editMode && canAddToCart ? 'group-hover:text-primary text-foreground' : 'text-foreground'}`}>
                          {p.name}
                        </span>
                        {editMode && p.status === "INACTIVE" && (
                          <span className="bg-black/10 text-foreground/60 uppercase text-[10px] px-2 py-0.5 rounded font-black tracking-widest shrink-0">Oculto</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-black/5 text-foreground/60 w-max">{p.stock} unidades</span>
                        {isOutOfStock && <span className="bg-error/10 font-black uppercase text-[10px] text-error px-2 py-0.5 rounded-full shadow-sm">Agotado</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0 relative z-20 flex items-center gap-4">

                      {editMode ? (
                        <div className="flex items-center gap-1 bg-white/50 rounded-xl p-1 shadow-sm border border-black/5">
                          <button onClick={() => handleOpenModal(p)} className="flex items-center gap-2 px-3 py-2 text-primary bg-primary/10 hover:bg-primary hover:text-white font-bold text-xs rounded-lg transition-colors" title="Editar Producto">
                            <Pencil size={14} />
                          </button>
                          <div className="w-px h-6 bg-black/5 mx-1"></div>
                          <button onClick={() => handleDelete(p.id, p.name)} className="p-2 text-error hover:bg-error/10 hover:text-error rounded-lg transition-colors" title="Eliminar definitivamente">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="font-black text-primary text-base md:text-xl font-mono">S/ {p.price.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Zona del Carrito */}
      <div className="w-full md:w-[320px] lg:w-[380px] shrink-0 flex flex-col glass-card h-fit min-h-[250px] max-h-[600px] md:max-h-[calc(100vh-120px)] overflow-hidden border-2 border-primary/10 shadow-lg shadow-primary/5 transition-all duration-300 ease-in-out">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 border-b border-black/5 flex items-center justify-between shrink-0">
          <h2 className="font-black text-foreground tracking-tight flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            Carrito Actual
          </h2>
          <span className="bg-primary text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full leading-none">
            {cart.reduce((t, i) => t + i.quantity, 0)}
          </span>
        </div>

        <div className="flex-auto overflow-y-auto p-4 bg-white/50 flex flex-col relative transition-all duration-300">
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-foreground/30 py-6 text-center gap-3">
              <ShoppingCart size={40} className="opacity-20" />
              <p className="font-bold text-sm">El carrito está vacío.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="flex gap-3 bg-white p-3 rounded-xl border border-black/5 relative group">
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="absolute -top-2 -right-2 bg-white text-error w-6 h-6 rounded-full border border-black/5 shadow-sm flex items-center justify-center hover:bg-error hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{item.product.name}</p>
                    <p className="text-primary font-black font-mono text-xs">S/ {item.product.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-black/5 rounded-lg p-1 shrink-0 h-10">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm hover:text-primary"><Minus size={14} /></button>
                    <span className="font-black font-mono text-sm w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm hover:text-primary"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-black/5 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <span className="text-foreground/60 font-bold uppercase tracking-widest text-xs">Total a Pagar</span>
            <span className="text-3xl font-black text-foreground font-mono">
              S/ {cartTotal.toFixed(2)}
            </span>
          </div>

          {!isCajaOpen && (
            <div className="bg-error/10 text-error text-xs font-bold p-3 rounded-lg text-center mb-3">
              ⚠️ Atención: Debes abrir la caja chica desde el menú Caja para poder cobrar.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleCheckout("EFECTIVO")}
              disabled={processingMethod !== null || cart.length === 0 || !isCajaOpen}
              className="bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 disabled:active:scale-100 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#10b981]/20"
            >
              {processingMethod === "EFECTIVO" ? <Loader2 size={18} className="animate-spin" /> : <Banknote size={18} />}
              Efectivo
            </button>
            <button
              onClick={() => handleCheckout("YAPE")}
              disabled={processingMethod !== null || cart.length === 0 || !isCajaOpen}
              className="bg-[#742284] hover:bg-[#5a1b66] disabled:opacity-50 disabled:active:scale-100 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#742284]/20"
            >
              {processingMethod === "YAPE" ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
              Yape/Plin
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Nuevo/Editar Producto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-black/5">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                {editingProduct ? <Pencil size={20} className="text-primary" /> : <PackageOpen size={20} className="text-primary" />}
                {editingProduct ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button onClick={handleCloseModal} className="text-foreground/50 hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitModal} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1">Nombre del Producto</label>
                <input
                  type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Suavizante Suavitel 500ml"
                  className="w-full bg-white/50 border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">Precio Venta (S/)</label>
                  <input
                    type="number" step="0.1" min="0" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-white/50 border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">Stock Disp.</label>
                  <input
                    type="number" step="1" required value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-white/50 border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1">Estado de Visibilidad</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-white/50 border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                >
                  <option value="ACTIVE">Activo (Visible en Tienda)</option>
                  <option value="INACTIVE">Inactivo (Oculto)</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit" disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
