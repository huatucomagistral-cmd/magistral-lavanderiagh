"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, MoreVertical, MapPin, CheckCircle, PackageSearch, Loader2, Info, History, X, Check, Trash2 } from "lucide-react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStore } from "@/store/useStore";

type OrderStatus = 'RECIBIDO' | 'EN_PROCESO' | 'LISTO' | 'ENTREGADO' | 'CANCELADO';

type Order = {
  id: string;
  customerName: string;
  status: OrderStatus;
  total: number;
  items: any[];
  date: string;
  paymentStatus?: string;
  voucherUrl?: string;
  ticketNumber?: string;
  payMethod?: string;
};

export default function OrdenesPage() {
  const { user } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [previewVoucherOrder, setPreviewVoucherOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Cargar orders en tiempo real desde Firebase
  useEffect(() => {
    if (!user?.storeId) return;
    const unsub = onSnapshot(collection(db, `stores/${user.storeId}/orders`), (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        date: new Date(d.data().date).toLocaleDateString()
      })) as Order[];
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateStatus = async (id: string, newStatus: OrderStatus) => {
    try {
      if (!user?.storeId) throw new Error("Store ID missing");
      const orderRef = doc(db, `stores/${user.storeId}/orders`, id);
      await updateDoc(orderRef, { status: newStatus });
    } catch(err) {
      console.error("Error updating status: ", err);
    }
  };

  const confirmPayment = async (id: string, method: string, andDeliver: boolean = false) => {
    try {
      if (!user?.storeId) throw new Error("Store ID missing");
      const orderRef = doc(db, `stores/${user.storeId}/orders`, id);
      const updates: any = { 
        paymentStatus: 'PAID',
        payMethod: method,
        paymentDate: new Date().toISOString()
      };
      if (andDeliver) updates.status = 'ENTREGADO';
      await updateDoc(orderRef, updates);
    } catch(err) {
      console.error("Error confirming payment: ", err);
    }
  };

  const cancelOrder = async (id: string, reason: string) => {
    try {
      if (!user?.storeId) throw new Error("Store ID missing");
      const orderRef = doc(db, `stores/${user.storeId}/orders`, id);
      await updateDoc(orderRef, { 
        status: 'CANCELADO',
        cancelReason: reason,
        cancelledAt: new Date().toISOString()
      });
      setOrderToCancel(null);
      setCancelReason("");
    } catch(err) {
      console.error("Error cancelling order: ", err);
    }
  };

  const filteredOrders = orders.filter(o => 
    (o.status !== 'ENTREGADO' && o.status !== 'CANCELADO') && (
      (o.ticketNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      (o.customerName || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const deliveredToday = orders.filter(o => 
    o.status === 'ENTREGADO' && 
    o.date === new Date().toLocaleDateString()
  );

  const totalDelivered = deliveredToday.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const renderColumn = (status: OrderStatus, title: string, colorClass: string) => {
    const columnOrders = filteredOrders.filter(o => o.status === status);
    
    return (
      <div className="flex flex-col h-[420px] md:h-full glass-card p-4 overflow-hidden">
        <div className={`mb-4 flex items-center justify-between pb-2 border-b-2 ${colorClass}`}>
          <h3 className="font-black text-foreground uppercase tracking-widest text-xs">{title}</h3>
          <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full font-black border border-primary/20">{columnOrders.length}</span>
        </div>
        
        {loading ? (
          <div className="flex justify-center flex-1 items-center"><Loader2 className="animate-spin text-primary/50" /></div>
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto pr-2 pb-4 scrollbar-hide">
            {columnOrders.map(order => (
              <div key={order.id} className="bg-white/90 p-4 hover:border-primary/50 transition-colors group border border-black/5 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/pedidos/ticket/${order.id}`} className="text-primary font-black font-mono bg-primary/10 px-2 py-0.5 rounded-md text-sm hover:underline">{order.ticketNumber || order.id.slice(0, 6).toUpperCase()}</Link>
                    {user?.role === 'ADMIN' && (
                      <button 
                        onClick={() => setOrderToCancel(order)}
                        className="text-foreground/20 hover:text-error transition-colors p-1 rounded-md hover:bg-error/10"
                        title="Cancelar Orden"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <span className="text-foreground/60 text-[10px] font-bold">{order.date}</span>
                </div>
                
                <h4 className="text-foreground font-black mb-1 line-clamp-1">{order.customerName}</h4>
                
                <div className="flex items-center gap-4 text-xs text-foreground/70 mb-3 font-medium">
                  <span className="flex items-center gap-1 font-bold"><PackageSearch size={14} className="text-primary" /> {order.items?.length || 0} serv.</span>
                  <span className="font-mono bg-primary/5 px-2 py-0.5 rounded text-primary font-black border border-primary/10">S/ {Number(order.total).toFixed(2)}</span>
                </div>

                {/* Bloque Superior: Avisos Activos de Deuda o Validación */}
                {order.paymentStatus === 'PENDING_VERIFICATION' && (
                  <div className="mb-3 animate-pulse">
                    <button onClick={() => setPreviewVoucherOrder(order)} className="w-full flex items-center justify-center gap-2 bg-warning/20 text-warning border border-warning/30 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-warning/30 transition-colors">
                      <Info size={12} /> Pago por Validar
                    </button>
                  </div>
                )}
                {order.paymentStatus === 'UNPAID' && (
                  <div className="mb-3 px-2 py-2 bg-error/10 text-error border border-error/20 rounded-lg flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase text-center flex items-center justify-center gap-1">
                      <Info size={12}/> Por Cobrar ❌
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => confirmPayment(order.id, 'EFECTIVO', order.status === 'LISTO')} className="flex-1 bg-white/20 hover:bg-white/40 text-[9px] py-1.5 rounded font-black transition-colors border border-error/10">💵 Efectivo</button>
                      <button onClick={() => confirmPayment(order.id, 'YAPE', order.status === 'LISTO')} className="flex-1 bg-[#742284]/20 hover:bg-[#742284]/40 text-[9px] py-1.5 rounded font-black text-[#742284] border border-[#742284]/20 transition-colors">🟣 Yape</button>
                    </div>
                  </div>
                )}

                {/* Fila Inferior (Siempre visible): Estado de Pago + Estado de Lavandería */}
                <div className="flex gap-2 mt-2 pt-3 border-t border-black/5">
                  {/* Columna Izquierda: Estado de Pago */}
                  <div className="flex-1 flex flex-col justify-center">
                     {order.paymentStatus === 'PAID' && (
                       <div className="bg-success/10 text-success border border-success/20 rounded-md flex items-center justify-center shrink-0 w-full h-[34px]">
                         <span className="text-[10px] font-black uppercase flex items-center gap-1"><CheckCircle size={10}/> Pagado</span>
                       </div>
                     )}
                     {order.paymentStatus === 'PENDING_VERIFICATION' && (
                        <button onClick={() => setPreviewVoucherOrder(order)} className="w-full bg-warning text-white hover:bg-warning/80 rounded-md text-[10px] font-black transition-colors shadow-lg shrink-0 h-[34px] shadow-warning/20 uppercase flex items-center justify-center gap-1">
                          Validar
                        </button>
                     )}
                     {order.paymentStatus === 'UNPAID' && (
                        <div className="bg-black/5 text-foreground/40 rounded-md flex items-center justify-center shrink-0 w-full h-[34px] border border-black/5">
                           <span className="text-[9px] uppercase font-black text-center leading-tight">Pendiente Pago</span>
                        </div>
                     )}
                  </div>

                  {/* Columna Derecha: Acción para avanzar Workflow */}
                  <div className="flex-1 flex gap-1 items-stretch">
                    {status === 'RECIBIDO' && (
                      <button onClick={() => updateStatus(order.id, 'EN_PROCESO')} className="flex-1 bg-warning/20 text-warning hover:bg-warning/30 rounded-md text-xs font-black transition-all active:scale-95 border border-warning/10">
                        Proceso
                      </button>
                    )}
                    {status === 'EN_PROCESO' && (
                      <button onClick={() => updateStatus(order.id, 'LISTO')} className="flex-1 bg-info/20 text-info hover:bg-info/40 rounded-md text-xs font-black transition-all active:scale-95 border border-info/10">
                        Listo
                      </button>
                    )}
                    {status === 'LISTO' && (
                      <button onClick={() => { if(order.paymentStatus === 'PAID') updateStatus(order.id, 'ENTREGADO'); else alert('Debe cobrar el pago antes de entregar la ropa.'); }} className={`flex-1 rounded-md text-xs font-black transition-all active:scale-95 ${order.paymentStatus === 'PAID' ? 'bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20' : 'bg-black/5 text-foreground/20 cursor-not-allowed border border-black/5'}`}>
                        Entregar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {columnOrders.length === 0 && (
              <div className="text-center py-10 text-foreground/60 border border-dashed border-black/10 rounded-xl bg-white/20 px-4">
                  <p className="text-sm font-bold">Sin tickets en esta etapa</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500 md:h-[calc(100vh-8rem)]">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Pedidos en Curso</h1>
          <p className="text-foreground/70 font-medium">Gestiona el flujo de lavado y el estado de los pagos.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/70" size={18} />
             <input type="text" placeholder="Buscar ticket o cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
               className="w-full bg-white/50 border border-black/10 rounded-xl pl-10 pr-4 py-3 text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm placeholder:text-foreground/40"
             />
          </div>
          
          <button 
            onClick={() => setShowHistory(true)}
            className="bg-white/40 hover:bg-white/60 text-foreground border border-black/10 rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all relative font-bold shadow-sm"
          >
            <History size={18} />
            <span className="hidden sm:inline">Historial Hoy</span>
            {deliveredToday.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white font-black">
                {deliveredToday.length}
              </span>
            )}
          </button>

          <Link href="/admin/pedidos/nuevo" className="bg-primary hover:bg-primary-hover active:scale-95 transition-all text-white font-black rounded-xl px-4 py-3 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 shrink-0">
            <Plus size={20} />
            <span className="hidden sm:inline">Nuevo Pedido</span>
          </Link>
        </div>
      </div>

      {/* Tablero Kanban */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 md:overflow-hidden md:min-h-0">
         {renderColumn('RECIBIDO', 'Cola de Espera', 'border-black/5 text-foreground/40')}
         {renderColumn('EN_PROCESO', 'En Lavado/Secado', 'border-warning/40 text-warning')}
         {renderColumn('LISTO', 'Listos para Entrega', 'border-success/40 text-success')}
      </div>

      {/* Historial Lateral (Drawer) */}
      {showHistory && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300" onClick={() => setShowHistory(false)} />
          
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-[#c7ede8] border-l border-black/10 z-[101] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 border-b border-black/10 flex items-center justify-between bg-white/40">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <History size={20} className="text-primary" /> Entregados Hoy
                </h2>
                <p className="text-foreground/70 text-xs font-bold">Cierre preliminar del turno</p>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-black/5 rounded-full transition-colors text-foreground/50 hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 bg-primary/5 border-b border-black/10 flex items-center justify-between">
              <div>
                <span className="text-xs text-foreground/60 uppercase font-black tracking-tight">Cobrado Hoy</span>
                <div className="text-3xl font-black text-primary font-mono">S/ {totalDelivered.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-foreground/60 uppercase font-black italic tracking-wide">Órdenes</span>
                <div className="text-2xl font-black text-foreground">{deliveredToday.length}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {deliveredToday.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-foreground/60 text-center px-10">
                   <PackageSearch size={48} className="mb-4 opacity-10" />
                   <p className="text-sm font-black italic">Aún no hay entregas registradas hoy.</p>
                </div>
              ) : (
                deliveredToday.map(order => (
                  <div key={order.id} className="bg-white/60 border border-black/5 p-4 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-primary font-black font-mono text-[10px] bg-primary/10 px-2 py-0.5 rounded-md self-start mb-1">{order.ticketNumber}</span>
                      <span className="text-foreground font-black text-sm line-clamp-1">{order.customerName}</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-foreground font-black text-sm font-mono">S/ {Number(order.total).toFixed(2)}</span>
                      <span className="flex items-center gap-1 text-[10px] text-success font-black mt-1 uppercase tracking-tight">
                        <Check size={12} /> {order.payMethod || 'Pagado'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-black/10 bg-white/20">
              <Link 
                href="/admin/caja" 
                className="w-full bg-primary/20 hover:bg-primary/30 text-primary font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-primary/20 shadow-sm"
              >
                Ver Caja Completa
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Voucher Validation Modal */}
      {previewVoucherOrder && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white sm:border border-black/10 sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh] relative">
            
            {/* Close Button */}
            <button 
                onClick={() => setPreviewVoucherOrder(null)} 
                className="absolute top-4 right-4 z-10 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white p-2 rounded-full transition-colors"
            >
               <X size={20} />
            </button>

            <div className="flex-1 overflow-y-auto min-h-0 bg-black relative flex items-center justify-center">
               {previewVoucherOrder.voucherUrl ? (
                   // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewVoucherOrder.voucherUrl} alt="Comprobante de Pago" className="max-w-full h-auto block" />
               ) : (
                  <div className="flex items-center justify-center h-full min-h-[200px]">
                     <p className="text-white/70 text-sm font-bold italic">No se encontró imagen del comprobante</p>
                  </div>
               )}
            </div>

            <div className="p-6 border-t border-black/10 bg-white shrink-0 shadow-2xl">
               <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-xs text-foreground/60 font-black uppercase tracking-widest mb-1">Ticket a Validar</p>
                    <p className="text-foreground font-black text-2xl font-mono">{previewVoucherOrder.ticketNumber || (previewVoucherOrder.id.slice(0,6).toUpperCase())}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-foreground/60 font-black uppercase tracking-widest mb-1">Monto del Ticket</p>
                    <p className="text-primary font-black text-3xl font-mono tracking-tighter leading-none">S/ {Number(previewVoucherOrder.total).toFixed(2)}</p>
                  </div>
               </div>

                <div className="flex gap-4">
                  <button 
                    onClick={async (e) => {
                       e.stopPropagation();
                       if (!user?.storeId) return;
                       const orderRef = doc(db, `stores/${user.storeId}/orders`, previewVoucherOrder.id);
                       await updateDoc(orderRef, { paymentStatus: 'UNPAID', voucherUrl: null });
                       setPreviewVoucherOrder(null);
                    }}
                    className="flex-1 bg-black/5 hover:bg-error/10 text-foreground/70 hover:text-error py-4 rounded-2xl font-black transition-all active:scale-95 border border-black/5 hover:border-error/20 text-xs uppercase"
                  >
                    Rechazar
                  </button>
                  <button 
                    onClick={(e) => {
                       e.stopPropagation();
                       confirmPayment(previewVoucherOrder.id, 'YAPE');
                       setPreviewVoucherOrder(null);
                    }} 
                    className="flex-[2] bg-[#742284] hover:bg-[#742284]/90 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#742284]/30 uppercase"
                  >
                    APROBAR PAGO YAPE <CheckCircle size={18} />
                  </button>
                </div>
            </div>

          </div>
        </div>
      )}
      {/* Cancellation Reason Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-black/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-8">
            <h3 className="text-2xl font-black text-foreground mb-2 tracking-tight">Cancelar Orden</h3>
            <p className="text-foreground/70 text-sm mb-6 font-medium">
              Estás por cancelar el ticket <span className="text-primary font-mono font-black">#{orderToCancel.ticketNumber}</span>. 
              Indica el motivo para el reporte de auditoría.
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej: El cliente se arrepintió, error en la digitación, etc..."
              className="w-full bg-black/5 border border-black/10 rounded-2xl p-5 text-foreground text-sm font-bold focus:ring-2 focus:ring-error transition-all h-32 mb-6 resize-none outline-none placeholder:text-foreground/20"
              autoFocus
            />

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setOrderToCancel(null);
                  setCancelReason("");
                }} 
                className="flex-1 bg-black/5 hover:bg-black/10 text-foreground/70 py-4 rounded-2xl font-black transition-all uppercase text-xs"
              >
                Volver
              </button>
              <button 
                onClick={() => cancelOrder(orderToCancel.id, cancelReason)}
                disabled={!cancelReason.trim()}
                className="flex-[2] bg-error hover:bg-error/90 text-white py-4 rounded-2xl font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-error/20 uppercase text-xs"
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
