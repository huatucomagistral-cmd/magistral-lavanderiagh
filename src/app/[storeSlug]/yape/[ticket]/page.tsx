"use client";

import { use, useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, UploadCloud, Info, Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export default function YapePaymentPage({
  params,
}: {
  params: Promise<{ storeSlug: string; ticket: string }>;
}) {
  const { storeSlug, ticket } = use(params);

  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState({ 
    name: "Cargando...", 
    yapeNumber: "999888777", 
    yapeName: "Lavandería Magistral" 
  });
  const [order, setOrder] = useState<any>(null);
  
  const [copied, setCopied] = useState(false);
  const [opCode, setOpCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Cargar datos reales de la tienda y el pedido
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar Tienda
        const storeSnap = await getDoc(doc(db, "stores", "demo-store"));
        if (storeSnap.exists()) {
          const s = storeSnap.data();
          setStore({
            name: s.storeName || "Lavandería Magistral",
            yapeNumber: s.yapeNumber || "999888777",
            yapeName: s.yapeName || "Magistral S.A.C. (Caja)"
          });
        }

        // Cargar Pedido
        const orderSnap = await getDoc(doc(db, "stores/demo-store/orders", ticket));
        if (orderSnap.exists()) {
          setOrder(orderSnap.data());
        } else {
          alert("No encontramos ese pedido en nuestro sistema.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ticket]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !opCode || !order) return alert("Completa todos los campos");
    
    setIsSubmitting(true);
    try {
      // 1. Subir a Firebase Storage
      const extension = file.name.split('.').pop();
      const fileName = `${ticket}_${Date.now()}.${extension}`;
      const storageRef = ref(storage, `stores/demo-store/vouchers/${fileName}`);
      
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // 2. Actualizar el pedido en Firestore
      await updateDoc(doc(db, "stores/demo-store/orders", ticket), {
        opCode,
        voucherUrl: downloadURL,
        paymentStatus: "PENDING_VERIFICATION",
        paymentMethod: "YAPE"
      });

      setIsDone(true);
    } catch (error) {
      console.error(error);
      alert("Error al subir el comprobante. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-white/60">Cargando datos de pago...</p>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500 text-center">
         <div className="w-24 h-24 mb-6 text-success animate-bounce bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={56} />
         </div>
         <h1 className="text-3xl font-black text-white mb-4">Comprobante Enviado</h1>
         <p className="text-white/60 max-w-sm mb-8">
           Recibimos tu voucher. El administrador validará el pago en unos minutos y el status pasará a "PAGADO" en el portal de rastreo.
         </p>
         <Link href={`/${storeSlug}`} className="bg-primary hover:bg-primary/80 active:scale-95 px-8 flex font-bold py-4 text-white rounded-xl transition-all">
           Volver al Rastreo
         </Link>
      </div>
    );
  }

  const total = order?.total || 0;

  return (
    <div className="animate-in fade-in duration-500 pb-12 max-w-xl mx-auto mt-4 md:mt-8">
      
      <Link href={`/${storeSlug}`} className="text-white/50 hover:text-white transition-colors flex items-center gap-2 font-medium mb-6 w-fit">
        <ArrowLeft size={18} /> Cancelar y Volver
      </Link>

      <div className="text-center mb-8">
         <div className="w-16 h-16 rounded-full bg-[#742284]/20 flex items-center justify-center mx-auto mb-4 text-[#742284]">
           <span className="font-black text-2xl font-mono">Y</span>
         </div>
         <h1 className="text-2xl font-bold text-white mb-2">Paga tu Ticket {order?.ticketNumber || "..."}</h1>
         <p className="text-white/60">Escanea el código QR desde tu app Yape o Plin.</p>
      </div>

      <div className="glass-card p-0 overflow-hidden border-[#742284]/30 shadow-2xl shadow-[#742284]/10">
         
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

         <div className="p-6 md:p-8 bg-surface border-t border-white/5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">Sube tu evidencia <Info size={16} className="text-white/40"/></h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                 <label className="block text-xs font-bold uppercase text-white/50 mb-2">Código de Operación (Yape/Plin)</label>
                 <input type="text" value={opCode} onChange={e => setOpCode(e.target.value.replace(/[^0-9]/g, ''))} maxLength={10} required placeholder="Ej: 123456"
                   className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#742284]/50"
                 />
              </div>

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
