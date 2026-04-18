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
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>

        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o celular..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/50 border border-black/10 rounded-xl pl-11 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-16 text-center text-foreground/40">
            <Loader2 className="animate-spin mx-auto mb-3" size={32} />
            <p className="font-bold text-sm">Cargando base de datos...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 text-center text-foreground/40">
            <User className="mx-auto mb-3 opacity-30" size={48} />
            <p className="font-bold text-sm">No se encontraron clientes con esa búsqueda.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-black/5">
            {filteredClients.map(client => (
              <div key={client.id} className="p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between group hover:bg-black/[0.02] transition-colors relative gap-3">
                
                {/* Contenedor Principal: Cliente y DNI */}
                <div className="flex items-center gap-4 flex-1 pr-10 md:pr-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {client.name?.charAt(0).toUpperCase() || "?"}
                  </div>

                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="text-foreground font-medium text-sm sm:text-base group-hover:text-primary transition-colors truncate">
                      {(client.name || "Sin nombre").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <p className="text-foreground/60 text-[11px] font-bold tracking-wide flex items-center gap-1">
                        <Phone size={10} /> {client.phone || "---"}
                      </p>
                      <span className="text-foreground/30 text-[10px] hidden sm:inline">•</span>
                      <span className="text-foreground/70 text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-black/5 border border-black/5">
                        {client.dni || "Sin ID"}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${client.totalKgAccumulated >= 10 ? 'bg-success/10 text-success border border-success/20' : 'bg-black/5 text-foreground/50 border border-black/5'}`}>
                        <Award size={10} /> {client.totalKgAccumulated || 0} KG
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fidelidad & Actions (Desktop on right, Mobile on bottom) */}
                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-1 md:mt-0 pl-[56px] sm:pl-[64px] md:pl-0">
                  


                  {/* Desktop Button */}
                  <div className="hidden md:block">
                    <button
                      onClick={() => setEditingClient(client)}
                      className="p-2.5 text-primary bg-primary/5 hover:bg-primary/20 rounded-xl transition-all active:scale-95"
                      title="Editar Datos"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Mobile Button - Absolute top right */}
                <div className="absolute right-4 top-4 md:hidden">
                  <button
                    onClick={() => setEditingClient(client)}
                    className="p-2 text-primary bg-primary/5 hover:bg-primary/20 rounded-xl transition-all active:scale-95"
                    title="Editar Datos"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Edición */}
      {editingClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-black/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-black/5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <User className="text-primary" size={24} /> Editar Cliente
              </h2>
              <button
                onClick={() => setEditingClient(null)}
                className="p-2 hover:bg-black/5 rounded-full transition-colors text-foreground/50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-foreground/50 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                <input
                  type="text" required value={editingClient.name}
                  onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                  className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary outline-none shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-foreground/50 uppercase tracking-widest mb-1.5 ml-1">DNI / ID</label>
                  <input
                    type="text" maxLength={8} value={editingClient.dni}
                    onChange={e => setEditingClient({ ...editingClient, dni: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-foreground font-mono focus:ring-2 focus:ring-primary outline-none shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-foreground/50 uppercase tracking-widest mb-1.5 ml-1">Celular</label>
                  <input
                    type="text" maxLength={9} value={editingClient.phone}
                    onChange={e => setEditingClient({ ...editingClient, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-foreground font-mono focus:ring-2 focus:ring-primary outline-none shadow-sm"
                  />
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-2xl flex items-center justify-between border border-primary/10 mt-6">
                <div className="flex items-center gap-2 text-primary">
                  <Award size={20} />
                  <span className="text-sm font-bold">Kilos Acumulados</span>
                </div>
                <span className="text-xl font-black text-primary font-mono">{editingClient.totalKgAccumulated} KG</span>
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
