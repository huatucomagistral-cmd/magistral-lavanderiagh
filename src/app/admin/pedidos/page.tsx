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
  const [previewVoucherOrder, setPreviewVoucherOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [activeTab, setActiveTab] = useState<OrderStatus>('EN_PROCESO');

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
      const updateData: any = { status: newStatus };
      if (newStatus === 'ENTREGADO') {
        updateData.deliveredAt = new Date().toISOString();
      }
      await updateDoc(orderRef, updateData);
    } catch (err) {
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
      if (andDeliver) {
        updates.status = 'ENTREGADO';
        updates.deliveredAt = new Date().toISOString();
      }
      await updateDoc(orderRef, updates);
      toast.success(`Pago con ${method} registrado correctamente`);
    } catch (err) {
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
    } catch (err) {
      console.error("Error cancelling order: ", err);
    }
  };

  const filteredOrders = orders.filter(o =>
    (o.status !== 'ENTREGADO' && o.status !== 'CANCELADO') && (
      (o.ticketNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerName || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const renderRow = (order: Order) => {
    // Componentes parciales para reutilizar en Móvil y Escritorio sin duplicar lógica
    const renderPaymentStatus = (isMobile: boolean = false) => {
      const px = isMobile ? "px-1.5 py-0.5" : "px-2 py-1";
      return (
        <>
          {order.paymentStatus === 'PAID' && (
            (() => {
              const method = (order.payMethod || order.paymentMethod || 'EFECTIVO').toUpperCase();
              const isYape = method === 'YAPE';
              const colorClass = isYape ? 'border-[#742284]/20 bg-[#742284]/5 text-[#742284]' : 'border-success/20 bg-success/5 text-success';
              const dotColor = isYape ? 'bg-[#742284] shadow-[0_0_4px_rgba(116,34,132,0.5)]' : 'bg-success shadow-[0_0_4px_rgba(16,185,129,0.5)]';
              const label = isYape ? 'PAGADO YAPE' : 'PAGADO EFEC.';
              return (
                <div className={`flex items-center gap-1.5 border rounded h-fit w-fit shrink-0 ${px} ${colorClass}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
                  <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                    {label}
                  </span>
                </div>
              );
            })()
          )}
          {order.paymentStatus === 'PENDING_VERIFICATION' && (
            <button onClick={() => setPreviewVoucherOrder(order)} className={`flex items-center gap-1.5 bg-warning/10 text-warning hover:bg-warning/20 border border-warning/20 rounded transition-colors w-fit shrink-0 ${px}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Validar{isMobile ? '' : ' Yape'}</span>
            </button>
          )}
          {order.paymentStatus === 'UNPAID' && (
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => confirmPayment(order.id, 'EFECTIVO', order.status === 'LISTO')}
                disabled={!isCajaOpen}
                className={`text-[10px] rounded font-black transition-colors border flex items-center gap-1 shrink-0 ${px} ${isCajaOpen ? 'bg-success/10 hover:bg-success/20 text-success border-success/20' : 'bg-black/5 text-foreground/30 border-black/5 cursor-not-allowed'}`}
              >
                {isCajaOpen ? <><Banknote size={10} /> {isMobile ? 'EFEC' : 'Efectivo'}</> : <><Lock size={10} /> {isMobile ? '' : 'Caja Cerr.'}</>}
              </button>
              <button
                onClick={() => confirmPayment(order.id, 'YAPE', order.status === 'LISTO')}
                disabled={!isCajaOpen}
                className={`text-[10px] rounded font-black border flex items-center gap-1 transition-colors shrink-0 ${px} ${isCajaOpen ? 'bg-[#742284]/10 hover:bg-[#742284]/20 text-[#742284] border-[#742284]/20' : 'bg-black/5 text-error/30 border-black/5 cursor-not-allowed'}`}
              >
                {isCajaOpen ? <><Smartphone size={10} /> Yape</> : <><Lock size={10} /> {isMobile ? '' : 'Caja Cerr.'}</>}
              </button>
            </div>
          )}
        </>
      );
    };

    const renderActions = (isMobile: boolean = false) => {
      const btnClass = "rounded-lg px-3 py-1.5 text-xs font-black transition-all flex items-center justify-center gap-1.5 " + (isMobile ? "flex-1" : "flex-none");
      return (
        <>
          {(order.status === 'RECIBIDO' || order.status === 'EN_PROCESO') && (
            <button onClick={() => updateStatus(order.id, 'LISTO')} className={`${btnClass} bg-info/10 text-info hover:bg-primary hover:text-white border border-info/20`}>
              Listo <CheckCircle2 size={14} />
            </button>
          )}
          {order.status === 'LISTO' && (
            <button onClick={() => { if (order.paymentStatus === 'PAID') updateStatus(order.id, 'ENTREGADO'); else alert('Debe cobrar el pago antes de entregar la ropa.'); }} className={`${btnClass} ${order.paymentStatus === 'PAID' ? 'bg-primary text-white hover:bg-primary-hover shadow-sm' : 'bg-black/5 text-foreground/40 cursor-not-allowed'}`}>
              Entregar <ShoppingBag size={14} />
            </button>
          )}
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setOrderToCancel(order)}
              className="text-foreground/30 hover:text-error hover:bg-error/10 transition-colors p-1.5 rounded flex items-center justify-center shrink-0"
              title="Cancelar Orden"
            >
              <Trash2 size={16} />
            </button>
          )}
        </>
      );
    };

    return (
      <div key={order.id} className="relative hover:bg-white text-foreground p-3 sm:px-5 sm:py-3 transition-colors group w-full border-b border-black/5 last:border-0">

        {/* === SOLUCIÓN MÓVIL (COMPACTA) === */}
        <div className="flex flex-col sm:hidden gap-1.5">
          {/* Fila 1: Ticket + Fecha -> Precio */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link href={`/admin/pedidos/ticket/${order.id}`} className="font-black font-mono text-foreground hover:text-primary transition-colors text-sm" title="Abrir Ticket">
                #{order.ticketNumber || order.id.slice(0, 6).toUpperCase()}
              </Link>
              <span className="text-foreground/40 text-[10px] font-bold">{order.date}</span>
            </div>
            <span className="font-black text-primary text-sm shrink-0 mt-0.5">S/ {Number(order.total).toFixed(2)}</span>
          </div>

          {/* Fila 2: Nombre <- -> Estado Financiero */}
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm line-clamp-1 leading-tight text-foreground/90 capitalize w-full min-w-0" style={{ textTransform: 'capitalize' }}>
              {order.customerName.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </h4>
            <div className="flex items-center justify-end gap-1.5 shrink-0">
              {renderPaymentStatus(true)}
            </div>
          </div>

          {/* Fila 3: Acciones Operativas */}
          <div className="flex items-center justify-end gap-2 shrink-0 border-t border-black/5 pt-2 mt-1">
            {renderActions(true)}
          </div>
        </div>

        {/* === SOLUCIÓN ESCRITORIO (GRID) === */}
        <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_minmax(180px,auto)_auto] sm:items-center gap-4">
          <div className="flex flex-col min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-0.5">
              <Link href={`/admin/pedidos/ticket/${order.id}`} className="font-black font-mono text-foreground hover:text-primary transition-colors text-sm" title="Abrir Ticket">
                #{order.ticketNumber || order.id.slice(0, 6).toUpperCase()}
              </Link>
              <span className="text-foreground/40 text-[10px] font-bold">{order.date}</span>
            </div>
            <h4 className="font-medium text-base line-clamp-1 leading-tight text-foreground/90 capitalize" style={{ textTransform: 'capitalize' }}>
              {order.customerName.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </h4>
          </div>

          <div className="flex flex-col items-start gap-0.5">
            <span className="font-black text-primary text-base leading-none">S/ {Number(order.total).toFixed(2)}</span>
            <span className="text-foreground/50 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <PackageSearch size={12} /> {order.items?.length || 0} serv.
            </span>
          </div>

          <div className="flex flex-col justify-center gap-2 shrink-0">
            {renderPaymentStatus(false)}
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            {renderActions(false)}
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500 md:h-[calc(100vh-8rem)]">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Órdenes en Curso</h1>

        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/70" size={18} />
            <input type="text" placeholder="Buscar ticket o cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/50 border border-black/10 rounded-xl pl-10 pr-4 py-2 text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm placeholder:text-foreground/40"
            />
          </div>

          <Link href="/admin/pedidos/nuevo" className="bg-primary hover:bg-primary-hover active:scale-95 transition-all text-white font-black rounded-xl px-4 py-2 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 shrink-0">
            <Plus size={20} />
            <span className="hidden sm:inline">Nueva Orden</span>
          </Link>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex flex-row p-1 bg-white/40 rounded-xl border border-black/5 mb-4 shrink-0 shadow-sm gap-1 overflow-visible">
        <button
          onClick={() => setActiveTab('EN_PROCESO')}
          className={`flex-1 py-3 px-4 rounded-lg font-black text-sm transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'EN_PROCESO' ? 'bg-white text-foreground shadow-sm border border-black/5' : 'text-foreground/50 hover:text-foreground hover:bg-white/40 border border-transparent'}`}
        >
          <Activity size={16} /> EN PROCESO <span className="bg-black/10 px-2 py-0.5 rounded-md text-[10px]">{filteredOrders.filter(o => o.status === 'RECIBIDO' || o.status === 'EN_PROCESO').length}</span>
        </button>
        <button
          onClick={() => setActiveTab('LISTO')}
          className={`flex-1 py-3 px-4 rounded-lg font-black text-sm transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'LISTO' ? 'bg-success/20 text-success shadow-sm border border-success/20' : 'text-foreground/50 hover:text-foreground hover:bg-white/40 border border-transparent'}`}
        >
          <CheckCircle2 size={16} /> LISTO <span className="bg-success/40 px-2 py-0.5 rounded-md text-[10px] text-success-strong">{filteredOrders.filter(o => o.status === 'LISTO').length}</span>
        </button>
      </div>

      {/* LISTADO DE PEDIDOS (Wide Rows in Single Container) */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10">
        {loading ? (
          <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-primary/50" size={32} /></div>
        ) : (
          filteredOrders.filter(o => activeTab === 'EN_PROCESO' ? (o.status === 'EN_PROCESO' || o.status === 'RECIBIDO') : o.status === activeTab).length === 0 ? (
            <div className="text-center py-20 text-foreground/40 border-2 border-dashed border-black/10 rounded-2xl bg-white/20">
              <PackageSearch size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-black">Sin tickets en esta etapa</p>
              <p className="text-sm font-medium mt-1">Limpio y ordenado.</p>
            </div>
          ) : (
            <div className="bg-white/60 rounded-2xl border border-black/5 shadow-sm overflow-hidden flex flex-col">
              {filteredOrders.filter(o => activeTab === 'EN_PROCESO' ? (o.status === 'EN_PROCESO' || o.status === 'RECIBIDO') : o.status === activeTab).map(order => renderRow(order))}
            </div>
          )
        )}
      </div>

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
                  <p className="text-foreground font-black text-2xl font-mono">{previewVoucherOrder.ticketNumber || (previewVoucherOrder.id.slice(0, 6).toUpperCase())}</p>
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
                  <br />
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
