"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { toast } from "react-hot-toast";
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Package, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: number;
}

export default function InventarioPage() {
  const { user } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: "", price: "", stock: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.storeId) return;
    const q = query(collection(db, `stores/${user.storeId}/products`), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data: Product[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      setProducts(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ name: product.name, price: product.price.toString(), stock: product.stock.toString() });
    } else {
      setEditingProduct(null);
      setFormData({ name: "", price: "", stock: "" });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        status: "ACTIVE",
        createdAt: editingProduct ? editingProduct.createdAt : Date.now(),
      };

      if (editingProduct) {
        await updateDoc(doc(db, `stores/${user.storeId}/products`, editingProduct.id), payload);
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

  const toggleStatus = async (product: Product) => {
    if (!user?.storeId) return;
    const newStatus = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await updateDoc(doc(db, `stores/${user.storeId}/products`, product.id), { status: newStatus });
      toast.success(`Producto ${newStatus === "ACTIVE" ? "Activo" : "Inactivo"}`);
    } catch (err) {
      toast.error("No se pudo cambiar el estado.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!user?.storeId) return;
    if (confirm(`¿Seguro que deseas eliminar definitivamente ${name}? Esto no afectará las ventas pasadas.`)) {
       try {
         await deleteDoc(doc(db, `stores/${user.storeId}/products`, id));
         toast.success("Producto eliminado.");
       } catch (err) {
         toast.error("Error al eliminar.");
       }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Package className="text-primary" size={32} />
            Inventario de Insumos
          </h1>
          <p className="text-foreground/70 font-medium">Gestiona tu catálogo de productos y controla tu stock disponible.</p>
        </div>
        
        <button 
          onClick={() => handleOpenModal()} 
          className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2"
        >
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-foreground/50">
            <Package size={48} className="mx-auto mb-4 text-foreground/20" />
            <p className="text-lg font-bold text-foreground">Tu inventario está vacío</p>
            <p className="text-sm font-medium mt-1">Crea tu primer producto para empezar a usar el Punto de Venta.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/10 bg-black/[0.02] text-foreground/70 text-xs uppercase font-black tracking-widest">
                  <th className="p-4 rounded-tl-xl">Producto</th>
                  <th className="p-4 text-right">Precio Venta</th>
                  <th className="p-4 text-center">Stock Disp.</th>
                  <th className="p-4 text-center rounded-tr-xl">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {products.map(p => (
                  <tr key={p.id} className="border-b border-black/5 hover:bg-black/[0.02] transition-colors">
                    <td className="p-4 font-bold text-foreground">{p.name}</td>
                    <td className="p-4 text-right text-success font-black font-mono">S/ {p.price.toFixed(2)}</td>
                    <td className="p-4 text-center">
                       <span className={`inline-block px-3 py-1 rounded-full font-black font-mono text-xs ${p.stock > 5 ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'}`}>
                         {p.stock} uni
                       </span>
                    </td>
                    <td className="p-4">
                       <div className="flex items-center justify-center gap-2">
                         <button onClick={() => handleOpenModal(p)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                           <Pencil size={18} />
                         </button>
                         <button onClick={() => handleDelete(p.id, p.name)} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors" title="Eliminar">
                           <Trash2 size={18} />
                         </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative z-10 animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between p-6 border-b border-black/5">
                <h2 className="text-xl font-bold text-foreground">{editingProduct ? "Editar Producto" : "Nuevo Producto"}</h2>
                <button onClick={handleCloseModal} className="text-foreground/50 hover:text-foreground">
                  <X size={20} />
                </button>
             </div>
             <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1">Nombre del Producto</label>
                  <input 
                    type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej. Gaseosa Inka Cola 500ml"
                    className="w-full bg-white/50 border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-bold text-foreground mb-1">Precio (S/)</label>
                     <input 
                       type="number" step="0.1" min="0" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
                       className="w-full bg-white/50 border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-foreground mb-1">Unid. en Stock</label>
                     <input 
                       type="number" step="1" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})}
                       className="w-full bg-white/50 border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                     />
                   </div>
                </div>

                <div className="pt-4">
                   <button 
                     type="submit" disabled={isSubmitting}
                     className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2"
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
