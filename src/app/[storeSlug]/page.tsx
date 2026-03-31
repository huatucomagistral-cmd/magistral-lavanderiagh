import { QrCode, Search, ChevronRight } from "lucide-react";
import Link from "next/link";

interface PublicPageProps {
  params: Promise<{ storeSlug: string }>;
}

export default async function StorefrontPage({ params }: PublicPageProps) {
  const { storeSlug } = await params;
  
  // En producción extraemos nombre y color del backend usando storeSlug
  const storeName = "Lavandería Magistral";

  return (
    <div className="flex flex-col gap-10 animate-in slide-in-from-bottom-6 fade-in duration-700">
      
      {/* Hero Section */}
      <section className="text-center py-12 px-4 rounded-3xl glass relative overflow-hidden flex flex-col items-center border border-white/10">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 z-10">
          ¿En qué estado está tu <span className="text-gradient">ropa</span>?
        </h1>
        <p className="text-lg text-white/60 mb-8 max-w-lg mx-auto z-10">
          Ingresa el número de tu ticket para rastrear el proceso de lavado y secado en tiempo real.
        </p>

        {/* Búsqueda de Ticket */}
        <div className="w-full max-w-md bg-black/50 backdrop-blur-md rounded-2xl p-2 flex items-center border border-white/10 mx-auto z-10 shadow-2xl relative">
          <input 
            type="text"
            placeholder="Nº de Ticket (ej. T-0024)"
            className="flex-1 bg-transparent border-none appearance-none focus:outline-none focus:ring-0 text-white placeholder:text-white/30 px-4 py-2"
          />
          <button className="bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl px-6 py-3 transition-colors flex items-center gap-2">
            <Search size={18} />
            <span className="hidden sm:inline">Rastrear</span>
          </button>
        </div>
      </section>

      {/* Servicios Rápidos (Catálogo Visual) */}
      <section>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-white">Nuestros Servicios</h2>
          <Link href={`/${storeSlug}/catalogo`} className="text-primary hover:text-white transition-colors text-sm font-medium flex items-center gap-1 group">
            Ver catálogo completo <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ServiceCard title="Lavado por Kilo" price="S/ 6.00" />
          <ServiceCard title="Edredones" price="S/ 25.00" />
          <ServiceCard title="Ternos (Seco)" price="S/ 35.00" />
          <ServiceCard title="Zapatillas" price="S/ 15.00" />
        </div>
      </section>

      {/* Pago por Yape CTA */}
      <section className="glass-card flex flex-col md:flex-row items-center justify-between p-8 gap-6 border-primary/20 bg-gradient-to-br from-surface/40 to-primary/10">
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-2xl font-bold text-white mb-2">Paga rápido con Yape</h3>
          <p className="text-white/60 mb-6 max-w-sm">Si ya recibiste el aviso de que tu ropa está lista, paga sin hacer colas enviando tu comprobante aquí.</p>
          <button className="glass-button bg-[#742284]/80 hover:bg-[#742284] px-6 py-3 font-semibold text-white inline-flex items-center gap-2">
             Subir Comprobante <ChevronRight size={18} />
          </button>
        </div>
        <div className="w-32 h-32 rounded-3xl bg-white flex items-center justify-center rotate-3 shadow-2xl shrink-0 p-4">
           {/* Mockup del QR (usaríamos qrcode.react aquí) */}
           <QrCode className="text-[#742284]" size={80} />
        </div>
      </section>

    </div>
  );
}

function ServiceCard({ title, price }: { title: string; price: string }) {
  return (
    <div className="glass-card aspect-square p-6 flex flex-col justify-end relative group hover:-translate-y-1 transition-transform">
      <div className="w-12 h-12 rounded-full bg-white/5 absolute top-4 right-4 flex items-center justify-center">
        {/* Placeholder para ícono svg */}
        <span className="text-white/50 text-xs">IMG</span>
      </div>
      <div>
        <h3 className="text-white font-bold leading-tight mb-1 group-hover:text-primary transition-colors">{title}</h3>
        <p className="font-mono text-white/50">{price}</p>
      </div>
    </div>
  );
}
