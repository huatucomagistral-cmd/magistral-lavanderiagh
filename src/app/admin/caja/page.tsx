"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { toast } from "react-hot-toast";
import { LockKeyhole, LockOpen, DollarSign, Wallet, ArrowRightLeft, Ticket, Loader2, Activity, History, X } from "lucide-react";
import { collection, onSnapshot, query, orderBy, setDoc, doc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CajaPage() {
  const { isCajaOpen, initialCash: globalInitialCash, cajaOpenedAt, user } = useStore();
  const [initialCashInput, setInitialCashInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [directSales, setDirectSales] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [cajaHistoryList, setCajaHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!user?.storeId) return;
    const q = query(collection(db, `stores/${user.storeId}/orders`), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const cajaOpenedDate = cajaOpenedAt ? new Date(cajaOpenedAt).getTime() : null;

      const data = snap.docs.map(d => {
        const raw = d.data();
        
        let paymentDateObj = null;
        if (raw.paymentDate) {
           paymentDateObj = new Date(raw.paymentDate);
        } else if (raw.paymentStatus === 'PAID') { // Fallback al creation date if fully paid on creation
           paymentDateObj = raw.date?.toDate ? raw.date.toDate() : new Date(raw.date);
        }

        let _isInCajaSession = false;
        
        if (cajaOpenedDate && paymentDateObj && !isNaN(paymentDateObj.getTime())) {
            _isInCajaSession = paymentDateObj.getTime() >= cajaOpenedDate;
        }

        return {
          id: d.id,
          ...raw,
          _isInCajaSession
        };
      });
      setOrders(data);
      setLoadingOrders(false);
    });
    return () => unsub();
  }, [user, cajaOpenedAt]);

  useEffect(() => {
    if (!user?.storeId) return;
    
    // Traemos todos y filtramos en JS para más velocidad sin índices compuestos complejos por ahora
    const q = query(collection(db, `stores/${user.storeId}/expenses`), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const cajaOpenedDate = cajaOpenedAt ? new Date(cajaOpenedAt).getTime() : null;

      const data = snap.docs.map(d => {
        const raw = d.data();
        const dateObj = raw.date?.toDate ? raw.date.toDate() : new Date(raw.date);
        
        let _isInCajaSession = false;
        if (cajaOpenedDate && !isNaN(dateObj.getTime())) {
           _isInCajaSession = dateObj.getTime() >= cajaOpenedDate;
        }

        return { id: d.id, ...raw, _isInCajaSession };
      });
      // Filtrar gastos de hoy que deben descontarse de caja
      setExpenses(data.filter((e: any) => e._isInCajaSession && e.subtractFromCaja));
    });
    return () => unsub();
  }, [user, cajaOpenedAt]);

  useEffect(() => {
    if (!user?.storeId) return;
    const q = query(collection(db, `stores/${user.storeId}/directSales`), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const cajaOpenedDate = cajaOpenedAt ? new Date(cajaOpenedAt).getTime() : null;

      const data = snap.docs.map(d => {
        const raw = d.data();
        const dateObj = new Date(raw.date);
        
        let _isInCajaSession = false;
        if (cajaOpenedDate && !isNaN(dateObj.getTime())) {
           _isInCajaSession = dateObj.getTime() >= cajaOpenedDate;
        }

        return { id: d.id, ...raw, _isInCajaSession };
      });
      setDirectSales(data.filter((s: any) => s._isInCajaSession));
    });
    return () => unsub();
  }, [user, cajaOpenedAt]);

  useEffect(() => {
    if (showHistoryModal && user?.storeId) {
      setLoadingHistory(true);
      const q = query(collection(db, `stores/${user.storeId}/cajas_historial`), orderBy("closedAt", "desc"));
      const unsub = onSnapshot(q, (snap) => {
        setCajaHistoryList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoadingHistory(false);
      });
      return () => unsub();
    }
  }, [showHistoryModal, user]);

  // Solo sumar a la caja los pedidos que fueron pagados hoy (en esta sesión) y NO fueron cancelados.
  const sessionOrders = orders.filter(o => o._isInCajaSession && o.status !== 'CANCELADO');
  const sessionSales = directSales;

  const stats = sessionOrders.reduce((acc, order) => {
    const total = Number(order.total) || 0;
    if(order.payMethod === "EFECTIVO") acc.efectivo += total;
    if(order.payMethod === "YAPE") acc.yape += total;
    acc.cobrados += 1;
    return acc;
  }, { efectivo: 0, yape: 0, cobrados: 0 });

  // Sumar ventas del Punto de Venta (Insumos)
  sessionSales.forEach(sale => {
    const total = Number(sale.total) || 0;
    if(sale.payMethod === "EFECTIVO") stats.efectivo += total;
    if(sale.payMethod === "YAPE") stats.yape += total;
    stats.cobrados += 1;
  });

  const totalIngresos = stats.efectivo + stats.yape;
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
        
        await addDoc(collection(db, `stores/${user.storeId}/cajas_historial`), {
          openedAt: cajaOpenedAt,
          closedAt: new Date().toISOString(),
          closedBy: user?.email || "unknown",
          initialCash: globalInitialCash || 0,
          totalEfectivo: stats.efectivo,
          totalYape: stats.yape,
          totalGastosCaja: totalGastosCaja,
          ordersCount: stats.cobrados,
          saldoFinalEfectivoEsperado: saldoFinalEfectivo
        });

        await setDoc(doc(db, `stores/${user.storeId}/caja/sesion`), {
          isOpen: false,
          initialCash: 0,
          closedAt: new Date().toISOString(),
          closedBy: user?.email || "unknown"
        });
        setInitialCashInput("");
        toast.success("Caja cerrada exitosamente. Reporte guardado en el historial.");
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
        
        <div className="flex gap-3">
          <button onClick={() => setShowHistoryModal(true)} className="px-4 py-2 rounded-xl flex items-center gap-2 font-bold bg-black/5 hover:bg-black/10 text-foreground transition-colors">
            <History size={18} />
            <span className="hidden sm:inline">Historial</span>
          </button>
          <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold ${isCajaOpen ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
             {isCajaOpen ? <LockOpen size={18} /> : <LockKeyhole size={18} />}
             {isCajaOpen ? 'CAJA ABIERTA' : 'CAJA CERRADA'}
          </div>
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
                <div className="glass-card p-5 bg-primary/5 border-primary/20">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary"><Wallet size={16}/></div>
                     <span className="text-foreground/90 font-black tracking-tight text-sm">Total Ingresos</span>
                   </div>
                   <p className="text-2xl font-black text-primary font-mono">S/ {totalIngresos.toFixed(2)}</p>
                </div>
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
                        {sessionOrders.map((o) => (
                          <tr key={o.id} className="border-b border-black/5 hover:bg-black/[0.02]">
                            <td className="py-3 px-4 font-mono">
                              <span className="text-primary font-bold">{o.ticketNumber || o.id.slice(0,6).toUpperCase()}</span>
                              <span className="block text-foreground/60 text-[10px] font-sans normal-case font-medium">{o.customerName}</span>
                            </td>
                            <td className="py-3 px-4">
                              {o.payMethod === "YAPE" && <span className="px-2 py-0.5 rounded-full bg-[#742284]/10 text-[#742284] text-[9px] font-black uppercase">YAPE/PLIN</span>}
                              {o.payMethod === "EFECTIVO" && <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[9px] font-black uppercase">EFECTIVO</span>}
                            </td>
                            <td className="py-3 px-4 text-right text-success font-black font-mono">+ S/ {Number(o.total).toFixed(2)}</td>
                          </tr>
                        ))}

                        {sessionSales.map((s) => (
                          <tr key={s.id} className="border-b border-black/5 hover:bg-black/[0.02]">
                            <td className="py-3 px-4 font-mono">
                              <span className="text-primary font-bold">POS VENTA</span>
                              <span className="block text-foreground/60 text-[10px] font-sans normal-case font-medium">
                                {s.items?.length || 0} producto(s)
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {s.payMethod === "YAPE" && <span className="px-2 py-0.5 rounded-full bg-[#742284]/10 text-[#742284] text-[9px] font-black uppercase">YAPE/PLIN</span>}
                              {s.payMethod === "EFECTIVO" && <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[9px] font-black uppercase">EFECTIVO</span>}
                            </td>
                            <td className="py-3 px-4 text-right text-success font-black font-mono">+ S/ {Number(s.total).toFixed(2)}</td>
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

                        {(sessionOrders.length === 0 && expenses.length === 0 && sessionSales.length === 0) && (
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

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
             <div className="p-6 md:px-8 border-b border-black/5 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10">
               <div>
                  <h2 className="text-2xl font-black text-foreground flex items-center gap-3 tracking-tight">
                    <div className="bg-primary/20 w-10 h-10 rounded-xl flex justify-center items-center text-primary">
                      <History size={20}/>
                    </div> 
                    Historial de Turnos
                  </h2>
                  <p className="text-sm text-foreground/60 font-medium mt-1">Resumen financiero y auditoría de todas las cajas cerradas previamente.</p>
               </div>
               <button onClick={() => setShowHistoryModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 text-foreground/50 hover:text-foreground transition-colors self-start">
                 <X size={20} />
               </button>
             </div>
             
             <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-black/[0.02] rounded-b-3xl">
               {loadingHistory ? (
                 <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
               ) : cajaHistoryList.length === 0 ? (
                 <div className="text-center p-12 text-foreground/50 font-medium">No hay historial de turnos registrados aún.</div>
               ) : (
                 <div className="flex flex-col gap-6">
                   {cajaHistoryList.map(h => (
                      <div key={h.id} className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100px] -z-0 pointer-events-none" />
                         <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-black/5 pb-4 mb-4 relative z-10 gap-4">
                            <div>
                               <p className="text-sm font-bold text-foreground">Aperturado / Cerrado por: <span className="text-primary font-black uppercase">{h.closedBy}</span></p>
                               <div className="text-xs text-foreground/60 mt-1.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 font-medium">
                                 <span><strong className="text-foreground/80">Inició:</strong> {h.openedAt ? new Date(h.openedAt).toLocaleString('es-PE', {dateStyle: 'medium', timeStyle: 'short'}) : 'Desconocido'}</span>
                                 <span className="hidden sm:inline">•</span>
                                 <span><strong className="text-foreground/80">Cerró:</strong> {new Date(h.closedAt).toLocaleString('es-PE', {dateStyle: 'medium', timeStyle: 'short'})}</span>
                               </div>
                            </div>
                            <div className="text-left md:text-right w-full md:w-auto bg-success/5 p-3 rounded-xl border border-success/10">
                               <p className="text-[10px] text-success uppercase tracking-wider font-extrabold mb-1">Efectivo Físico Esperado</p>
                               <p className="text-3xl font-black text-success font-mono">S/ {Number(h.saldoFinalEfectivoEsperado || 0).toFixed(2)}</p>
                            </div>
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
                            <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                               <p className="text-xs text-primary/80 font-bold mb-1 flex items-center gap-1"><Wallet size={12}/> Total Ingresos</p>
                               <p className="text-lg font-bold text-primary font-mono">+ S/ {Number((h.totalEfectivo || 0) + (h.totalYape || 0)).toFixed(2)}</p>
                            </div>
                            <div className="bg-black/5 rounded-xl p-3">
                               <p className="text-xs text-foreground/60 font-bold mb-1">Base Inicial</p>
                               <p className="text-lg font-bold font-mono text-foreground">S/ {Number(h.initialCash || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-success/5 rounded-xl p-3">
                               <p className="text-xs text-success/80 font-bold mb-1 flex items-center gap-1"><DollarSign size={12}/> Efectivo C.</p>
                               <p className="text-lg font-bold text-success font-mono">+ S/ {Number(h.totalEfectivo || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-[#742284]/5 rounded-xl p-3">
                               <p className="text-xs text-[#742284]/80 font-bold mb-1 flex items-center gap-1"><DollarSign size={12}/> Yape/Plin</p>
                               <p className="text-lg font-bold text-[#742284] font-mono">+ S/ {Number(h.totalYape || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-error/5 rounded-xl p-3">
                               <p className="text-xs text-error/80 font-bold mb-1 flex items-center gap-1"><ArrowRightLeft size={12}/> Gastos</p>
                               <p className="text-lg font-bold text-error font-mono">- S/ {Number(h.totalGastosCaja || 0).toFixed(2)}</p>
                            </div>
                         </div>
                      </div>
                   ))}
                 </div>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
