"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, MoreVertical, MapPin, CheckCircle, PackageSearch, Loader2, Info, History, X, Check, Trash2, Inbox, Activity, CheckCircle2, ShoppingBag, ArrowRight, Banknote, Smartphone, Lock } from "lucide-react";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStore } from "@/store/useStore";
import { toast } from "react-hot-toast";

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
  paymentMethod?: string;
};

export default function OrdenesPage() {
  const { user, isCajaOpen } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [previewVoucherOrder, setPreviewVoucherOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [activeTab, setActiveTab] = useState<OrderStatus>('RECIBIDO');

  // Cargar orders en tiempo real desde Firebase
  useEffect(() => {
    if (!user?.storeId) return;
    const q = query(collection(db, `stores/${user.storeId}/orders`), orderBy("date", "asc"));
    const unsub = onSnapshot(q, (snap) => {
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
    if (!isCajaOpen) {
      toast.error("ERROR: No puedes recibir pagos con la CAJA CERRADA. ¡Abre la caja primero!");
      return;
    }
    
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
      toast.success(`Pago con ${method} registrado correctamente`);
    } catch(err) {
      console.error("Error confirming payment: ", err);
      toast.error("Error al registrar pago");
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

  const renderRow = (order: Order) => {
    return (
      <div key={order.id} className="hover:bg-white text-foreground p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors group w-full">
        {/* BLOQUE 1: ID y Fecha */}
        <div className="flex flex-col min-w-[120px] shrink-0">
          <Link href={`/admin/pedidos/ticket/${order.id}`} className="text-primary font-black font-mono bg-primary/10 px-2 py-0.5 rounded text-sm hover:underline self-start mb-1">
            {order.ticketNumber || order.id.slice(0, 6).toUpperCase()}
          </Link>
          <span className="text-foreground/50 text-[10px] font-bold">{order.date}</span>
        </div>

        {/* BLOQUE 2: Cliente y Servicio */}
        <div className="flex-1 flex flex-col min-w-0 w-full">
          <h4 className="font-black text-base line-clamp-1 leading-tight mb-1">{order.customerName}</h4>
          <div className="flex items-center gap-3 text-xs font-medium">
             <span className="flex items-center gap-1 text-foreground/60 font-bold"><PackageSearch size={14}/> {order.items?.length || 0} serv.</span>
             <span className="font-mono bg-primary/5 px-2 py-0.5 rounded text-primary font-black border border-primary/10">S/ {Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {/* BLOQUE 3: Estado Financiero */}
        <div className="w-full sm:w-[220px] flex flex-col justify-center gap-2 shrink-0">
          {order.paymentStatus === 'PAID' && (
            <div className={`border rounded-md flex items-center justify-center w-full h-[32px] ${(order.payMethod || order.paymentMethod)?.toUpperCase() === 'YAPE' ? 'bg-[#742284]/10 text-[#742284] border-[#742284]/20' : 'bg-success/10 text-success border-success/20'}`}>
              <span className="text-[10px] font-black uppercase flex items-center gap-1"><CheckCircle2 size={13}/> Pagado ({(order.payMethod || order.paymentMethod || 'EFECTIVO')})</span>
            </div>
          )}
          {order.paymentStatus === 'PENDING_VERIFICATION' && (
            <button onClick={() => setPreviewVoucherOrder(order)} className="w-full bg-warning text-white hover:bg-warning/80 rounded-md text-[10px] font-black transition-colors shadow-sm h-[32px] shadow-warning/20 uppercase flex items-center justify-center gap-1 animate-pulse">
              <Info size={14} /> Validar Yape
            </button>
          )}
          {order.paymentStatus === 'UNPAID' && (
             <div className="flex gap-2 w-full h-[32px]">
               <button 
                  onClick={() => confirmPayment(order.id, 'EFECTIVO', order.status === 'LISTO')} 
                  disabled={!isCajaOpen}
                  className={`flex-1 text-[10px] rounded-md font-black transition-colors border flex items-center justify-center gap-1 ${isCajaOpen ? 'bg-success/10 hover:bg-success/20 text-success border-success/20' : 'bg-black/5 text-foreground/40 border-black/5 cursor-not-allowed'}`}
                >
                  {isCajaOpen ? <><Banknote size={13}/> Efectivo</> : <><Lock size={12}/> Cerrada</>}
                </button>
                <button 
                  onClick={() => confirmPayment(order.id, 'YAPE', order.status === 'LISTO')} 
                  disabled={!isCajaOpen}
                  className={`flex-1 text-[10px] rounded-md font-black border flex items-center justify-center gap-1 transition-colors ${isCajaOpen ? 'bg-[#742284]/10 hover:bg-[#742284]/20 text-[#742284] border-[#742284]/20' : 'bg-black/5 text-error/40 border-black/5 cursor-not-allowed'}`}
                >
                  {isCajaOpen ? <><Smartphone size={13}/> Yape</> : <><Lock size={12}/> Cerrada</>}
                </button>
             </div>
          )}
        </div>

        {/* BLOQUE 4: Acciones Operativas */}
        <div className="w-full sm:w-[150px] flex items-center gap-2 shrink-0">
          <div className="flex-1">
            {order.status === 'RECIBIDO' && (
              <button onClick={() => updateStatus(order.id, 'EN_PROCESO')} className="w-full bg-warning/20 text-warning hover:bg-warning/30 rounded-md text-xs font-black transition-all active:scale-95 border border-warning/10 h-[32px] flex items-center justify-center gap-1">
                Proceso <ArrowRight size={14}/>
              </button>
            )}
            {order.status === 'EN_PROCESO' && (
              <button onClick={() => updateStatus(order.id, 'LISTO')} className="w-full bg-info/20 text-info hover:bg-info/40 rounded-md text-xs font-black transition-all active:scale-95 border border-info/10 h-[32px] flex items-center justify-center gap-1">
                Listo <CheckCircle2 size={14}/>
              </button>
            )}
            {order.status === 'LISTO' && (
              <button onClick={() => { if(order.paymentStatus === 'PAID') updateStatus(order.id, 'ENTREGADO'); else alert('Debe cobrar el pago antes de entregar la ropa.'); }} className={`w-full rounded-md text-xs font-black transition-all active:scale-95 h-[32px] flex items-center justify-center gap-1 ${order.paymentStatus === 'PAID' ? 'bg-primary text-white hover:bg-primary-hover shadow-sm shadow-primary/20' : 'bg-black/5 text-foreground/40 cursor-not-allowed border border-black/10'}`}>
                Entregar <ShoppingBag size={14}/>
              </button>
            )}
          </div>
          {user?.role === 'ADMIN' && (
             <div className="flex h-[32px] items-center shrink-0">
               <button 
                 onClick={() => setOrderToCancel(order)}
                 className="text-foreground/30 hover:text-error hover:bg-error/10 transition-colors p-1.5 rounded-lg flex items-center justify-center"
                 title="Cancelar Orden"
               >
                 <Trash2 size={16} />
               </button>
             </div>
          )}
        </div>
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

      {/* TABS SELECTOR */}
      <div className="flex flex-col sm:flex-row p-1 bg-white/40 rounded-xl border border-black/5 overflow-x-auto mb-4 shrink-0 shadow-sm gap-1">
        <button 
          onClick={() => setActiveTab('RECIBIDO')}
          className={`flex-1 py-3 px-4 rounded-lg font-black text-sm transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'RECIBIDO' ? 'bg-white text-foreground shadow-sm border border-black/5' : 'text-foreground/50 hover:text-foreground hover:bg-white/40 border border-transparent'}`}
        >
          <Inbox size={16}/> COLA DE ESPERA <span className="bg-black/10 px-2 py-0.5 rounded-md text-[10px]">{filteredOrders.filter(o => o.status === 'RECIBIDO').length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('EN_PROCESO')}
          className={`flex-1 py-3 px-4 rounded-lg font-black text-sm transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'EN_PROCESO' ? 'bg-warning/20 text-warning shadow-sm border border-warning/20' : 'text-foreground/50 hover:text-foreground hover:bg-white/40 border border-transparent'}`}
        >
          <Activity size={16}/> EN LAVADO/SECADO <span className="bg-warning/40 px-2 py-0.5 rounded-md text-[10px] text-warning-strong">{filteredOrders.filter(o => o.status === 'EN_PROCESO').length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('LISTO')}
          className={`flex-1 py-3 px-4 rounded-lg font-black text-sm transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'LISTO' ? 'bg-success/20 text-success shadow-sm border border-success/20' : 'text-foreground/50 hover:text-foreground hover:bg-white/40 border border-transparent'}`}
        >
          <CheckCircle2 size={16}/> LISTOS PARA ENTREGA <span className="bg-success/40 px-2 py-0.5 rounded-md text-[10px] text-success-strong">{filteredOrders.filter(o => o.status === 'LISTO').length}</span>
        </button>
      </div>

      {/* LISTADO DE PEDIDOS (Wide Rows in Single Container) */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10">
        {loading ? (
          <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-primary/50" size={32} /></div>
        ) : (
           filteredOrders.filter(o => o.status === activeTab).length === 0 ? (
            <div className="text-center py-20 text-foreground/40 border-2 border-dashed border-black/10 rounded-2xl bg-white/20">
                <PackageSearch size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-black">Sin tickets en esta etapa</p>
                <p className="text-sm font-medium mt-1">Limpio y ordenado.</p>
            </div>
           ) : (
             <div className="bg-white/60 rounded-2xl border border-black/5 divide-y divide-black/10 shadow-sm overflow-hidden">
               {filteredOrders.filter(o => o.status === activeTab).map(order => renderRow(order))}
             </div>
           )
        )}
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
                       if (!isCajaOpen) {
                         toast.error("ERROR: No puedes verificar pagos con la CAJA CERRADA. ¡Abre la caja primero!");
                         return;
                       }
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
            <p className="text-foreground/70 text-sm mb-4 font-medium">
              Estás por cancelar el ticket <span className="text-primary font-mono font-black">#{orderToCancel.ticketNumber}</span>. 
              Indica el motivo para el reporte de auditoría.
            </p>
            {orderToCancel.paymentStatus === 'PAID' && (
              <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl">
                 <p className="text-error text-[11px] font-black uppercase text-center leading-relaxed">
                   ⚠️ ¡ATENCIÓN! Este ticket ya fue cobrado (Pagado).
                   <br/>
                   Si el cliente pagó en EFECTIVO y vas a devolver el dinero, recuerda registrar manualmente un Gasto de Devolución en la Caja para que cuadre el dinero físico.
                 </p>
              </div>
            )}

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
