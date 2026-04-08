"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { 
  Plus, 
  Trash2, 
  DollarSign, 
  Calendar, 
  Loader2, 
  ArrowDownCircle, 
  Wallet,
  X,
  CreditCard
} from "lucide-react";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "react-hot-toast";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: any; 
  subtractFromCaja: boolean;
  createdBy: string;
}

const CATEGORIES = [
  { id: "INSUMOS", label: "Insumos", icon: "🧼" },
  { id: "SERVICIOS", label: "Servicios", icon: "⚡" },
  { id: "PERSONAL", label: "Personal", icon: "👷" },
  { id: "MANTENIMIENTO", label: "Mantenimiento", icon: "🔧" },
  { id: "OTROS", label: "Otros", icon: "✨" }
];

export default function GastosPage() {
  const { user } = useStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Form State
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("INSUMOS");
  const [subtractFromCaja, setSubtractFromCaja] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user?.storeId) return;

    const q = query(
      collection(db, `stores/${user.storeId}/expenses`),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Expense[];
      setExpenses(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Totales
  const todayStr = new Date().toISOString().slice(0, 10);
  const thisMonthStr = new Date().toISOString().slice(0, 7);

  const stats = expenses.reduce((acc, exp) => {
    const rawDate = exp.date?.toDate ? exp.date.toDate() : (exp.date ? new Date(exp.date) : new Date());
    const expDateStr = rawDate.toISOString().slice(0, 10);
    const expMonthStr = rawDate.toISOString().slice(0, 7);

    if (expDateStr === todayStr) acc.today += Number(exp.amount) || 0;
    if (expMonthStr === thisMonthStr) acc.month += Number(exp.amount) || 0;
    return acc;
  }, { today: 0, month: 0 });

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    setIsSaving(true);

    try {
      await addDoc(collection(db, `stores/${user?.storeId}/expenses`), {
        description,
        amount: parseFloat(amount),
        category,
        subtractFromCaja,
        date: serverTimestamp(),
        createdBy: user?.email || "unknown",
        storeId: user?.storeId
      });

      toast.success("Gasto registrado");
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este registro de gasto?")) return;
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, `stores/${user?.storeId}/expenses`, id));
      toast.success("Registro eliminado");
    } catch (err) {
      toast.error("Error al eliminar");
    } finally {
      setIsDeleting(null);
    }
  };

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setCategory("INSUMOS");
    setSubtractFromCaja(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gastos y Egresos</h1>
          <p className="text-foreground/70 font-medium">Registra tus salidas de dinero para cuadrar balances financieros.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-primary/20 w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          Nuevo Gasto
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="glass-card p-6 border-l-4 border-error overflow-hidden relative">
          <div className="absolute -right-4 -top-4 text-error/10">
            <ArrowDownCircle size={100} />
          </div>
          <h3 className="text-sm font-bold text-foreground/80 uppercase tracking-tight mb-1">Gastos de Hoy</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-error font-mono">S/ {stats.today.toFixed(2)}</span>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-primary overflow-hidden relative">
           <div className="absolute -right-4 -top-4 text-primary/10">
            <Calendar size={100} />
          </div>
          <h3 className="text-sm font-bold text-foreground/80 uppercase tracking-tight mb-1">Gastos del Mes</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-primary font-mono">S/ {stats.month.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-black/5 bg-white/30 flex justify-between items-center">
            <h2 className="font-bold text-lg text-foreground">Movimientos Recientes</h2>
            <div className="text-sm text-foreground/60 font-bold flex items-center gap-2">
               <CreditCard size={16} /> Detalle de Egresos
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/10 text-foreground/80 text-[10px] uppercase tracking-widest font-black">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Fondo</th>
                <th className="px-6 py-4 text-right">Monto</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="animate-spin text-primary mx-auto mb-2" size={30} />
                    <span className="text-foreground/60 font-bold">Cargando movimientos financieros...</span>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                   <td colSpan={6} className="py-20 text-center text-foreground/70 italic font-black">
                      No hay gastos registrados en el sistema aún.
                   </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-black/2 cursor-default transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className="text-sm font-bold text-foreground/90">
                         {exp.date?.toDate 
                           ? exp.date.toDate().toLocaleDateString('es-PE', { day:'2-digit', month:'short' }) 
                           : 'Pendiente'}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-sm font-black text-foreground block">{exp.description}</span>
                       <span className="text-[10px] text-foreground/60 font-bold uppercase tracking-tight">{exp.createdBy}</span>
                    </td>
                    <td className="px-6 py-4">
                       <span className="px-2.5 py-1 rounded-lg bg-black/5 text-foreground/80 text-[10px] font-black tracking-widest uppercase">
                          {CATEGORIES.find(c => c.id === exp.category)?.icon} {exp.category}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                       {exp.subtractFromCaja ? (
                         <div className="flex items-center gap-1.5 text-success font-black text-[10px] uppercase tracking-tight">
                            <Wallet size={12} /> Caja Abierta
                         </div>
                       ) : (
                         <div className="text-foreground/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <CreditCard size={12} /> Fondo Externo
                         </div>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <span className="text-base font-black text-error font-mono">- S/ {Number(exp.amount).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex justify-center">
                          <button 
                            onClick={() => handleDelete(exp.id)}
                            disabled={isDeleting === exp.id}
                            className={`p-2 rounded-lg transition-colors ${
                              isDeleting === exp.id ? 'bg-black/5 text-foreground/20' : 'text-error/40 hover:text-error hover:bg-error/10'
                            }`}
                          >
                            {isDeleting === exp.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                          </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Nuevo Gasto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           {/* Overlay */}
           <div 
             className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
             onClick={() => !isSaving && setIsModalOpen(false)}
           />
           
           {/* Content */}
           <div className="bg-white rounded-3xl w-full max-w-md p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 border border-black/5">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-6 right-6 text-foreground/40 hover:text-foreground transition-colors"
                disabled={isSaving}
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                 <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center text-error shadow-inner shadow-error/10">
                    <ArrowDownCircle size={24} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">Nuevo Egreso</h2>
                    <p className="text-foreground/60 text-sm font-bold">Registra una salida de dinero real</p>
                 </div>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-5">
                 <div>
                    <label className="block text-[10px] font-black text-foreground/60 uppercase tracking-[0.2em] mb-2 ml-1">Descripción del Gasto</label>
                    <input 
                      type="text" value={description} onChange={e => setDescription(e.target.value)} required
                      className="w-full bg-black/5 border-none rounded-2xl px-5 py-4 text-foreground font-bold focus:ring-2 focus:ring-error transition-all placeholder:text-foreground/20"
                      placeholder="Ej. Detergente, Luz, Alquiler..."
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-foreground/60 uppercase tracking-[0.2em] mb-2 ml-1">Monto (S/)</label>
                        <input 
                          type="number" step="0.10" value={amount} onChange={e => setAmount(e.target.value)} required
                          className="w-full bg-black/5 border-none rounded-2xl px-5 py-4 text-foreground font-mono text-xl focus:ring-2 focus:ring-error transition-all font-black"
                          placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-foreground/60 uppercase tracking-[0.2em] mb-2 ml-1">Categoría</label>
                        <select 
                           value={category} onChange={e => setCategory(e.target.value)}
                           className="w-full bg-black/5 border-none rounded-2xl px-5 py-4 text-foreground font-bold focus:ring-2 focus:ring-error transition-all appearance-none cursor-pointer"
                        >
                           {CATEGORIES.map(c => (
                             <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                           ))}
                        </select>
                    </div>
                 </div>

                 <label className="flex items-center gap-3 p-4 bg-black/5 rounded-2xl cursor-pointer hover:bg-black/[0.08] transition-colors group">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      subtractFromCaja ? "bg-error border-error text-white" : "border-black/20 group-hover:border-error/30"
                    }`}>
                       {subtractFromCaja && <div className="w-2 h-2 bg-white rounded-full animate-in zoom-in" />}
                    </div>
                    <input 
                       type="checkbox" className="hidden" checked={subtractFromCaja} 
                       onChange={e => setSubtractFromCaja(e.target.checked)} 
                    />
                    <div>
                       <span className="text-sm font-bold text-foreground block">Descontar de Caja Abierta</span>
                       <span className="text-[10px] text-foreground/60 font-bold uppercase tracking-tight">Afecta directamente al balance del día</span>
                    </div>
                 </label>

                 <div className="pt-4">
                    <button 
                      type="submit" disabled={isSaving}
                      className="w-full bg-error hover:bg-error/90 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-error/20"
                    >
                      {isSaving ? <Loader2 size={24} className="animate-spin" /> : <DollarSign size={24} />}
                      <span>Registrar Movimiento</span>
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
