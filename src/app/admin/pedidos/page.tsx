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

export default function PedidosPage() {
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
          <h3 className="font-bold text-white uppercase tracking-wider text-sm">{title}</h3>
          <span className="bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded-full font-bold">{columnOrders.length}</span>
        </div>
        
        {loading ? (
          <div className="flex justify-center flex-1 items-center"><Loader2 className="animate-spin text-white/50" /></div>
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto pr-2 pb-4 scrollbar-hide">
            {columnOrders.map(order => (
              <div key={order.id} className="bg-surface/50 p-4 hover:border-primary/50 transition-colors group border border-white/5 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/pedidos/ticket/${order.id}`} className="text-primary font-bold font-mono bg-primary/10 px-2 py-0.5 rounded-md text-sm hover:underline">{order.ticketNumber || order.id.slice(0, 6).toUpperCase()}</Link>
                    {user?.role === 'ADMIN' && (
                      <button 
                        onClick={() => setOrderToCancel(order)}
                        className="text-white/20 hover:text-error transition-colors p-1 rounded-md hover:bg-error/10"
                        title="Cancelar Pedido"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <span className="text-white/40 text-xs">{order.date}</span>
                </div>
                
                <h4 className="text-white font-medium mb-1 line-clamp-1">{order.customerName}</h4>
                
                <div className="flex items-center gap-4 text-xs text-white/50 mb-3">
                  <span className="flex items-center gap-1"><PackageSearch size={14}/> {order.items?.length || 0} serv.</span>
                  <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-white/70">S/ {Number(order.total).toFixed(2)}</span>
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
                      <button onClick={() => confirmPayment(order.id, 'EFECTIVO', order.status === 'LISTO')} className="flex-1 bg-white/10 hover:bg-white/20 text-[9px] py-1.5 rounded font-bold transition-colors">💵 Efectivo</button>
                      <button onClick={() => confirmPayment(order.id, 'YAPE', order.status === 'LISTO')} className="flex-1 bg-[#742284]/20 hover:bg-[#742284]/40 text-[9px] py-1.5 rounded font-bold text-[#742284] border border-[#742284]/20 transition-colors">🟣 Yape</button>
                    </div>
                  </div>
                )}

                {/* Fila Inferior (Siempre visible): Estado de Pago + Estado de Lavandería */}
                <div className="flex gap-2 mt-2 pt-3 border-t border-white/5">
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
                        <div className="bg-white/5 text-white/30 rounded-md flex items-center justify-center shrink-0 w-full h-[34px]">
                           <span className="text-[9px] uppercase font-bold text-center leading-tight">Debe<br/>Pagar</span>
                        </div>
                     )}
                  </div>

                  {/* Columna Derecha: Acción para avanzar Workflow */}
                  <div className="flex-1 flex gap-1 items-stretch">
                    {status === 'RECIBIDO' && (
                      <button onClick={() => updateStatus(order.id, 'EN_PROCESO')} className="flex-1 bg-warning/20 text-warning hover:bg-warning/30 rounded-md text-xs font-bold transition-colors">
                        A Proceso
                      </button>
                    )}
                    {status === 'EN_PROCESO' && (
                      <button onClick={() => updateStatus(order.id, 'LISTO')} className="flex-1 bg-info/20 text-info hover:bg-info/30 rounded-md text-xs font-bold transition-colors">
                        Listo
                      </button>
                    )}
                    {status === 'LISTO' && (
                      <button onClick={() => { if(order.paymentStatus === 'PAID') updateStatus(order.id, 'ENTREGADO'); else alert('Debe cobrar el pago antes de entregar la ropa.'); }} className={`flex-1 rounded-md text-xs font-bold transition-colors ${order.paymentStatus === 'PAID' ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-white/5 text-white/10 cursor-not-allowed'}`}>
                        Entregar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {columnOrders.length === 0 && (
              <div className="text-center py-8 text-white/30 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                  <p className="text-sm">Sin tickets</p>
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
          <h1 className="text-3xl font-bold text-white mb-2">Pedidos</h1>
          <p className="text-white/60">Gestiona el flujo de lavado e informa a tus clientes.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
             <input type="text" placeholder="Buscar ticket o cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
               className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
             />
          </div>
          
          <button 
            onClick={() => setShowHistory(true)}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2 flex items-center justify-center gap-2 transition-all relative"
          >
            <History size={18} />
            <span className="hidden sm:inline">Entregados</span>
            {deliveredToday.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface font-bold">
                {deliveredToday.length}
              </span>
            )}
          </button>

          <Link href="/admin/pedidos/nuevo" className="bg-primary hover:bg-primary-hover active:scale-95 transition-all text-white font-bold rounded-xl px-4 py-2 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 shrink-0">
            <Plus size={20} />
            <span className="hidden sm:inline">Nuevo Ticket</span>
          </Link>
        </div>
      </div>

      {/* Tablero Kanban */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 md:overflow-hidden md:min-h-0">
         {renderColumn('RECIBIDO', 'Recibidos (Cola)', 'border-white/20 text-white/80')}
         {renderColumn('EN_PROCESO', 'En Proceso (Lavando)', 'border-warning/50 text-warning')}
         {renderColumn('LISTO', 'Listos (Por entregar)', 'border-success/50 text-success')}
      </div>

      {/* Historial Lateral (Drawer) */}
      {showHistory && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300" onClick={() => setShowHistory(false)} />
          
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-[#09090b] border-l border-white/10 z-[101] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-surface/30">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <History size={20} className="text-primary" /> Entregados Hoy
                </h2>
                <p className="text-white/40 text-xs">Cierre preliminar del día</p>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 bg-primary/5 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs text-white/40 uppercase font-black">Cobrado del día</span>
                <div className="text-3xl font-black text-primary">S/ {totalDelivered.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-white/40 uppercase font-black italic">Pedidos</span>
                <div className="text-2xl font-black text-white">{deliveredToday.length}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {deliveredToday.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/20 text-center px-10">
                  <PackageSearch size={48} className="mb-4 opacity-5" />
                  <p className="text-sm font-medium">Aún no se han entregado pedidos hoy.</p>
                </div>
              ) : (
                deliveredToday.map(order => (
                  <div key={order.id} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all">
                    <div className="flex flex-col">
                      <span className="text-primary font-bold font-mono text-[10px] bg-primary/10 px-2 py-0.5 rounded-md self-start mb-1">{order.ticketNumber}</span>
                      <span className="text-white font-medium text-sm line-clamp-1">{order.customerName}</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-white font-bold text-sm">S/ {Number(order.total).toFixed(2)}</span>
                      <span className="flex items-center gap-1 text-[10px] text-success font-bold mt-1">
                        <Check size={12} /> {order.payMethod || 'Pagado'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-white/10 bg-surface/30">
              <Link 
                href="/admin/caja" 
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10"
              >
                Ir a Caja Completa
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Voucher Validation Modal */}
      {previewVoucherOrder && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] sm:border border-white/10 sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh] relative">
            
            {/* Close Button */}
            <button 
                onClick={() => setPreviewVoucherOrder(null)} 
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/80 backdrop-blur-md text-white p-2 rounded-full transition-colors"
            >
               <X size={20} />
            </button>

            <div className="flex-1 overflow-y-auto min-h-0 bg-black relative">
               {previewVoucherOrder.voucherUrl ? (
                   // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewVoucherOrder.voucherUrl} alt="Comprobante de Pago" className="w-full h-auto block" />
               ) : (
                  <div className="flex items-center justify-center h-full min-h-[200px]">
                     <p className="text-white/50 text-sm">No hay imagen adjunta</p>
                  </div>
               )}
            </div>

            <div className="p-5 border-t border-white/10 bg-[#222] shrink-0">
               <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-sm text-white/50 mb-1">Ticket a Validar</p>
                    <p className="text-white font-bold text-xl">{previewVoucherOrder.ticketNumber || (previewVoucherOrder.id.slice(0,6).toUpperCase())}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/50 mb-1">Monto Cobrado</p>
                    <p className="text-[#00E5C0] font-bold text-3xl font-mono tracking-tighter leading-none">S/ {Number(previewVoucherOrder.total).toFixed(2)}</p>
                  </div>
               </div>

               <div className="flex gap-3">
                 <button 
                   onClick={async (e) => {
                      e.stopPropagation();
                      if (!user?.storeId) return;
                      const orderRef = doc(db, `stores/${user.storeId}/orders`, previewVoucherOrder.id);
                      await updateDoc(orderRef, { paymentStatus: 'UNPAID', voucherUrl: null });
                      setPreviewVoucherOrder(null);
                   }}
                   className="flex-1 bg-white/5 hover:bg-error/20 text-white hover:text-error py-4 rounded-xl font-bold transition-all active:scale-95 border border-white/5 hover:border-error/30 text-sm"
                 >
                   Rechazar
                 </button>
                 <button 
                   onClick={(e) => {
                      e.stopPropagation();
                      confirmPayment(previewVoucherOrder.id, 'YAPE');
                      setPreviewVoucherOrder(null);
                   }} 
                   className="flex-[2] bg-[#00E5C0] hover:bg-[#00E5C0]/80 text-[#004d40] py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(0,229,192,0.3)]"
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
          <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6">
            <h3 className="text-xl font-bold text-white mb-2">Cancelar Pedido</h3>
            <p className="text-white/50 text-sm mb-6">
              Estás por cancelar el ticket <span className="text-primary font-mono font-bold">#{orderToCancel.ticketNumber}</span>. 
              Por favor, indica el motivo de la cancelación.
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej: El cliente se arrepintió, error en el pedido..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-primary/50 outline-none transition-all h-32 mb-6 resize-none"
              autoFocus
            />

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setOrderToCancel(null);
                  setCancelReason("");
                }} 
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all"
              >
                Cerrar
              </button>
              <button 
                onClick={() => cancelOrder(orderToCancel.id, cancelReason)}
                disabled={!cancelReason.trim()}
                className="flex-[2] bg-error/20 hover:bg-error/30 text-error py-3 rounded-xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
