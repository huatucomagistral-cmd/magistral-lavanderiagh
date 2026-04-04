"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, History, Loader2, ArrowRight, Info } from "lucide-react";
import Link from "next/link";

const OrderStatus = {
  RECIBIDO: "Recibido",
  PROCESANDO: "En Proceso",
  LISTO: "Listo para Entregar",
  ENTREGADO: "Entregado",
};

export default function HistorialPage() {
  const { user } = useStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchString, setSearchString] = useState("");
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
    if (!user?.storeId || !searchString.trim()) return;

    setIsSearching(true);
    setOrders([]);

    try {
      const ordersRef = collection(db, `stores/${user.storeId}/orders`);
      
      // Filtrar cliente en memoria por ahora para evitar índices complejos (DNI/Nombre/Ticket)
      // Traemos una buena cantidad de historial y filtramos. 
      // NOTA: Para un SaaS a gran escala esto requeriría Algolia o índices compuestos.
      // Para cientos/miles de pedidos de una lavandería, esto es aceptable.
      const q = query(ordersRef, orderBy("date", "desc"), limit(500));
      const snap = await getDocs(q);
      
      const searchLower = searchString.toLowerCase();
      
      const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any })).filter(o => 
        (o.customerDni && o.customerDni.includes(searchString)) ||
        (o.customerName && o.customerName.toLowerCase().includes(searchLower)) ||
        (o.ticketNumber && o.ticketNumber.toLowerCase().includes(searchLower)) ||
        (o.customerPhone && o.customerPhone.includes(searchString))
      );
      
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
      "PROCESANDO": "bg-yellow-500/20 text-yellow-500 border-yellow-500/20",
      "LISTO": "bg-success/20 text-success border-success/20",
      "ENTREGADO": "bg-white/10 text-white/50 border-white/10",
    };
    return colors[status] || "bg-white/10 text-white";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="text-primary" /> Historial Inteligente
          </h1>
          <p className="text-white/50 text-sm mt-1">Busca cualquier pedido por DNI, Nombre o Ticket.</p>
        </div>
      </div>

      {user?.role === "PERSONAL" && (
        <div className="bg-[#18181b] border border-white/10 p-3 rounded-lg flex items-start gap-3">
          <Info className="text-primary shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-white/70">
            Estás en <strong className="text-white">Modo Personal</strong>. 
            Solo ves los pedidos de las últimas 48 horas de forma automática.
            Para buscar pedidos antiguos, utiliza el buscador.
          </p>
        </div>
      )}

      {/* Buscador */}
      <div className="glass-card p-4 md:p-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 block">
            Buscar Cliente o Ticket
          </label>
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-white/40" />
            </div>
            <input
              type="text"
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              placeholder="Ej. 70001010, Juan Pérez, 260401-001..."
              className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-[#18181b] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
            <button
              type="submit"
              disabled={!searchString.trim() || isSearching}
              className="absolute inset-y-1 right-1 bg-primary hover:bg-primary-hover active:scale-95 disabled:opacity-50 text-white font-bold px-4 rounded-lg transition-all"
            >
              {isSearching ? <Loader2 className="animate-spin" size={18} /> : "Buscar"}
            </button>
          </form>
        </div>
      </div>

      {/* Lista de Historial */}
      <div className="glass-card p-0 overflow-hidden">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 text-white/50">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Cargando datos...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 text-white/30 p-6 text-center">
            <History size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-white/50">No se encontraron pedidos</p>
            <p className="text-sm mt-1">Intenta con otro término de búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface border-b border-white/5">
                  <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-wider">Fecha</th>
                  <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-wider">Ticket</th>
                  <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-wider">Cliente</th>
                  <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-wider">Total</th>
                  <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-wider">Estado Operativo</th>
                  <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-wider">Pago</th>
                  <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-wider text-right">Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order) => {
                  const dateObj = new Date(order.date);
                  return (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 align-middle">
                        <p className="text-sm text-white font-medium">{dateObj.toLocaleDateString()}</p>
                        <p className="text-xs text-white/40">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="font-mono text-sm bg-[#18181b] border border-white/10 px-2 py-1 rounded">
                          {order.ticketNumber || order.id.slice(0, 6)}
                        </span>
                      </td>
                      <td className="p-4 align-middle">
                        <p className="text-sm text-white font-bold">{order.customerName}</p>
                        {order.customerDni !== "0" && <p className="text-xs text-white/40">{order.customerDni}</p>}
                      </td>
                      <td className="p-4 align-middle">
                        <p className="text-sm text-white font-mono font-bold">S/ {Number(order.total).toFixed(2)}</p>
                      </td>
                      <td className="p-4 align-middle">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                          {OrderStatus[order.status as keyof typeof OrderStatus] || order.status}
                        </span>
                      </td>
                      <td className="p-4 align-middle">
                        {order.paymentStatus === "PAID" ? (
                          <span className="text-success text-xs font-bold bg-success/10 px-2 py-1 rounded">PAGADO</span>
                        ) : order.paymentStatus === "PENDING_VERIFICATION" ? (
                          <span className="text-yellow-500 text-xs font-bold bg-yellow-500/10 px-2 py-1 rounded">VERIFICAR</span>
                        ) : (
                          <span className="text-error text-xs font-bold bg-error/10 px-2 py-1 rounded">DEBE</span>
                        )}
                        <p className="text-[10px] text-white/40 mt-1 uppercase">{order.payMethod}</p>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <Link 
                          href={`/admin/pedidos/ticket/${order.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-lg transition-colors border border-white/10"
                        >
                          Ver <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
