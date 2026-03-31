"use client";

import { use, useState } from "react";
import { ArrowLeft, CheckCircle, UploadCloud, Info, Copy } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

export default function YapePaymentPage({
  params,
}: {
  params: Promise<{ storeSlug: string; ticket: string }>;
}) {
  const { storeSlug, ticket } = use(params);

  // Mocks del backend (En Fase de Integración vendrán de useStore / Firestore)
  const store = { name: "Lavandería Magistral", yapeNumber: "999888777", yapeName: "Magistral S.A.C." };
  const total = 22.00; // Mock

  const [copied, setCopied] = useState(false);
  const [opCode, setOpCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(store.yapeNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !opCode) return alert("Completa todos los campos");
    
    setIsSubmitting(true);
    // Simula subida a Firebase Storage y actualización del Documento del Pedido
    setTimeout(() => {
      setIsSubmitting(false);
      setIsDone(true);
    }, 1500);
  };

  if (isDone) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500 text-center">
         <div className="w-24 h-24 mb-6 text-success animate-bounce">
            <CheckCircle size={96} />
         </div>
         <h1 className="text-3xl font-black text-white mb-4">Comprobante Enviado</h1>
         <p className="text-white/60 max-w-sm mb-8">
           Nuestros cajeros están revisando tu pago. Si todo está correcto, el estado de tu pedido pasará a ser "PAGADO" y no harás cola al recogerlo.
         </p>
         <Link href={`/${storeSlug}`} className="bg-primary hover:bg-primary/80 active:scale-95 px-8 flex font-bold py-4 text-white rounded-xl transition-all">
           Volver al Rastreo
         </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-12 max-w-xl mx-auto mt-4 md:mt-8">
      
      <Link href={`/${storeSlug}`} className="text-white/50 hover:text-white transition-colors flex items-center gap-2 font-medium mb-6 w-fit">
        <ArrowLeft size={18} /> Cancelar y Volver
      </Link>

      <div className="text-center mb-8">
         <div className="w-16 h-16 rounded-full bg-[#742284]/20 flex items-center justify-center mx-auto mb-4 text-[#742284]">
           <span className="font-black text-2xl font-mono">Y</span>
         </div>
         <h1 className="text-2xl font-bold text-white mb-2">Paga tu Ticket {ticket}</h1>
         <p className="text-white/60">Abre tu app Yape o Plin y escanea el código para ahorrar tiempo.</p>
      </div>

      <div className="glass-card p-0 overflow-hidden border-[#742284]/30 shadow-2xl shadow-[#742284]/10">
         
         {/* Datos QR */}
         <div className="p-8 text-center bg-gradient-to-b from-surface to-background flex flex-col items-center">
            <div className="bg-white p-4 rounded-3xl shadow-lg mb-6 rotate-1 hover:rotate-0 transition-transform cursor-pointer">
              <QRCodeSVG 
                value={`YAPE:${store.yapeNumber}?amount=${total}`} 
                size={200}
                fgColor="#742284"
                level="Q"
                marginSize={1}
              />
            </div>
            
            <p className="text-3xl font-black text-primary font-mono mb-2">S/ {total.toFixed(2)}</p>
            <p className="text-sm text-white/50 font-medium">{store.yapeName}</p>
            
            <button onClick={handleCopy} className="mt-4 bg-[#742284]/10 hover:bg-[#742284]/20 text-[#742284] px-4 py-2 rounded-full font-bold flex items-center gap-2 active:scale-95 transition-all text-sm border border-[#742284]/30">
               {copied ? "¡Copiado!" : store.yapeNumber} <Copy size={14} />
            </button>
         </div>

         {/* Formulario de Subida */}
         <div className="p-6 md:p-8 bg-surface border-t border-white/5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">Sube tu evidencia <Info size={16} className="text-white/40"/></h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* OpCode */}
              <div>
                 <label className="block text-xs font-bold uppercase text-white/50 mb-2">Código de Operación (Yape/Plin)</label>
                 <input type="text" value={opCode} onChange={e => setOpCode(e.target.value.replace(/[^0-9]/g, ''))} maxLength={10} required placeholder="Ej: 123456"
                   className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#742284]/50"
                 />
              </div>

              {/* Archivo */}
              <div>
                 <label className="block text-xs font-bold uppercase text-white/50 mb-2">Comprobante de Pago</label>
                 
                 <label htmlFor="file-upload" className="w-full border-2 border-dashed border-white/10 hover:border-[#742284]/50 hover:bg-[#742284]/5 bg-black/20 rounded-xl px-4 py-8 text-center cursor-pointer flex flex-col items-center justify-center transition-all group">
                   <UploadCloud size={28} className="text-white/30 group-hover:text-[#742284] mb-3 transition-colors" />
                   <span className="text-white font-medium text-sm">
                     {file ? file.name : "Toca aquí para seleccionar captura"}
                   </span>
                   <span className="text-white/40 text-xs mt-1">Soporta PNG, JPG o PDF</span>
                 </label>
                 <input id="file-upload" type="file" accept="image/png, image/jpeg, application/pdf" className="hidden" onChange={handleFileChange} />
              </div>

              <button type="submit" disabled={isSubmitting || !opCode || !file} className="w-full bg-[#742284] hover:bg-[#742284]/80 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 mt-4 disabled:pointer-events-none">
                {isSubmitting ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" /> : "Enviar Comprobante"}
              </button>

            </form>
         </div>

      </div>
    </div>
  );
}
