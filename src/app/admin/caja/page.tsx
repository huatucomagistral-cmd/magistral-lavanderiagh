"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { toast } from "react-hot-toast";
import { LockKeyhole, LockOpen, DollarSign, Wallet, ArrowRightLeft, Ticket, Loader2, Activity } from "lucide-react";
import { collection, onSnapshot, query, orderBy, setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CajaPage() {
  const { isCajaOpen, initialCash: globalInitialCash, user } = useStore();
  const [initialCashInput, setInitialCashInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!user?.storeId) return;
    const q = query(collection(db, `stores/${user.storeId}/orders`), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const data = snap.docs.map(d => {
        const raw = d.data();
        const dateObj = raw.date?.toDate ? raw.date.toDate() : new Date(raw.date);
        const orderDateStr = isNaN(dateObj.getTime()) ? '' : dateObj.toISOString().slice(0, 10);
        const paymentDateObj = raw.paymentDate ? new Date(raw.paymentDate) : null;
        const paymentDateStr = paymentDateObj && !isNaN(paymentDateObj.getTime()) ? paymentDateObj.toISOString().slice(0, 10) : '';
        
        return {
          id: d.id,
          ...raw,
          _isToday: orderDateStr === todayStr,
          _isPaidToday: (paymentDateStr === todayStr) || (!raw.paymentDate && orderDateStr === todayStr && raw.paymentStatus === 'PAID'),
        };
      });
      setOrders(data);
      setLoadingOrders(false);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user?.storeId) return;
    
    // Traemos todos y filtramos en JS para más velocidad sin índices compuestos complejos por ahora
    const q = query(collection(db, `stores/${user.storeId}/expenses`), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const data = snap.docs.map(d => {
        const raw = d.data();
        const dateObj = raw.date?.toDate ? raw.date.toDate() : new Date(raw.date);
        const expDateStr = dateObj.toISOString().slice(0, 10);
        return { id: d.id, ...raw, _isToday: expDateStr === todayStr };
      });
      // Filtrar gastos de hoy que deben descontarse de caja
      setExpenses(data.filter((e: any) => e._isToday && e.subtractFromCaja));
    });
    return () => unsub();
  }, [user]);

  // Solo sumar a la caja los pedidos que fueron pagados hoy (ya sea por creación o porque se cobraron posteriormente).
  const todayOrders = orders.filter(o => o._isPaidToday);

  const stats = todayOrders.reduce((acc, order) => {
    const total = Number(order.total) || 0;
    if(order.payMethod === "EFECTIVO") acc.efectivo += total;
    if(order.payMethod === "YAPE") acc.yape += total;
    if(order.payMethod === "TRANSFERENCIA") acc.transferencia += total;
    acc.cobrados += 1;
    return acc;
  }, { efectivo: 0, yape: 0, transferencia: 0, cobrados: 0 });

  const totalIngresos = stats.efectivo + stats.yape + stats.transferencia;
  const totalGastosCaja = expenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
  const saldoFinalEfectivo = (globalInitialCash || 0) + stats.efectivo - totalGastosCaja;
  const currentInitial = globalInitialCash || 0;

  const handleOpenCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialCashInput) return;
    setIsProcessing(true);
    
    try {
      if (!user?.storeId) throw new Error("Store ID missing");
      await setDoc(doc(db, `stores/${user.storeId}/caja/sesion`), {
        isOpen: true,
        initialCash: parseFloat(initialCashInput),
        openedAt: new Date().toISOString(),
        openedBy: user?.email || "unknown"
      });
    } catch (err) {
      console.error("Error abriendo caja", err);
      toast.error("No se pudo abrir la caja.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseCaja = async () => {
    if(confirm("Al cerrar caja se generará el reporte del día y no podrás cobrar más órdenes en esta sesión. ¿Continuar?")) {
      setIsProcessing(true);
      try {
        if (!user?.storeId) throw new Error("Store ID missing");
        await setDoc(doc(db, `stores/${user.storeId}/caja/sesion`), {
          isOpen: false,
          initialCash: 0,
          closedAt: new Date().toISOString(),
          closedBy: user?.email || "unknown"
        });
        setInitialCashInput("");
        toast.success("Caja cerrada exitosamente. Reporte generado.");
      } catch (err) {
         console.error("Error cerrando caja", err);
      } finally {
         setIsProcessing(false);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Control de Caja</h1>
          <p className="text-foreground/70 font-medium">Abre tu turno con el sencillo en efectivo y monitorea tus ingresos.</p>
        </div>
        
        <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold ${isCajaOpen ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
           {isCajaOpen ? <LockOpen size={18} /> : <LockKeyhole size={18} />}
           {isCajaOpen ? 'CAJA ABIERTA' : 'CAJA CERRADA'}
        </div>
      </div>

      {!isCajaOpen ? (
        <div className="max-w-md mx-auto mt-20">
          <form onSubmit={handleOpenCaja} className="glass-card p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
              <DollarSign size={32} />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Apertura de Caja</h2>
            <p className="text-foreground/70 text-sm font-medium">Ingresa el monto de efectivo con el que estás empezando este turno para poder cobrar órdenes.</p>
            
            <div className="text-left mt-6">
               <label className="block text-sm font-medium text-foreground/70 mb-2 text-center">Efectivo Inicial (Para Vuelto)</label>
               <div className="relative max-w-xs mx-auto">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/70 font-bold">S/</span>
                 <input 
                   type="number" step="0.10" min="0" value={initialCashInput} onChange={e => setInitialCashInput(e.target.value)} required
                   className="w-full bg-white/50 border border-black/10 rounded-2xl pl-10 pr-4 py-4 text-foreground font-mono text-xl text-center focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                   placeholder="0.00"
                 />
               </div>
            </div>

            <button type="submit" disabled={isProcessing} className="w-full bg-primary hover:bg-primary-hover font-bold text-white py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-primary/20">
              {isProcessing ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" /> : <LockOpen size={20} />}
              Abrir Caja Ahora
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 bg-white/80 border-primary/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-[0.05] pointer-events-none">
                 <Wallet size={120} className="text-primary" />
              </div>
              <h3 className="text-foreground/70 font-medium mb-1 relative z-10">Balance en Caja</h3>
              <p className="text-4xl font-black text-foreground tracking-tight relative z-10 font-mono">
                S/ {saldoFinalEfectivo.toFixed(2)}
              </p>
              
              <div className="mt-6 flex flex-col gap-2 relative z-10">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/70 font-semibold">Base Inicial:</span>
                  <span className="text-foreground font-bold">S/ {currentInitial.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/70 font-semibold">Cobros Efectivo:</span>
                  <span className="text-success font-black">+ S/ {stats.efectivo.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/70 font-semibold">Gastos de Caja:</span>
                  <span className="text-error font-black">- S/ {totalGastosCaja.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-xs mt-4 pt-4 border-t border-black/5">
                  <span className="text-foreground/70 font-black uppercase tracking-tight">Órdenes Pagadas:</span>
                  <span className="text-success font-black">{stats.cobrados}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-black/5 relative z-10">
                 <button onClick={handleCloseCaja} disabled={isProcessing} className="w-full bg-error hover:bg-error/80 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-error/10">
                    {isProcessing ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" /> : <LockKeyhole size={20} />}
                    Realizar Cierre de Caja
                 </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-5">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-success"><DollarSign size={16}/></div>
                     <span className="text-foreground/80 font-bold text-sm">Efectivo</span>
                   </div>
                   <p className="text-2xl font-bold text-foreground font-mono">S/ {stats.efectivo.toFixed(2)}</p>
                </div>
                <div className="glass-card p-5">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-full bg-[#742284]/20 flex items-center justify-center text-[#742284]"><DollarSign size={16}/></div>
                     <span className="text-foreground/80 font-bold text-sm">Yape/Plin</span>
                   </div>
                   <p className="text-2xl font-bold text-foreground font-mono">S/ {stats.yape.toFixed(2)}</p>
                </div>
                <div className="glass-card p-5">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent"><ArrowRightLeft size={16}/></div>
                     <span className="text-foreground/80 font-bold text-sm">Transfer</span>
                   </div>
                   <p className="text-2xl font-bold text-foreground font-mono">S/ {stats.transferencia.toFixed(2)}</p>
                </div>
             </div>

              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 font-black tracking-tight flex items-center gap-2">
                   <Activity size={20} className="text-primary" /> Actividad de Caja (Hoy)
                </h3>
                
                {loadingOrders ? (
                   <div className="flex py-8 justify-center"><Loader2 className="animate-spin text-foreground/40" /></div>
                ) : (
                  <div className="max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-black/10 text-foreground/70 text-[10px] uppercase font-black tracking-widest bg-black/5">
                          <th className="py-3 px-4">Movimiento</th>
                          <th className="py-3 px-4">Tipo</th>
                          <th className="py-3 px-4 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {todayOrders.map((o) => (
                          <tr key={o.id} className="border-b border-black/5 hover:bg-black/[0.02]">
                            <td className="py-3 px-4 font-mono">
                              <span className="text-primary font-bold">{o.ticketNumber || o.id.slice(0,6).toUpperCase()}</span>
                              <span className="block text-foreground/60 text-[10px] font-sans normal-case font-medium">{o.customerName}</span>
                            </td>
                            <td className="py-3 px-4">
                              {o.payMethod === "YAPE" && <span className="px-2 py-0.5 rounded-full bg-[#742284]/10 text-[#742284] text-[9px] font-black uppercase">YAPE/PLIN</span>}
                              {o.payMethod === "EFECTIVO" && <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[9px] font-black uppercase">EFECTIVO</span>}
                              {o.payMethod === "TRANSFERENCIA" && <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-black uppercase">TRANSFER</span>}
                            </td>
                            <td className="py-3 px-4 text-right text-success font-black font-mono">+ S/ {Number(o.total).toFixed(2)}</td>
                          </tr>
                        ))}
                        
                        {expenses.map((e) => (
                          <tr key={e.id} className="border-b border-black/5 bg-error/[0.03] hover:bg-error/[0.06]">
                            <td className="py-3 px-4 font-mono">
                              <span className="text-error font-bold tracking-tight">EGRESO CAJA</span>
                              <span className="block text-error/70 text-[10px] font-bold font-sans italic">{e.description}</span>
                            </td>
                            <td className="py-3 px-4">
                               <span className="px-2 py-0.5 rounded-full bg-error/20 text-error text-[9px] font-black uppercase">GASTO CAJA</span>
                            </td>
                            <td className="py-3 px-4 text-right text-error font-black font-mono">- S/ {Number(e.amount).toFixed(2)}</td>
                          </tr>
                        ))}

                        {(todayOrders.length === 0 && expenses.length === 0) && (
                          <tr>
                             <td colSpan={3} className="py-10 text-center text-foreground/60 italic text-xs font-bold font-sans">Sin movimientos de dinero aún</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
