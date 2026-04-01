"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, DollarSign, Activity, Loader2 } from "lucide-react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "stores/demo-store/orders"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const raw = d.data();
        const dateObj = raw.date?.toDate ? raw.date.toDate() : new Date(raw.date);
        const todayStr = new Date().toISOString().slice(0, 10);
        const orderDateStr = isNaN(dateObj.getTime()) ? '' : dateObj.toISOString().slice(0, 10);
        return {
          id: d.id,
          ...raw,
          _isToday: orderDateStr === todayStr,
          _dateObj: dateObj
        };
      });
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Cálculos dinámicos
  const todayOrders = orders.filter(o => o._isToday);
  const ingresosHoy = todayOrders
    .filter(o => o.status === 'ENTREGADO')
    .reduce((acc, o) => acc + (Number(o.total) || 0), 0);
  
  const pedidosNuevos = todayOrders.length;
  const enProceso = orders.filter(o => o.status !== 'ENTREGADO').length;
  
  // Clientes únicos hoy (aproximación rápida)
  const clientesHoy = new Set(todayOrders.map(o => o.customerPhone)).size;

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Panel de Control</h1>
        <p className="text-white/60">Resumen de lavandería para Lavandería Magistral.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="Ingresos Hoy"
          value={`S/ ${ingresosHoy.toFixed(2)}`}
          trend="+0%"
          trendUp={true}
          icon={<DollarSign className="text-primary" size={24} />}
        />
        <KpiCard 
          title="Nuevos Pedidos"
          value={pedidosNuevos.toString()}
          trend="+0%"
          trendUp={true}
          icon={<Activity className="text-accent" size={24} />}
        />
        <KpiCard 
          title="En Proceso"
          value={enProceso.toString()}
          icon={<TrendingUp className="text-warning" size={24} />}
        />
        <KpiCard 
          title="Clientes de Hoy"
          value={clientesHoy.toString()}
          trend="+0%"
          trendUp={true}
          icon={<Users className="text-success" size={24} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Semanal (Estructura preparada para datos reales en el futuro) */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">Ingresos Semanales</h2>
            <div className="flex gap-4 text-xs font-bold text-white/50">
               <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-primary" /> Efectivo</span>
               <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#742284]" /> Yape</span>
            </div>
          </div>
          
          <div className="flex-1 flex items-end justify-between gap-2 xl:gap-4 pb-2 border-b border-white/10 relative">
             <div className="absolute top-0 w-full h-[1px] bg-white/5" />
             <div className="absolute top-1/2 w-full h-[1px] bg-white/5" />

             {/* Datos Grafico - Por ahora promediamos los datos para visualizar la estructura */}
             {[
               { day: 'Lun', cash: 40, yape: 60 },
               { day: 'Mar', cash: 50, yape: 30 },
               { day: 'Mié', cash: 20, yape: 40 },
               { day: 'Jue', cash: 60, yape: 80 },
               { day: 'Vie', cash: 30, yape: 90 },
               { day: 'Sáb', cash: 90, yape: 120 },
               { day: 'Hoy', cash: ingresosHoy * 0.4, yape: ingresosHoy * 0.6 }
             ].map((col, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group z-10 w-full h-full justify-end cursor-pointer">
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-black/80 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap z-20 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                      S/ {(col.cash + col.yape).toFixed(0)}
                   </div>
                   <div className="w-full max-w-[40px] flex flex-col justify-end gap-1 flex-1 relative">
                       <div 
                          className="w-full bg-[#742284] rounded-t-sm" 
                          style={{ height: `${Math.max(5, (col.yape / 200) * 100)}%` }} 
                       />
                       <div 
                          className="w-full bg-primary rounded-b-sm shadow-[0_0_15px_rgba(15,255,160,0.3)]" 
                          style={{ height: `${Math.max(5, (col.cash / 200) * 100)}%` }} 
                       />
                   </div>
                   <span className="text-white/50 text-[10px] sm:text-xs font-medium">{col.day}</span>
                </div>
             ))}
          </div>
        </div>

        {/* Recent Activity Sincronizada */}
        <div className="glass-card p-6 overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold text-white mb-4">Actividad Reciente</h2>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-hide">
            {orders.slice(0, 8).map((o) => (
              <ActivityItem 
                key={o.id} 
                text={`Pedido #${o.ticketNumber?.slice(-3) || o.id.slice(0,4)} - ${o.customerName}`}
                time={o.status === 'ENTREGADO' ? 'Entregado' : 'En proceso'}
                status={o.status}
              />
            ))}
            {orders.length === 0 && (
              <p className="text-white/30 text-sm text-center py-10 italic">Sin actividad registrada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, trendUp, icon }: any) {
  return (
    <div className="glass-card p-6 flex flex-col gap-4 relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 scale-150 transform">
        {icon}
      </div>
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-white/60">{title}</span>
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
        {trend && (
          <p className={`text-xs font-medium mt-1 ${trendUp ? 'text-success' : 'text-error'}`}>
             Dato en tiempo real
          </p>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ text, time, status }: { text: string; time: string; status?: string }) {
  const getStatusColor = () => {
    if (status === 'ENTREGADO') return 'bg-success';
    if (status === 'LISTO') return 'bg-primary';
    return 'bg-warning';
  };

  return (
    <div className="flex gap-4 items-start relative pb-2">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} mt-2 flex-shrink-0 z-10 shadow-[0_0_8px_currentColor]`} />
      <div className="absolute left-[3px] top-4 bottom-[-16px] w-[2px] bg-white/5 z-0" />
      <div>
        <p className="text-xs font-medium text-white/80 line-clamp-1">{text}</p>
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{time}</span>
      </div>
    </div>
  );
}
