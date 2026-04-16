"use client";

import { useEffect, useState, useMemo } from "react";
import { TrendingUp, DollarSign, Activity, Loader2, Award, Package } from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStore } from "@/store/useStore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminDashboard() {
  const { user, currentStore } = useStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [directSales, setDirectSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.storeId) return;
    const qpos = query(collection(db, `stores/${user.storeId}/directSales`), orderBy("date", "desc"));
    const unsubPos = onSnapshot(qpos, (snap) => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const data = snap.docs.map(d => {
        const raw = d.data();
        const dateObj = raw.date ? new Date(raw.date) : new Date();
        const dsDateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 10) : '';
        return {
          id: d.id, ...raw,
          _isToday: dsDateStr === todayStr,
          _dateObj: dateObj
        };
      });
      setDirectSales(data);
    });
    return () => unsubPos();
  }, [user]);

  useEffect(() => {
    if (!user?.storeId) return;
    const q = query(collection(db, `stores/${user.storeId}/orders`), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const raw = d.data();
        const dateObj = raw.date?.toDate ? raw.date.toDate() : new Date(raw.date);
        const todayStr = new Date().toISOString().slice(0, 10);
        const orderDateStr = isNaN(dateObj.getTime()) ? '' : dateObj.toISOString().slice(0, 10);
        const paymentDateObj = raw.paymentDate ? new Date(raw.paymentDate) : null;
        const paymentDateStr = paymentDateObj && !isNaN(paymentDateObj.getTime()) ? paymentDateObj.toISOString().slice(0, 10) : '';
        
        return {
          id: d.id,
          ...raw,
          _isToday: orderDateStr === todayStr,
          _isPaidToday: (paymentDateStr === todayStr) || (!raw.paymentDate && orderDateStr === todayStr && raw.paymentStatus === 'PAID'),
          _dateObj: dateObj
        };
      });
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user?.storeId || user.role !== 'ADMIN') return;
    const q = query(collection(db, `stores/${user.storeId}/expenses`), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const data = snap.docs.map(d => {
        const raw = d.data();
        const dateObj = raw.date?.toDate ? raw.date.toDate() : new Date(raw.date);
        const expDateStr = dateObj.toISOString().slice(0, 10);
        return {
          id: d.id,
          ...raw,
          _isToday: expDateStr === todayStr,
        };
      });
      setExpenses(data);
    });
    return () => unsub();
  }, [user]);

  // Cálculos dinámicos
  const todayOrders = useMemo(() => orders.filter(o => o._isToday), [orders]);
  
  const posIngresosHoy = useMemo(() => directSales
    .filter(s => s._isToday)
    .reduce((acc, s) => acc + (Number(s.total) || 0), 0), [directSales]);

  const ingresosHoy = useMemo(() => orders
    .filter(o => o._isPaidToday)
    .reduce((acc, o) => acc + (Number(o.total) || 0), 0) + posIngresosHoy, [orders, posIngresosHoy]);
  
  const ordenesNuevas = todayOrders.length;
  const enProceso = orders.filter(o => o.status !== 'ENTREGADO').length;

  // Gastos y Utilidad
  const gastosHoy = useMemo(() => expenses
    .filter(e => e._isToday)
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0), [expenses]);
  
  const utilidadHoy = ingresosHoy - gastosHoy;

  const posIngresosTotales = useMemo(() => directSales
    .reduce((acc, s) => acc + (Number(s.total) || 0), 0), [directSales]);

  const ingresosTotales = useMemo(() => orders
    .filter(o => o.status === 'ENTREGADO' || o.paymentStatus === 'PAID')
    .reduce((acc, o) => acc + (Number(o.total) || 0), 0) + posIngresosTotales, [orders, posIngresosTotales]);
  
  const gastosTotales = useMemo(() => expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0), [expenses]);
  const utilidadTotal = ingresosTotales - gastosTotales;

  const topCustomers = useMemo(() => {
    const map = new Map();
    orders.forEach(o => {
      if(!o.customerName) return;
      const key = o.customerPhone || o.customerDni || o.customerName;
      const current = map.get(key) || { name: o.customerName, spent: 0, count: 0 };
      if(o.status === 'ENTREGADO' || o.paymentStatus === 'PAID') {
        current.spent += Number(o.total) || 0;
      }
      current.count += 1;
      map.set(key, current);
    });
    return Array.from(map.values())
      .filter(c => c.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);
  }, [orders]);

  // Generar data real real para el gráfico de los últimos 7 días
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
       const d = new Date();
       d.setDate(d.getDate() - i);
       const dateStr = d.toISOString().slice(0, 10);
       const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
       
       let cash = 0;
       let yape = 0;
       
       orders.forEach((o:any) => {
          const oDateStr = o._dateObj && !isNaN(o._dateObj.getTime()) ? o._dateObj.toISOString().slice(0, 10) : '';
          const pDateStr = o.paymentDate ? (new Date(o.paymentDate)).toISOString().slice(0, 10) : '';
          
          if (pDateStr === dateStr || (!o.paymentDate && oDateStr === dateStr && o.paymentStatus === 'PAID')) {
             const method = o.payMethod || o.paymentMethod || '';
             if (method.toUpperCase() === 'YAPE') {
                yape += Number(o.total) || 0;
             } else {
                cash += Number(o.total) || 0;
             }
          }
       });

       directSales.forEach((s:any) => {
          const sDateStr = s._dateObj && !isNaN(s._dateObj.getTime()) ? s._dateObj.toISOString().slice(0, 10) : '';
          if (sDateStr === dateStr) {
             const method = s.payMethod || '';
             if (method.toUpperCase() === 'YAPE' || method.toUpperCase() === 'YAPE/PLIN') {
                 yape += Number(s.total) || 0;
             } else {
                 cash += Number(s.total) || 0;
             }
          }
       });

       days.push({
         name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
         Efectivo: cash,
         Yape: yape,
       });
    }
    return days;
  }, [orders, directSales]);

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
        <h1 className="text-3xl font-black text-black tracking-tight mb-1">Panel de Control</h1>
        <p className="text-black/60 font-semibold text-sm">Visión ejecutiva de <strong className="text-primary">{currentStore?.storeName || currentStore?.name || "tu negocio"}</strong>.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        {user?.role === "ADMIN" ? (
          <>
            <KpiCard 
              title="Ingresos Hoy"
              value={`S/ ${ingresosHoy.toFixed(2)}`}
              trendUp={true}
              icon={<DollarSign size={24} />}
              colorClass="bg-[#0FFF50] text-[#0A9E32]"
              borderClass="border-black/5"
            />
            <KpiCard 
              title="Gastos Hoy"
              value={`S/ ${gastosHoy.toFixed(2)}`}
              icon={<TrendingUp className="rotate-180" size={24} />}
              colorClass="bg-[#FF453A] text-[#B01E15]"
              borderClass="border-black/5"
            />
            <KpiCard 
              title="Utilidad de Hoy"
              value={`S/ ${utilidadHoy.toFixed(2)}`}
              trendUp={utilidadHoy >= 0}
              icon={<Activity size={24} />}
              colorClass={utilidadHoy >= 0 ? "bg-primary text-black" : "bg-[#FF453A] text-[#B01E15]"}
              borderClass="border-black/5"
            />
            <KpiCard 
              title="Nuevas Órdenes"
              value={ordenesNuevas.toString()}
              icon={<Package size={24} />}
              colorClass="bg-[#FF9F0A] text-[#9D5D02]"
              borderClass="border-black/5"
            />
          </>
        ) : (
          <>
            <KpiCard 
              title="Nuevas Órdenes"
              value={ordenesNuevas.toString()}
              icon={<Activity size={24} />}
              colorClass="bg-primary text-black"
              borderClass="border-black/5"
            />
            <KpiCard 
              title="En Proceso"
              value={enProceso.toString()}
              icon={<TrendingUp size={24} />}
              colorClass="bg-[#FF9F0A] text-[#9D5D02]"
              borderClass="border-black/5"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico Semanal Profesional */}
        {user?.role === "ADMIN" && (
        <div className="lg:col-span-2 bg-white rounded-3xl border border-black/5 p-6 flex flex-col h-[420px] shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-black text-black">Ingresos Semanales</h2>
              <p className="text-xs font-bold text-black/50 tracking-wider uppercase mt-1">Últimos 7 días</p>
            </div>
            <div className="flex gap-4 text-xs font-bold text-black/70 bg-black/5 px-4 py-2 rounded-full">
               <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm" /> Efectivo</span>
               <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#742284] shadow-sm" /> Yape</span>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 w-full relative -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#00000060', fontWeight: 'bold' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#00000060', fontWeight: 'bold' }} tickFormatter={(val) => `S/${val}`} />
                <Tooltip 
                   cursor={{ fill: '#00000005' }} 
                   contentStyle={{ borderRadius: '16px', border: '1px solid #00000010', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', fontWeight: 'bold', padding: '12px' }} 
                   itemStyle={{ fontWeight: 'black', fontSize: '14px' }}
                />
                <Bar dataKey="Yape" stackId="a" fill="#742284" radius={[0, 0, 0, 0]} barSize={40} />
                <Bar dataKey="Efectivo" stackId="a" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

        {/* Top Clientes con Medallas */}
        {user?.role === "ADMIN" && (
          <div className="bg-white rounded-3xl border border-black/5 p-6 overflow-hidden flex flex-col shadow-sm">
            <div className="flex justify-between items-start mb-6">
               <div>
                 <h2 className="text-xl font-black text-black">Top Clientes</h2>
                 <p className="text-xs font-bold text-black/50 tracking-wider uppercase mt-1">Mejores Compradores</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                 <Award size={20} />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="bg-black/5 rounded-2xl p-4">
                  <p className="text-[10px] uppercase font-bold text-black/50 tracking-wider">Ingresos Globales</p>
                  <p className="text-lg font-black text-success mt-1">S/ {ingresosTotales.toFixed(2)}</p>
               </div>
               <div className="bg-black/5 rounded-2xl p-4">
                  <p className="text-[10px] uppercase font-bold text-black/50 tracking-wider">Utilidad Global</p>
                  <p className="text-lg font-black text-primary mt-1">S/ {utilidadTotal.toFixed(2)}</p>
               </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-hide">
              {topCustomers.map((c, i) => {
                 const isGold = i === 0;
                 const isSilver = i === 1;
                 const isBronze = i === 2;
                 const maxSpent = topCustomers[0]?.spent || 1;
                 const percent = (c.spent / maxSpent) * 100;
                 
                 let medalClass = "bg-primary/10 text-primary";
                 let ringClass = "border-primary/20";
                 if (isGold) { medalClass = "bg-[#FFD700]/20 text-[#B8860B]"; ringClass = "border-[#FFD700]/40"; }
                 else if (isSilver) { medalClass = "bg-[#C0C0C0]/30 text-[#696969]"; ringClass = "border-[#C0C0C0]/50"; }
                 else if (isBronze) { medalClass = "bg-[#CD7F32]/20 text-[#8B4513]"; ringClass = "border-[#CD7F32]/40"; }
                 
                 return (
                 <div key={i} className={`flex flex-col p-3 rounded-2xl border ${ringClass} group hover:shadow-sm transition-all bg-white`}>
                    <div className="flex justify-between items-center mb-2">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full font-black flex items-center justify-center text-xs ${medalClass}`}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-black line-clamp-1">{c.name}</p>
                            <p className="text-[10px] text-black/50 font-bold uppercase tracking-wider">{c.count} órdenes</p>
                          </div>
                       </div>
                       <div className="text-right shrink-0">
                          <p className="text-sm font-mono font-black text-black">S/ {c.spent.toFixed(2)}</p>
                       </div>
                    </div>
                    {/* Barra Proporcional */}
                    <div className="w-full bg-black/5 rounded-full h-1.5 overflow-hidden">
                       <div className={`h-full rounded-full ${medalClass.split(' ')[0].replace('/20','').replace('/30','')}`} style={{ width: `${percent}%` }} />
                    </div>
                 </div>
              )})}
              {topCustomers.length === 0 && (
                <div className="h-full flex flex-col justify-center items-center text-black/40 p-6">
                  <Award size={32} className="mb-2 opacity-20" />
                  <p className="text-sm font-bold text-center">No hay datos suficientes</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline Actividad Reciente */}
        <div className={`bg-white rounded-3xl border border-black/5 p-6 shadow-sm flex flex-col ${user?.role === "ADMIN" ? "lg:col-span-3" : "col-span-1"}`}>
          <div className="flex justify-between items-center mb-8">
             <div>
               <h2 className="text-xl font-black text-black">Línea de Tiempo Operativa</h2>
               <p className="text-xs font-bold text-black/50 tracking-wider uppercase mt-1">Actividad Reciente</p>
             </div>
          </div>

          <div className="space-y-0 overflow-x-auto pb-4 pt-2">
             <div className="flex gap-4 min-w-max px-2 relative">
               {/* Línea conectora horizontal para pantallas anchas o scroll */}
               <div className="absolute top-2.5 left-4 right-4 h-[2px] bg-black/5 rounded-full z-0" />
               
               {orders.slice(0, 8).map((o, idx) => {
                 return (
                   <ActivityItem 
                     key={o.id} 
                     text={`Orden #${o.ticketNumber?.slice(-3) || o.id.slice(0,4)} • ${o.customerName}`}
                     status={o.status}
                     date={o._dateObj}
                   />
                 )
               })}

               {orders.length === 0 && (
                 <p className="text-black/40 text-sm italic font-bold">Sin actividad registrada en la tienda.</p>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, trendUp, icon, colorClass, borderClass }: any) {
  return (
    <div className={`p-5 rounded-3xl bg-white border ${borderClass} flex flex-col gap-5 relative overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300`}>
      {/* Decorative Glow Atmosférico */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${colorClass.split(" ")[0]} opacity-30 blur-2xl group-hover:opacity-50 transition-opacity duration-500`} />
      
      <div className="flex justify-between items-start z-10">
        <span className="text-sm font-bold text-black/50 tracking-tight">{title}</span>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${colorClass.split(" ")[0]} bg-opacity-10 text-current`}>
          <div className="text-current opacity-80">
            {icon}
          </div>
        </div>
      </div>
      <div className="z-10 mt-2">
        <h3 className="text-4xl font-black text-black tracking-tighter tabular-nums">{value}</h3>
        <p className={`text-[10px] font-bold mt-3 uppercase tracking-wider flex items-center gap-1.5 ${trendUp ? 'text-success' : 'text-error'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${trendUp ? 'bg-success' : 'bg-error'} animate-pulse`} />
          En tiempo real
        </p>
      </div>
    </div>
  );
}

function ActivityItem({ text, status, date }: any) {
  const getStatusColor = () => {
    if (status === 'ENTREGADO') return 'bg-success border-success text-success';
    if (status === 'LISTO') return 'bg-primary border-primary text-primary';
    return 'bg-[#FF9F0A] border-[#FF9F0A] text-[#9D5D02]';
  };

  const getStatusLabel = () => {
     if (status === 'ENTREGADO') return 'Entregado';
     if (status === 'LISTO') return 'Listo';
     return 'Proceso';
  }

  const timeStr = date && !isNaN(date.getTime()) 
    ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) 
    : '--:--';

  return (
    <div className="flex flex-col gap-3 relative group min-w-[200px] max-w-[240px]">
      <div className={`w-5 h-5 rounded-full border-[5px] shadow-sm border-white flex-shrink-0 z-10 ${getStatusColor().split(' ')[0]} transition-transform group-hover:scale-125 mx-auto`} />
      
      <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm group-hover:shadow-md transition-shadow group-hover:border-black/10">
        <div className="flex justify-between items-center mb-2">
           <span className={`text-[9px] font-black uppercase tracking-widest ${getStatusColor().split(' ')[2]} bg-black/5 px-2 py-0.5 rounded-md`}>{getStatusLabel()}</span>
           <span className="text-[10px] text-black/40 font-black shrink-0">{timeStr}</span>
        </div>
        <p className="text-xs font-bold text-black leading-tight line-clamp-2">{text}</p>
      </div>
    </div>
  );
}
