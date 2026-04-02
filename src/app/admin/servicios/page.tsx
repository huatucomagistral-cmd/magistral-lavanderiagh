"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Info } from "lucide-react";
import { db } from "@/lib/firebase";
import { useStore } from "@/store/useStore";
import { collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";

type ServiceItem = {
  id: string;
  name: string;
  price: number;
  type: "KG" | "UNIT";
  description?: string;
};

export default function ServicesPage() {
  const { user } = useStore();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState<"KG" | "UNIT">("KG");
  const [description, setDescription] = useState("");

  // Firebase Real-time Listener
  useEffect(() => {
    if (!user?.storeId) return;
    const collRef = collection(db, `stores/${user.storeId}/services`);
    const unsubscribe = onSnapshot(collRef, (snapshot) => {
      const data = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      })) as ServiceItem[];
      setServices(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(false);
    
    try {
      // Guardar en Firestore
      if (!user?.storeId) throw new Error("Store ID missing");
      await addDoc(collection(db, `stores/${user.storeId}/services`), {
        name,
        price: parseFloat(price) || 0,
        type,
        description
      });
      // reset
      setName(""); setPrice(""); setType("KG"); setDescription("");
    } catch(error) {
       console.error(error);
       alert("Error al guardar en la nube");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Seguro de eliminar este servicio de Firestore?")) {
      try {
        if (!user?.storeId) throw new Error("Store ID missing");
        await deleteDoc(doc(db, `stores/${user.storeId}/services`, id));
      } catch(error) {
        alert("Falló la eliminación");
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tarifario de Servicios</h1>
          <p className="text-white/60">Crea los servicios y precios que verán tus clientes y tu cajero.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary-hover active:scale-95 transition-all text-white font-semibold rounded-xl px-5 py-2.5 flex items-center gap-2"
        >
          <Plus size={18} /> Nuevo Servicio
        </button>
      </div>

      {isLoading ? (
         <div className="flex items-center justify-center p-12">
           <span className="animate-spin border-4 border-white/10 border-t-primary rounded-full w-12 h-12" />
         </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {services.length === 0 && (
           <div className="col-span-full text-center py-10 text-white/50 border-2 border-dashed border-white/5 rounded-2xl">
              No hay servicios registrados. Crea el primero.
           </div>
        )}
        {services.map(service => (
          <div key={service.id} className="glass-card p-6 flex flex-col justify-between group">
            <div className="mb-4 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white leading-tight mb-1">{service.name}</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/70">
                   {service.type === "KG" ? "Por Peso (Kilos)" : "Por Unidad (Pieza)"}
                </span>
              </div>
              <p className="font-mono text-xl font-bold text-primary">
                S/ {service.price.toFixed(2)}
              </p>
            </div>
            
            {service.description && (
              <p className="text-sm text-white/50 mb-6 flex-1 line-clamp-2">
                {service.description}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
              <button className="glass-button p-2 text-white/50 hover:text-white" title="Editar">
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => handleDelete(service.id)}
                className="glass-button p-2 text-white/50 hover:text-error hover:bg-error/10 border-transparent hover:border-error/20" 
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Modal Creación Simple */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="glass-card border border-white/10 w-full max-w-md overflow-hidden relative shadow-2xl">
             <div className="p-6 border-b border-white/5 bg-white/5">
                <h2 className="text-xl font-bold text-white">Nuevo Servicio</h2>
             </div>
             
             <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                   <label className="block text-sm font-medium text-white/70 mb-1">Nombre del Servicio</label>
                   <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Ej: Zapatillas blancas"
                     className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                   />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Precio (S/)</label>
                    <input type="number" step="0.10" min="0" value={price} onChange={e => setPrice(e.target.value)} required placeholder="0.00"
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Tipo de Cobro</label>
                    <select value={type} onChange={e => setType(e.target.value as any)}
                      className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="KG">Por Kilo</option>
                      <option value="UNIT">Por Unidad</option>
                    </select>
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-white/70 mb-1">Descripción Breve (Opcional)</label>
                   <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Agrega condiciones o detalles para el cliente..."
                     className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                   />
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-white/5">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 glass-button px-4 py-2 font-medium text-white">
                     Cancelar
                   </button>
                   <button type="submit" className="flex-1 bg-primary hover:bg-primary-hover px-4 py-2 font-medium text-white rounded-xl transition-all">
                     Guardar
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}
