"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, MoreVertical, MapPin, CheckCircle, PackageSearch } from "lucide-react";

type OrderStatus = 'RECIBIDO' | 'EN_PROCESO' | 'LISTO' | 'ENTREGADO';

type Order = {
  id: string;
  ticket: string;
  customerName: string;
  status: OrderStatus;
  total: number;
  items: number;
  date: string;
};

const mockOrders: Order[] = [
  { id: "1", ticket: "T-0045", customerName: "Carlos Pérez", status: "RECIBIDO", total: 15.00, items: 3, date: "Hoy, 10:30 AM" },
  { id: "2", ticket: "T-0044", customerName: "María Gómez", status: "EN_PROCESO", total: 45.50, items: 2, date: "Hoy, 09:15 AM" },
  { id: "3", ticket: "T-0043", customerName: "Juan Luis", status: "LISTO", total: 22.00, items: 5, date: "Ayer" },
  { id: "4", ticket: "T-0042", customerName: "Ana Silva", status: "EN_PROCESO", total: 10.00, items: 1, date: "Ayer" },
];

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [searchTerm, setSearchTerm] = useState("");

  const updateStatus = (id: string, newStatus: OrderStatus) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const filteredOrders = orders.filter(o => 
    o.ticket.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderColumn = (status: OrderStatus, title: string, colorClass: string) => {
    const columnOrders = filteredOrders.filter(o => o.status === status);
    
    return (
      <div className="flex flex-col h-full">
        <div className={`mb-4 flex items-center justify-between pb-2 border-b-2 ${colorClass}`}>
          <h3 className="font-bold text-white uppercase tracking-wider text-sm">{title}</h3>
          <span className="bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded-full font-bold">{columnOrders.length}</span>
        </div>
        
        <div className="flex-1 space-y-3 overflow-y-auto pr-2 pb-4 scrollbar-hide">
          {columnOrders.map(order => (
            <div key={order.id} className="glass-card p-4 hover:border-primary/50 transition-colors group cursor-grab active:cursor-grabbing border border-white/5">
              <div className="flex justify-between items-start mb-2">
                <span className="text-primary font-bold font-mono bg-primary/10 px-2 py-0.5 rounded-md text-sm">{order.ticket}</span>
                <span className="text-white/40 text-xs">{order.date}</span>
              </div>
              
              <h4 className="text-white font-medium mb-1 line-clamp-1">{order.customerName}</h4>
              
              <div className="flex items-center gap-4 text-xs text-white/50 mb-4">
                 <span className="flex items-center gap-1"><PackageSearch size={14}/> {order.items} prendas</span>
                 <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-white/70">S/ {order.total.toFixed(2)}</span>
              </div>

              {/* Status Action Buttons */}
              <div className="flex gap-2 mt-2 pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                 {status === 'LISTO' && (
                   <button onClick={() => updateStatus(order.id, 'ENTREGADO')} className="flex-1 bg-primary/20 text-primary hover:bg-primary/30 py-1.5 rounded text-xs font-bold transition-colors">
                     Entregar
                   </button>
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
    </div>
  );
}
