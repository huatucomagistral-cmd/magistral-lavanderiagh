"use client";

import { use, useState } from "react";
import { Search, ChevronRight, Package, CheckCircle, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { QrCode } from "lucide-react";

interface PublicPageProps {
  params: Promise<{ storeSlug: string }>;
}

type TrackStatus = 'RECIBIDO' | 'EN_PROCESO' | 'LISTO' | 'ENTREGADO';

type TicketResult = {
  ticket: string;
  status: TrackStatus;
  items: number;
  total: number;
  date: string;
} | null;

export default function StorefrontPage({ params }: PublicPageProps) {
  // En Next.js 16 "use" para desempaquetar las Promesas de params en SSR/Client
  const { storeSlug } = use(params);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<TicketResult>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    setResult(null);

    // Mock Backend Search
    setTimeout(() => {
      setIsSearching(false);
      if (searchQuery.toUpperCase() === 'T-0045') {
        setResult({ ticket: "T-0045", status: "EN_PROCESO", items: 3, total: 15.00, date: "Hoy, 10:30 AM" });
      } else if (searchQuery.toUpperCase() === 'T-0043') {
        setResult({ ticket: "T-0043", status: "LISTO", items: 5, total: 22.00, date: "Ayer" });
      } else {
        alert("Ese ticket no existe o ya fue entregado.");
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-10 animate-in slide-in-from-bottom-6 fade-in duration-700 pb-10">
      
      {/* Hero Section & Search */}
      <section className="text-center py-12 px-4 rounded-3xl glass relative overflow-hidden flex flex-col items-center border border-white/10 mt-4 md:mt-8">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 z-10">
          ¿En qué estado está tu <span className="text-gradient">ropa</span>?
        </h1>
        <p className="text-lg text-white/60 mb-8 max-w-lg mx-auto z-10">
          Ingresa el número de tu ticket para rastrear el proceso de lavado, secado y planchado en tiempo real.
        </p>

        <form onSubmit={handleSearch} className="w-full max-w-md bg-black/50 backdrop-blur-md rounded-2xl p-2 flex items-center border border-white/10 mx-auto z-10 shadow-2xl relative transition-all focus-within:ring-2 focus-within:ring-primary/50">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nº de Ticket (ej. T-0045)"
            disabled={isSearching}
            className="flex-1 bg-transparent border-none appearance-none focus:outline-none focus:ring-0 text-white placeholder:text-white/30 px-4 py-3 uppercase"
          />
          <button type="submit" disabled={isSearching || !searchQuery} className="bg-primary hover:bg-primary-hover active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl px-6 py-3 transition-all flex items-center gap-2">
            {isSearching ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" /> : <Search size={18} />}
            <span className="hidden sm:inline">Rastrear</span>
          </button>
        </form>
      </section>

      {/* Resultado del Tracking */}
      {result && (
        <section className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="glass-card p-6 md:p-8 max-w-2xl mx-auto border-primary/30 relative overflow-hidden">
             
             {/* Decoración */}
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

             <div className="flex justify-between items-start mb-8 relative z-10">
               <div>
                  <h2 className="text-2xl font-bold text-white uppercase flex items-center gap-2">Ticket {result.ticket}</h2>
                  <p className="text-white/50 text-sm mt-1">Recibido: {result.date}</p>
               </div>
               <div className="text-right">
                  <span className="font-mono text-xl font-bold text-primary">S/ {result.total.toFixed(2)}</span>
                  <p className="text-white/50 text-xs mt-1">Total a pagar ({result.items} prendas)</p>
               </div>
             </div>

             {/* Tracking Visual */}
             <div className="relative mb-10 pt-4 z-10">
               <div className="absolute top-8 left-0 w-full h-1 bg-white/10 rounded-full">
                  <div className={`h-full bg-primary rounded-full transition-all duration-1000 ${result.status === 'RECIBIDO' ? 'w-1/4' : result.status === 'EN_PROCESO' ? 'w-1/2' : 'w-full'}`} />
               </div>

               <div className="flex justify-between relative mt-2">
                 <div className="flex flex-col items-center gap-2">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 bg-background transition-colors ${['RECIBIDO', 'EN_PROCESO', 'LISTO'].includes(result.status) ? 'border-primary text-primary' : 'border-white/20 text-white/30'}`}>
                      <Package size={20} />
                   </div>
                   <span className="text-xs font-bold text-white/70">Recibido</span>
                 </div>

                 <div className="flex flex-col items-center gap-2">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 bg-background transition-colors ${['EN_PROCESO', 'LISTO'].includes(result.status) ? 'border-primary text-primary' : 'border-white/20 text-white/30'}`}>
                      <Clock size={20} className={result.status === 'EN_PROCESO' ? 'animate-spin-slow' : ''} />
                   </div>
                   <span className="text-xs font-bold text-white/70">Lavando</span>
                 </div>

                 <div className="flex flex-col items-center gap-2">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 bg-background transition-colors ${result.status === 'LISTO' ? 'border-success text-success bg-success/10' : 'border-white/20 text-white/30'}`}>
                      <CheckCircle size={20} />
                   </div>
                   <span className="text-xs font-bold text-white/70">Listo 🙌</span>
                 </div>
               </div>
             </div>

             {/* CTA Pago (Solo si está LISTO) */}
             {result.status === 'LISTO' && (
               <div className="mt-8 pt-6 border-t border-dashed border-white/20 text-center relative z-10">
                  <h3 className="text-lg font-bold text-white mb-2">¡Turopa ya está lista y huelerico! ✨</h3>
                  <p className="text-sm text-white/60 mb-6">Paga ahora con Yape y ahorra tiempo al recoger tu orden en la sucursal.</p>
                  
                  <Link href={`/${storeSlug}/yape/${result.ticket}`} className="bg-[#742284] hover:bg-[#742284]/80 active:scale-95 text-white w-full sm:w-auto px-8 mx-auto font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#742284]/20">
                    Ir a Pago con Yape <ChevronRight size={18} />
                  </Link>
               </div>
             )}

             {result.status === 'EN_PROCESO' && (
                <div className="mt-8 pt-6 border-t border-dashed border-white/10 text-center relative z-10">
                  <p className="text-sm text-warning/80 flex items-center justify-center gap-2">
                     <Clock size={16} /> Estamos trabajando en tu pedido, te avisaremos cuando esté listo.
                  </p>
                </div>
             )}

          </div>
        </section>
      )}

      {/* Servicios Rápidos */}
      <section className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-6">Servicios Destacados</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ServiceCard title="Lavado por Kilo" price="S/ 6.00" />
          <ServiceCard title="Edredones" price="S/ 25.00" />
          <ServiceCard title="Ternos (Seco)" price="S/ 35.00" />
          <ServiceCard title="Zapatillas" price="S/ 15.00" />
        </div>
      </section>

    </div>
  );
}

function ServiceCard({ title, price }: { title: string; price: string }) {
  return (
    <div className="glass-card aspect-square p-6 flex flex-col justify-end relative group hover:-translate-y-1 transition-transform border border-white/5 hover:border-white/20 cursor-default">
      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-surface to-white/10 absolute top-4 right-4 flex items-center justify-center border border-white/5">
        <span className="text-white/30 text-[10px] font-bold">✨</span>
      </div>
      <div>
        <h3 className="text-white font-bold leading-tight mb-1 group-hover:text-primary transition-colors">{title}</h3>
        <p className="font-mono text-primary font-bold">{price}</p>
      </div>
    </div>
  );
}
