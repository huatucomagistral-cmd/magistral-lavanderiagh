"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, History, Loader2, ArrowRight, Info, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

const OrderStatus = {
  RECIBIDO: "Recibido",
  EN_PROCESO: "En Proceso",
  LISTO: "Listo para Entregar",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export default function HistorialPage() {
  const { user } = useStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchString, setSearchString] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Carga Inicial
  useEffect(() => {
    async function loadInitialData() {
      if (!user?.storeId) return;
      setLoading(true);
      try {
        const ordersRef = collection(db, `stores/${user.storeId}/orders`);
        let q;

        if (user.role === "ADMIN") {
          // ADMIN: Ve los últimos 100 pedidos por defecto
          q = query(ordersRef, orderBy("date", "desc"), limit(100));
        } else {
          // PERSONAL: Ve solo las últimas 48 horas
          const date48hAgo = new Date();
          date48hAgo.setHours(date48hAgo.getHours() - 48);

          q = query(
            ordersRef,
            where("date", ">=", date48hAgo.toISOString()),
            orderBy("date", "desc")
          );
        }

        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(data);
      } catch (e) {
        console.error("Error al cargar historial inicial:", e);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [user]);

  // Búsqueda Manual
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    // Requerimos al menos un criterio (texto o fechas)
    if (!user?.storeId || (!searchString.trim() && !startDate && !endDate)) return;

    setIsSearching(true);
    setOrders([]);

    try {
      const ordersRef = collection(db, `stores/${user.storeId}/orders`);
      let q = query(ordersRef, orderBy("date", "desc"), limit(500));

      // Si hay fechas seleccionadas, aplicamos el timezone de Perú (UTC -5)
      // para que el corte del día exacto coincida con su realidad local.
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00-05:00`);
        q = query(q, where("date", ">=", start.toISOString()));
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59-05:00`);
        q = query(q, where("date", "<=", end.toISOString()));
      }

      const snap = await getDocs(q);

      const searchLower = searchString.toLowerCase().trim();
      let results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      // Filtrado por texto localmente
      if (searchLower) {
        results = results.filter(o =>
          (o.customerDni && o.customerDni.includes(searchLower)) ||
          (o.customerName && o.customerName.toLowerCase().includes(searchLower)) ||
          (o.ticketNumber && o.ticketNumber.toLowerCase().includes(searchLower)) ||
          (o.customerPhone && o.customerPhone.includes(searchLower))
        );
      }

      setOrders(results);
    } catch (e) {
      console.error("Error en búsqueda:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      "RECIBIDO": "bg-primary/20 text-primary border-primary/20",
      "EN_PROCESO": "bg-warning/20 text-warning border-warning/20",
      "LISTO": "bg-success/20 text-success border-success/20",
      "ENTREGADO": "bg-black/5 text-foreground/40 border-black/5",
      "CANCELADO": "bg-error/20 text-error border-error/20",
    };
    return colors[status] || "bg-black/5 text-foreground";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <History className="text-primary" size={20} /> Historial
          </h1>

        </div>
      </div>

      {user?.role === "PERSONAL" && (
        <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg flex items-start gap-3">
          <Info className="text-primary shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-foreground/70">
            Estás en <strong className="text-foreground">Modo Personal</strong>.
            Solo ves las órdenes de las últimas 48 horas de forma automática.
            Para buscar órdenes antiguas, utiliza el buscador y el selector de fechas.
          </p>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="glass-card p-4 md:p-6">
        <form onSubmit={handleSearch} className="flex flex-col xl:flex-row gap-6 items-start xl:items-end w-full">

          <div className="flex-shrink-0 w-full xl:w-auto">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onClear={() => {
                setStartDate("");
                setEndDate("");
              }}
            />
          </div>

          <div className="flex-1 w-full relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-foreground/40" />
            </div>
            <input
              type="text"
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              placeholder="Ej: 260407-001"
              className="block w-full pl-10 pr-3 py-3 border border-black/10 rounded-xl leading-5 bg-white/50 text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
            />
            <button
              type="submit"
              disabled={(!searchString.trim() && !startDate && !endDate) || isSearching}
              className="absolute inset-y-1 right-1 bg-primary hover:bg-primary-hover active:scale-95 disabled:opacity-50 text-white font-bold px-4 md:px-6 rounded-lg transition-all"
            >
              {isSearching ? <Loader2 className="animate-spin" size={18} /> : "Buscar"}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Historial */}
      <div className="glass-card p-0 overflow-hidden">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 text-foreground/40">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Cargando datos...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 text-foreground/30 p-6 text-center">
            <History size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-foreground/50">No se encontraron órdenes</p>
            <p className="text-sm mt-1">Intenta con otro término de búsqueda.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-black/5">
            {orders.map((order) => {
              const dateObj = new Date(order.date);
              return (
                <div key={order.id} className="p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between group hover:bg-black/[0.02] transition-colors relative gap-4 border-b border-black/5 last:border-0">

                  {/* Left Side: Ticket, Customer, Date */}
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-10 md:pr-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/pedidos/ticket/${order.id}`}
                        className="font-mono text-xs font-bold bg-primary/10 hover:bg-primary active:scale-95 text-primary hover:text-white transition-all px-2 py-0.5 rounded border border-primary/20 hover:border-primary shrink-0"
                      >
                        #{order.ticketNumber || order.id.slice(0, 6)}
                      </Link>
                      <span className="text-foreground font-medium text-sm sm:text-base truncate group-hover:text-primary transition-colors">
                        {order.customerName.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1 text-foreground/60 text-[11px] font-bold tracking-wide">
                        <Calendar size={10} /> {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {order.customerDni !== "0" && (
                        <>
                          <span className="text-foreground/30 text-[10px] hidden sm:inline">•</span>
                          <span className="text-foreground/50 tracking-wider font-mono text-[10px] font-bold bg-black/5 border border-black/5 px-1.5 py-0.5 rounded">
                            DNI: {order.customerDni}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Fila inferior: Estado + Pago + Precio en una sola línea */}
                  <div className="flex items-center gap-2 mt-1 md:mt-0 w-full md:w-auto md:justify-end flex-wrap">
                    {/* Status badge */}
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${getStatusColor(order.status)}`}>
                      {OrderStatus[order.status as keyof typeof OrderStatus] || order.status}
                    </span>

                    {/* Motivo de cancelación inline */}
                    {order.status === 'CANCELADO' && order.cancelReason && (
                      <span className="text-[10px] text-error font-medium italic truncate max-w-[120px]">
                        {order.cancelReason}
                      </span>
                    )}

                    {/* Payment badge */}
                    {(() => {
                      if (order.paymentStatus === 'PAID') {
                        const method = (order.payMethod || order.paymentMethod || 'EFECTIVO').toUpperCase();
                        const isYape = method === 'YAPE';
                        const colorClass = isYape ? 'border-[#742284]/20 bg-[#742284]/5 text-[#742284]' : 'border-success/20 bg-success/5 text-success';
                        const dotColor = isYape ? 'bg-[#742284]' : 'bg-success';
                        const label = isYape ? 'PAGADO YAPE' : 'PAGADO EFEC.';
                        return (
                          <div className={`flex items-center gap-1.5 border rounded px-2 py-1 ${colorClass}`}>
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                            <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">{label}</span>
                          </div>
                        );
                      } else if (order.paymentStatus === 'PENDING_VERIFICATION') {
                        return (
                          <div className="flex items-center gap-1.5 border rounded px-2 py-1 bg-warning/10 text-warning border-warning/20">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-warning animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">VERIFICAR</span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex items-center gap-1.5 border rounded px-2 py-1 bg-error/10 text-error border-error/20">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-error" />
                            <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">DEBE</span>
                          </div>
                        );
                      }
                    })()}

                    {/* Precio alineado a la derecha */}
                    <p className="ml-auto text-sm sm:text-base text-foreground font-mono font-black">S/ {Number(order.total).toFixed(2)}</p>
                  </div>


                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}
