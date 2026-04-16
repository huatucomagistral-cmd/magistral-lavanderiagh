"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { toast } from "react-hot-toast";
import { collection, query, onSnapshot, addDoc, doc, updateDoc, orderBy, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShoppingCart, Plus, Minus, X, CreditCard, Banknote, Loader2, PackageOpen } from "lucide-react";
import { Product } from "../inventario/page"; // Reusing the interface from inventario

export default function POSPage() {
  const { user, isCajaOpen } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart State (Local to POS)
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user?.storeId) return;
    // Solo mostramos productos activos
    const q = query(
        collection(db, `stores/${user.storeId}/products`), 
        where("status", "==", "ACTIVE")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data: Product[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

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
        toast.error("Producto sin stock dispónible.");
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

    setIsProcessing(true);
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
        date: new Date().toISOString(), // Usamos ISO en string o Timestamp
        employeeId: user.email || user.uid,
      };

      await addDoc(collection(db, `stores/${user.storeId}/directSales`), salePayload);

      // 2. Descontar stock usando batch
      const batch = writeBatch(db);
      cart.forEach(item => {
         const pRef = doc(db, `stores/${user.storeId}/products`, item.product.id);
         const newStock = Math.max(item.product.stock - item.quantity, 0); // Evitar negativos
         batch.update(pRef, { stock: newStock });
      });
      await batch.commit();

      setCart([]);
      toast.success("Venta procesada con éxito.");
    } catch (error) {
      console.error(error);
      toast.error("Error al procesar la venta.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-in fade-in flex flex-col md:flex-row gap-6 h-auto md:h-[calc(100vh-120px)] pb-10 md:pb-0">
      
      {/* Zona de Productos */}
      <div className="flex-1 flex flex-col min-h-[400px] md:min-h-0 bg-transparent">
         <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 mb-2">
            <ShoppingCart className="text-primary" size={32} />
            Punto de Venta
          </h1>
          <p className="text-foreground/70 font-medium mb-6 text-sm">Toca un producto para agregarlo rápidamente al carrito.</p>
         </div>

         {loading ? (
             <div className="flex-1 flex justify-center items-center"><Loader2 size={32} className="animate-spin text-primary"/></div>
         ) : products.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center text-foreground/40 glass-card">
               <PackageOpen size={48} className="mb-4 opacity-50" />
               <p className="font-bold text-lg">No hay productos en venta</p>
               <p className="text-sm">Ve a Inventario para registrar productos.</p>
             </div>
         ) : (
            <div className="flex-1 overflow-y-visible md:overflow-y-auto min-h-0 md:pb-10 scrollbar-hide py-2">
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 h-full content-start">
                 {products.map(p => (
                   <button 
                     key={p.id}
                     onClick={() => addToCart(p)}
                     disabled={p.stock <= 0}
                     className={`relative bg-white rounded-2xl p-4 border border-black/5 flex flex-row items-center justify-between text-left transition-all ${p.stock > 0 ? 'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 active:scale-95 cursor-pointer' : 'opacity-50 cursor-not-allowed grayscale'}`}
                   >
                     {p.stock <= 0 && <span className="absolute inset-0 bg-white/60 z-10 rounded-2xl"></span>}
                     
                     <div className="flex flex-col pr-4 relative z-20">
                        <span className="font-bold text-foreground text-sm md:text-base leading-tight line-clamp-2">{p.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-foreground/50 font-bold uppercase tracking-widest">{p.stock} unidades</span>
                          {p.stock <= 0 && <span className="bg-error font-black uppercase text-[10px] text-white px-2 py-0.5 rounded-full shadow-md">Agotado</span>}
                        </div>
                     </div>
                     
                     <div className="text-right shrink-0 relative z-20">
                        <span className="font-black text-success text-base md:text-lg font-mono">S/ {p.price.toFixed(2)}</span>
                     </div>
                   </button>
                 ))}
               </div>
            </div>
         )}
      </div>

      {/* Zona del Carrito */}
      <div className="w-full md:w-[320px] lg:w-[380px] shrink-0 flex flex-col glass-card h-[600px] md:h-full overflow-hidden border-2 border-primary/10 shadow-2xl shadow-primary/5">
         <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 border-b border-black/5 flex items-center justify-between shrink-0">
             <h2 className="font-black text-foreground tracking-tight flex items-center gap-2">
               <ShoppingCart size={18} className="text-primary"/> 
               Carrito Actual
             </h2>
             <span className="bg-primary text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full leading-none">
               {cart.reduce((t, i) => t + i.quantity, 0)}
             </span>
         </div>

         <div className="flex-1 overflow-y-auto p-4 bg-white/50 relative">
            {cart.length === 0 ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground/30 p-8 text-center gap-3">
                 <ShoppingCart size={40} className="opacity-20" />
                 <p className="font-bold text-sm">El carrito está vacío. Toca los productos para empezar.</p>
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
                          <p className="font-bold text-foreground text-sm truncate">{item.product.name}</p>
                          <p className="text-primary font-black font-mono text-xs">S/ {item.product.price.toFixed(2)}</p>
                       </div>
                       <div className="flex items-center gap-2 bg-black/5 rounded-lg p-1 shrink-0 h-10">
                          <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm hover:text-primary"><Minus size={14}/></button>
                          <span className="font-black font-mono text-sm w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm hover:text-primary"><Plus size={14}/></button>
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
                 disabled={isProcessing || cart.length === 0 || !isCajaOpen}
                 className="bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 disabled:active:scale-100 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#10b981]/20"
               >
                 {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Banknote size={18} />}
                 Efectivo
               </button>
               <button 
                 onClick={() => handleCheckout("YAPE")}
                 disabled={isProcessing || cart.length === 0 || !isCajaOpen}
                 className="bg-[#742284] hover:bg-[#5a1b66] disabled:opacity-50 disabled:active:scale-100 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#742284]/20"
               >
                 {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                 Yape/Plin
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
