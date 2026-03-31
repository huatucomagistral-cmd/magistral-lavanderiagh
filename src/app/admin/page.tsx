import { TrendingUp, Users, DollarSign, Activity } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Panel de Control</h1>
        <p className="text-white/60">Resumen de lavandería para Lavandería Sol.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI Cards */}
        <KpiCard 
          title="Ingresos Hoy"
          value="S/ 450.00"
          trend="+12%"
          trendUp={true}
          icon={<DollarSign className="text-primary" size={24} />}
        />
        <KpiCard 
          title="Nuevos Pedidos"
          value="24"
          trend="+5%"
          trendUp={true}
          icon={<Activity className="text-accent" size={24} />}
        />
        <KpiCard 
          title="En Proceso"
          value="18"
          icon={<TrendingUp className="text-warning" size={24} />}
        />
        <KpiCard 
          title="Clientes Nuevos"
          value="3"
          trend="-2%"
          trendUp={false}
          icon={<Users className="text-success" size={24} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 glass-card p-6 min-h-[400px]">
          <h2 className="text-lg font-semibold text-white mb-4">Ingresos Semanales</h2>
          <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-xl">
             <span className="text-white/30 text-sm font-medium">Gráfico (Proximamente)</span>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Actividad Reciente</h2>
          <div className="space-y-4">
            <ActivityItem text="Nuevo pedido #0012 por S/45" time="Hace 5 min" />
            <ActivityItem text="Caja terminada (Juan)" time="Hace 1 hora" />
            <ActivityItem text="Pedido #0008 Entregado" time="Hace 2 horas" />
            <ActivityItem text="Pago Yape aprobado" time="Hace 3 horas" />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, trendUp, icon }: any) {
  return (
    <div className="glass-card p-6 flex flex-col gap-4 relative overflow-hidden group">
      {/* Decal background */}
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
            {trend} respecto a ayer
          </p>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex gap-4 items-start relative">
      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0 z-10" />
      <div className="absolute left-[3px] top-4 bottom-[-16px] w-[2px] bg-white/5 z-0" />
      <div>
        <p className="text-sm font-medium text-white/80">{text}</p>
        <span className="text-xs text-white/40">{time}</span>
      </div>
    </div>
  );
}
