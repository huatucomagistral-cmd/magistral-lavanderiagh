"use client";

import { use, useState, useEffect } from "react";
import { Search, ChevronRight, Package, CheckCircle, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  paymentStatus: string;
} | null;

export default function StorefrontPage({ params }: PublicPageProps) {
  // En Next.js 16 "use" para desempaquetar las Promesas de params en SSR/Client
  const { storeSlug } = use(params);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<TicketResult>(null);

  // Growth & SaaS
  const [services, setServices] = useState<any[]>([]);
  const [calcItems, setCalcItems] = useState<Record<string, number>>({});
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const storeQ = query(collection(db, "stores"), where("slug", "==", storeSlug.toLowerCase()));
        const storeSnap = await getDocs(storeQ);
        if (!storeSnap.empty) {
          const id = storeSnap.docs[0].id;
          setStoreId(id);
          
          // Fetch services
          const servSnap = await getDocs(collection(db, `stores/${id}/services`));
          setServices(servSnap.docs.map(d => ({id: d.id, ...d.data()})));
        }
      } catch (e) {
        console.error("Error fetching store", e);
      }
    };
    fetchStore();
  }, [storeSlug]);

  // Helper para buscar por número de ticket (T-XXXX) en el campo ticketNumber
  const executeSearch = async (queryTicket: string) => {
    if (!queryTicket) return;
    setIsSearching(true);
    setResult(null);

    const normalized = queryTicket.trim().toUpperCase();

    try {
      let realStoreId = storeId;
      if (!realStoreId) {
         const storeQ = query(collection(db, "stores"), where("slug", "==", storeSlug.toLowerCase()));
         const storeSnap = await getDocs(storeQ);
         if (storeSnap.empty) {
           alert("La tienda configurada no existe.");
           setIsSearching(false);
           return;
         }
         realStoreId = storeSnap.docs[0].id;
      }

      // 2. Buscar por el campo ticketNumber usando el ID de la tienda encontrado
      const q = query(
        collection(db, `stores/${realStoreId}/orders`),
        where("ticketNumber", "==", normalized)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        setResult({
          ticket: data.ticketNumber,
          rawTicket: docSnap.id,   // ID real de Firestore para el link de Yape
          status: data.status as TrackStatus,
          items: data.items?.length || 0,
          total: data.total,
          date: new Date(data.date).toLocaleString(),
          paymentStatus: data.paymentStatus || "UNPAID",
        } as any);
      } else {
        alert(`El ticket "${normalized}" no fue encontrado. Verifica el número e intenta de nuevo.`);
      }
    } catch (e) {
      console.error(e);
      alert("Error buscando el ticket. Intenta nuevamente.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  // Buscar auto-mágicamente si venimos de la emisión (QR scan)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tick = params.get('ticket');
      if (tick) {
        setSearchQuery(tick);
        executeSearch(tick);
      }
    }
  }, []);

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
            placeholder="Nº de Ticket (ej. 260401-015)"
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

             {/* CTA Pago (Si no está pagado ni en verificación) */}
             {result.paymentStatus === 'UNPAID' && (
               <div className="mt-8 pt-6 border-t border-dashed border-white/20 text-center relative z-10">
                  <h3 className="text-lg font-bold text-white mb-2">
                    {result.status === 'LISTO' ? '¡Tu ropa ya está lista! ✨' : 'Adelanta tu pago ✨'}
                  </h3>
                  <p className="text-sm text-white/60 mb-6">Paga ahora con Yape y ahorra tiempo al recoger tu orden en la sucursal.</p>
                  
                  <Link href={`/${storeSlug}/yape/${(result as any).rawTicket}`} className="bg-[#742284] hover:bg-[#742284]/80 active:scale-95 text-white w-full sm:w-auto px-8 mx-auto font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#742284]/20">
                    Ir a Pago con Yape <ChevronRight size={18} />
                  </Link>
               </div>
             )}

             {result.paymentStatus === 'PENDING_VERIFICATION' && (
                <div className="mt-8 pt-6 border-t border-dashed border-white/10 text-center relative z-10">
                  <p className="text-sm text-primary flex items-center justify-center gap-2 font-bold animate-pulse">
                     <Clock size={16} /> Pago en verificación por el administrador...
                  </p>
                </div>
             )}

             {result.paymentStatus === 'PAID' && (
                <div className="mt-8 pt-6 border-t border-dashed border-white/10 text-center relative z-10">
                  <p className="text-sm text-success flex items-center justify-center gap-2 font-bold">
                     <CheckCircle size={16} /> Pedido Pagado Correctamente
                  </p>
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

      {/* Tarifario y Calculadora */}
      <section className="mt-8">
        <div className="flex justify-between items-end mb-6">
           <div>
             <h2 className="text-2xl font-bold text-white mb-2">Tarifario de Servicios</h2>
             <p className="text-white/50 text-sm">Precios transparentes. Calcula tu presupuesto fácilmente.</p>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Slider de Servicios */}
           <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {services.map(s => (
                 <div key={s.id} className="glass-card p-4 flex flex-col relative group cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setCalcItems(prev => ({...prev, [s.id]: (prev[s.id] || 0) + 1}))}>
                    <div className="flex-1 mb-4">
                      <h3 className="text-white font-bold leading-tight line-clamp-2 text-sm">{s.name}</h3>
                      <p className="font-mono text-primary font-bold mt-1 text-sm">S/ {Number(s.price).toFixed(2)} <span className="text-[10px] text-white/30">/{s.type}</span></p>
                    </div>
                    <button className="bg-white/5 hover:bg-primary/20 text-white rounded-lg py-2 text-xs font-bold w-full transition-colors flex items-center justify-center gap-1">
                      <Plus size={14} /> Añadir a cálculo
                    </button>
                 </div>
              ))}
              {services.length === 0 && (
                 <div className="col-span-2 sm:col-span-3 text-center py-10 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-white/50 text-sm">No hay servicios configurados aún.</p>
                 </div>
              )}
           </div>

           {/* Calculadora Flotante */}
           <div className="lg:col-span-1">
              <div className="glass-card p-6 sticky top-24 border-primary/20 bg-gradient-to-br from-surface to-primary/5 shadow-2xl">
                 <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-4">
                   <Clock size={18} className="text-primary" /> Mi Presupuesto
                 </h3>
                 
                 {Object.keys(calcItems).length === 0 ? (
                    <div className="text-center py-8">
                       <Package size={32} className="text-white/10 mx-auto mb-2" />
                       <p className="text-sm text-white/30">Toca "Añadir a cálculo" para estimar tu total.</p>
                    </div>
                 ) : (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                       {Object.keys(calcItems).map(id => {
                          const s = services.find(x => x.id === id);
                          if (!s) return null;
                          const qty = calcItems[id];
                          return (
                             <div key={id} className="flex justify-between items-center bg-black/20 rounded-lg p-2">
                                <div className="flex-1">
                                   <p className="text-xs font-bold text-white line-clamp-1">{s.name}</p>
                                   <p className="text-[10px] text-primary">S/ {(s.price * qty).toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1">
                                   <button className="text-white/50 hover:text-white" onClick={() => setCalcItems(prev => {
                                      const n = {...prev};
                                      if (n[id] > 1) n[id]--; else delete n[id];
                                      return n;
                                   })}>-</button>
                                   <span className="text-xs text-white font-bold w-4 text-center">{qty}</span>
                                   <button className="text-white/50 hover:text-white" onClick={() => setCalcItems(prev => ({...prev, [id]: prev[id] + 1}))}>+</button>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 )}

                 {Object.keys(calcItems).length > 0 && (
                    <div className="mt-6 pt-4 border-t border-dashed border-white/10">
                       <div className="flex justify-between items-end mb-4">
                          <span className="text-white/60 text-sm">Total estimado</span>
                          <span className="text-2xl font-bold text-white">
                             S/ {Object.keys(calcItems).reduce((acc, id) => {
                                const s = services.find(x => x.id === id);
                                return acc + (s ? s.price * calcItems[id] : 0);
                             }, 0).toFixed(2)}
                          </span>
                       </div>
                       <button className="w-full text-xs text-white/30 hover:text-white/80 transition-colors underline" onClick={() => setCalcItems({})}>
                          Limpiar cálculo
                       </button>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </section>

    </div>
  );
}
