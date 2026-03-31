"use client";

import { useState } from "react";
import { Save, UploadCloud } from "lucide-react";

export default function ConfigPage() {
  const [storeName, setStoreName] = useState("Lavandería Sol");
  const [slug, setSlug] = useState("lavanderia-sol");
  const [color, setColor] = useState("#3b82f6");
  const [yapeNumber, setYapeNumber] = useState("987654321");
  const [yapeName, setYapeName] = useState("Juan Perez");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Aquí conectaremos con Firestore updateDoc a la colección "stores"
    setTimeout(() => {
      setIsLoading(false);
      alert("Configuración Guardada exitosamente (Mock)");
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Configuración de Tienda</h1>
        <p className="text-white/60">Actualiza los datos públicos y métodos de pago de tu lavandería.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
          
          {/* Datos Generales */}
          <section className="glass-card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Datos Generales</h2>
            
            <div className="flex flex-col md:flex-row gap-6">
               <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center shrink-0 hover:bg-white/10 transition-colors cursor-pointer group">
                  <UploadCloud className="text-white/50 group-hover:text-primary transition-colors" size={24} />
                  <span className="text-xs text-white/50 mt-2 font-medium">Subir Logo</span>
               </div>
               
               <div className="flex-1 space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-white/70 mb-1">Nombre Comercial</label>
                   <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} required
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                   />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-white/70 mb-1">URL Pública (Slug)</label>
                     <div className="flex items-center">
                       <span className="bg-white/5 border border-white/10 border-r-0 rounded-l-xl px-3 py-2.5 text-white/40 text-sm">/</span>
                       <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                         className="flex-1 bg-white/5 border border-white/10 rounded-r-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                       />
                     </div>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-white/70 mb-1">Color Principal</label>
                     <div className="flex items-center gap-3">
                       <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                         className="w-10 h-10 rounded-xl bg-transparent border-0 p-0 cursor-pointer"
                       />
                       <span className="text-white/50 text-sm uppercase font-mono">{color}</span>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </section>

          {/* Pagos por Yape */}
          <section className="glass-card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Configuración de Pagos (Yape/Plin)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-medium text-white/70 mb-1">Número Destino</label>
                   <input type="tel" value={yapeNumber} onChange={(e) => setYapeNumber(e.target.value)} required
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#742284]"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-white/70 mb-1">Nombre del Titular</label>
                   <input type="text" value={yapeName} onChange={(e) => setYapeName(e.target.value)} required
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#742284]"
                   />
                 </div>
            </div>
            <p className="text-xs text-warning/80 bg-warning/10 p-3 rounded-lg border border-warning/20">
              Estos datos se usarán para generar automáticamente el Código QR de cobro que verán tus clientes en su portal web.
            </p>
          </section>

          <div className="flex justify-end">
             <button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary-hover active:scale-95 transition-all text-white font-semibold rounded-xl px-6 py-3 flex items-center gap-2">
               {isLoading ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" /> : <Save size={20} />}
               <span>Guardar Cambios</span>
             </button>
          </div>
        </form>

        {/* Preview Panel */}
        <div className="lg:col-span-1 hidden lg:block">
           <div className="glass-card p-6 sticky top-24">
             <h3 className="text-white font-medium mb-4 text-center">Vista Previa (Tema)</h3>
             <div className="aspect-[9/16] bg-black rounded-3xl border-[6px] border-white/10 overflow-hidden relative shadow-2xl">
                {/* Header Mock */}
                <div className="h-16 flex items-center justify-between px-4 z-10 relative" style={{ background: `linear-gradient(135deg, ${color}, #0a0a0a)` }}>
                   <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-xs">L</div>
                   <span className="text-white font-bold text-sm">{storeName || 'Tienda'}</span>
                </div>
                {/* Body Mock */}
                <div className="p-4 relative">
                   <div className="absolute top-0 right-[-50px] w-32 h-32 blur-[40px] opacity-30 rounded-full pointer-events-none" style={{ backgroundColor: color }} />
                   <div className="h-6 w-3/4 bg-white/10 rounded mb-4" />
                   <div className="h-20 w-full bg-white/5 rounded-xl border border-white/5 mb-2" />
                   <div className="h-20 w-full bg-white/5 rounded-xl border border-white/5" />
                   
                   <div className="mt-8 mx-auto w-24 h-24 bg-white rounded-xl flex items-center justify-center p-2">
                      <div className="w-full h-full bg-[#742284]/20 rounded-lg border border-[#742284]/30" />
                   </div>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
