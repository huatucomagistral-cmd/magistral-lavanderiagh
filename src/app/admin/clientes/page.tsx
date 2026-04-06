"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { Search, User, Edit2, Phone, CreditCard, Award, X, Save, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

type Client = {
  id: string; // Document ID is its DNI
  dni: string;
  name: string;
  phone: string;
  totalKgAccumulated: number;
};

export default function ClientesPage() {
  const { user } = useStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user?.storeId) return;
    
    const q = query(collection(db, `stores/${user.storeId}/clients`), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Client[];
      setClients(data);
      setLoading(false);
    });
    
    return () => unsub();
  }, [user]);

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !user?.storeId) return;
    
    setIsSaving(true);
    try {
      const clientRef = doc(db, `stores/${user.storeId}/clients`, editingClient.id);
      await updateDoc(clientRef, {
        name: editingClient.name,
        phone: editingClient.phone,
        dni: editingClient.dni
      });
      toast.success("Datos del cliente actualizados.");
      setEditingClient(null);
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredClients = clients.filter(c => 
    (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.dni || "").includes(searchTerm) ||
    (c.phone || "").includes(searchTerm)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Base de Clientes</h1>
          <p className="text-white/60">Gestiona la información y fidelidad de tus clientes recurrentes.</p>
        </div>
        
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, DNI o celular..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary shadow-lg"
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-black text-white/40 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-xs font-black text-white/40 uppercase tracking-widest">Identificación</th>
                <th className="px-6 py-4 text-xs font-black text-white/40 uppercase tracking-widest text-center">Fidelidad (Kgs)</th>
                <th className="px-6 py-4 text-xs font-black text-white/40 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-white/30">
                    <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                    Cargando base de datos...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-white/30">
                    No se encontraron clientes con esa búsqueda.
                  </td>
                </tr>
              ) : (
                filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {client.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-white font-bold group-hover:text-primary transition-colors">{client.name || "Sin nombre"}</p>
                          <p className="text-white/40 text-xs flex items-center gap-1 mt-0.5">
                            <Phone size={12} /> {client.phone || "---"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-white/70 text-sm font-mono flex items-center gap-1.5">
                          <CreditCard size={14} className="text-white/20" /> {client.dni || "Sin ID"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex flex-col items-center">
                          <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-black ${client.totalKgAccumulated >= 10 ? 'bg-success/20 text-success' : 'bg-white/10 text-white/50'}`}>
                             <Award size={14} /> {client.totalKgAccumulated || 0} KG
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setEditingClient(client)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/5"
                        title="Editar Datos"
                      >
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edición */}
      {editingClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="text-primary" size={24} /> Editar Cliente
              </h2>
              <button 
                onClick={() => setEditingClient(null)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-white/30 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                <input 
                  type="text" required value={editingClient.name}
                  onChange={e => setEditingClient({...editingClient, name: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-white/30 uppercase tracking-widest mb-1.5 ml-1">DNI / ID</label>
                  <input 
                    type="text" maxLength={8} value={editingClient.dni}
                    onChange={e => setEditingClient({...editingClient, dni: e.target.value.replace(/\D/g, '')})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-white/30 uppercase tracking-widest mb-1.5 ml-1">Celular</label>
                  <input 
                    type="text" maxLength={9} value={editingClient.phone}
                    onChange={e => setEditingClient({...editingClient, phone: e.target.value.replace(/\D/g, '')})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-2xl flex items-center justify-between border border-primary/10 mt-6">
                <div className="flex items-center gap-2 text-primary">
                  <Award size={20} />
                  <span className="text-sm font-bold">Kilos Acumulados</span>
                </div>
                <span className="text-xl font-black text-white font-mono">{editingClient.totalKgAccumulated} KG</span>
              </div>

              <button 
                type="submit" disabled={isSaving}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 mt-6"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
