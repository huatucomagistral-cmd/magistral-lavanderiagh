"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, MoreVertical, MapPin, CheckCircle, PackageSearch, Loader2, Info, History, X, Check } from "lucide-react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type OrderStatus = 'RECIBIDO' | 'EN_PROCESO' | 'LISTO' | 'ENTREGADO';

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Cargar orders en tiempo real desde Firebase
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "stores/demo-store/orders"), (snap) => {
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
      const orderRef = doc(db, "stores/demo-store/orders", id);
      await updateDoc(orderRef, { status: newStatus });
    } catch(err) {
      console.error("Error updating status: ", err);
    }
  };

  const confirmPayment = async (id: string, method: string, andDeliver: boolean = false) => {
    try {
      const orderRef = doc(db, "stores/demo-store/orders", id);
      const updates: any = { 
        paymentStatus: 'PAID',
        payMethod: method
      };
      if (andDeliver) updates.status = 'ENTREGADO';
      await updateDoc(orderRef, updates);
    } catch(err) {
      console.error("Error confirming payment: ", err);
    }
  };

  const filteredOrders = orders.filter(o => 
    (o.status !== 'ENTREGADO') && (
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
      <div className="flex flex-col h-full glass-card p-4 overflow-hidden">
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
                  <Link href={`/admin/pedidos/ticket/${order.id}`} className="text-primary font-bold font-mono bg-primary/10 px-2 py-0.5 rounded-md text-sm hover:underline">{order.ticketNumber || order.id.slice(0, 6).toUpperCase()}</Link>
                  <span className="text-white/40 text-xs">{order.date}</span>
                </div>
                
                <h4 className="text-white font-medium mb-1 line-clamp-1">{order.customerName}</h4>
                
                <div className="flex items-center gap-4 text-xs text-white/50 mb-3">
                  <span className="flex items-center gap-1"><PackageSearch size={14}/> {order.items?.length || 0} serv.</span>
                  <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-white/70">S/ {Number(order.total).toFixed(2)}</span>
                </div>

                {/* Badge de Pago Pendiente (YAPE ONLINE) */}
                {order.paymentStatus === 'PENDING_VERIFICATION' && (
                  <div className="mb-3 animate-pulse">
                    <a 
                      href={order.voucherUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-warning/20 text-warning border border-warning/30 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-warning/30 transition-colors"
                    >
                      <Info size={12} /> Pago por Validar (Ver Voucher)
                    </a>
                  </div>
                )}

                {/* Badge de Por Cobrar (EFECTIVO O AL RECOGER) */}
                {order.paymentStatus === 'UNPAID' && (
                  <div className="mb-3 px-3 py-2 bg-error/10 text-error border border-error/20 rounded-lg flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase text-center flex items-center justify-center gap-1">
                      <Info size={12}/> Por Cobrar ❌
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => confirmPayment(order.id, 'EFECTIVO', order.status === 'LISTO')} className="flex-1 bg-white/10 hover:bg-white/20 text-[9px] py-1 rounded font-bold transition-colors">💵 Efectivo</button>
                      <button onClick={() => confirmPayment(order.id, 'YAPE', order.status === 'LISTO')} className="flex-1 bg-[#742284]/20 hover:bg-[#742284]/40 text-[9px] py-1 rounded font-bold text-[#742284] border border-[#742284]/20 transition-colors">🟣 Yape</button>
                    </div>
                  </div>
                )}

                {/* Confirmado */}
                {order.paymentStatus === 'PAID' && (
                  <div className="mb-3 px-3 py-1 bg-success/10 text-success border border-success/20 rounded-lg text-center">
                    <span className="text-[10px] font-bold uppercase flex items-center justify-center gap-1">
                      <CheckCircle size={10}/> Pagado / Cancelado
                    </span>
                  </div>
                )}

                {/* Status Action Buttons */}
                <div className="flex gap-2 mt-2 pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {order.paymentStatus === 'PENDING_VERIFICATION' ? (
                    <button 
                      onClick={async () => {
                        const orderRef = doc(db, "stores/demo-store/orders", order.id);
                        await updateDoc(orderRef, { paymentStatus: 'PAID' });
                      }}
                      className="flex-1 bg-success text-white hover:bg-success/80 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-success/20"
                    >
                      Confirmar Pago ✅
                    </button>
                  ) : (
                    <>
                      {status === 'RECIBIDO' && (
                        <button onClick={() => updateStatus(order.id, 'EN_PROCESO')} className="flex-1 bg-warning/20 text-warning hover:bg-warning/30 py-1.5 rounded text-xs font-bold transition-colors">
                          A Proceso
                        </button>
                      )}
                      {status === 'EN_PROCESO' && (
                        <button onClick={() => updateStatus(order.id, 'LISTO')} className="flex-1 bg-success/20 text-success hover:bg-success/30 py-1.5 rounded text-xs font-bold transition-colors">
                          Marcar Listo
                        </button>
                      )}
                      {status === 'LISTO' && order.paymentStatus === 'PAID' && (
                        <button onClick={() => updateStatus(order.id, 'ENTREGADO')} className="flex-1 bg-primary/20 text-primary hover:bg-primary/30 py-1.5 rounded text-xs font-bold transition-colors">
                          Entregar
                        </button>
                      )}
                    </>
                  )}
                  <button className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors">
                    <MoreVertical size={16} />
                  </button>
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
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
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
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden min-h-0">
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
    </div>
  );
}
