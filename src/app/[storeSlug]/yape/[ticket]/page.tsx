"use client";

import { use, useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, UploadCloud, Info, Copy, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
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
    id: "",
    name: "Cargando...", 
    yapeNumber: "", 
    yapeName: "",
    yapeQrUrl: ""
  });
  const [order, setOrder] = useState<any>(null);
  
  const [copied, setCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Cargar datos reales de la tienda y el pedido
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Encontrar el verdadero ID del documento de la tienda buscando por slug
        const storeQ = query(collection(db, "stores"), where("slug", "==", storeSlug.toLowerCase()));
        const storeSnap = await getDocs(storeQ);
        
        if (storeSnap.empty) {
          toast.error("La tienda no existe.");
          setLoading(false);
          return;
        }

        const realStoreId = storeSnap.docs[0].id;
        const s = storeSnap.docs[0].data();

        setStore({
          id: realStoreId,
          name: s.storeName || "Nuestra Lavandería",
          yapeNumber: s.yapeNumber || "999888777",
          yapeName: s.yapeName || "",
          yapeQrUrl: s.yapeQrUrl || ""
        });

        // Cargar Orden
        const orderSnap = await getDoc(doc(db, `stores/${realStoreId}/orders`, ticket));
        if (orderSnap.exists()) {
          setOrder(orderSnap.data());
        } else {
          toast.error("No encontramos esa orden en nuestro sistema.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ticket, storeSlug]);

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
    if (!file || !order) return toast.error("Por favor sube la captura de tu pago.");
    
    setIsSubmitting(true);
    try {
      if (!store.id) throw new Error("Store ID not found");

      // 1. Subir a Firebase Storage
      const extension = file.name.split('.').pop();
      const fileName = `${ticket}_${Date.now()}.${extension}`;
      const storageRef = ref(storage, `stores/${store.id}/vouchers/${fileName}`);
      
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // 2. Actualizar el pedido en Firestore
      await updateDoc(doc(db, `stores/${store.id}/orders`, ticket), {
        voucherUrl: downloadURL,
        paymentStatus: "PENDING_VERIFICATION",
        paymentMethod: "YAPE"
      });

      setIsDone(true);
    } catch (error) {
      console.error(error);
      toast.error("Error al subir el comprobante. Intenta de nuevo.");
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
         <h1 className="text-3xl font-black text-foreground mb-4">Comprobante Enviado</h1>
         <p className="text-foreground/60 max-w-sm mb-8">
           Recibimos tu voucher. El administrador validará el pago en unos minutos y el status pasará a "PAGADO" en el portal de rastreo.
         </p>
         <Link href={`/${storeSlug}`} className="bg-primary hover:bg-primary-hover active:scale-95 px-8 flex font-bold py-4 text-white rounded-xl transition-all shadow-lg shadow-primary/20">
           Volver al Rastreo
         </Link>
      </div>
    );
  }

  const total = order?.total || 0;

  return (
    <div className="animate-in fade-in duration-500 pb-12 max-w-xl mx-auto mt-4 md:mt-8">
      
      <Link href={`/${storeSlug}`} className="text-foreground/50 hover:text-foreground transition-colors flex items-center gap-2 font-medium mb-6 w-fit">
        <ArrowLeft size={18} /> Cancelar y Volver
      </Link>

      <div className="text-center mb-8 flex flex-col items-center">
         <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#742284] to-[#B03BBF] shadow-[0_0_30px_rgba(116,34,132,0.4)] flex items-center justify-center mx-auto mb-5 text-white">
           <span className="font-black text-3xl font-sans tracking-tighter shrink-0 pt-1">Y</span>
         </div>
         <h1 className="text-2xl font-bold text-foreground mb-2">Pago Segúro por Yape</h1>
         <p className="text-foreground/60 text-sm">Ticket <strong className="text-foreground">{order?.ticketNumber || "..."}</strong></p>
      </div>

      <div className="glass-card overflow-hidden shadow-2xl bg-white/80">
         
          <div className="p-8 pb-10 text-center flex flex-col items-center relative">
            
            {/* Soft glow behind the QR */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#742284]/10 blur-[80px] rounded-full pointer-events-none" />

            {store.yapeQrUrl ? (
               <div className="w-full max-w-[260px] rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(116,34,132,0.3)] mb-8 overflow-hidden border border-[#742284]/30 bg-[#742284] relative z-10 transition-transform hover:scale-[1.02] duration-500">
                 <img src={store.yapeQrUrl} alt="QR Yape Oficial" className="w-full h-auto object-cover" />
               </div>
            ) : (
               <div className="bg-white p-5 rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(116,34,132,0.3)] mb-8 relative z-10">
                 <QRCodeSVG 
                   value={`YAPE:${store.yapeNumber}?amount=${total}`} 
                   size={220}
                   fgColor="#742284"
                   level="Q"
                   marginSize={1}
                 />
               </div>
            )}
            
            <p className="text-5xl font-black text-primary font-sans tracking-tight mb-3">S/ {total.toFixed(2)}</p>
            {store.yapeName && <p className="text-lg text-foreground font-medium tracking-tight bg-black/5 px-4 py-1.5 rounded-full inline-block mb-1">{store.yapeName}</p>}
            
            {store.yapeNumber && (
              <button 
                onClick={handleCopy} 
                className="mt-5 bg-gradient-to-r from-[#742284] to-[#B03BBF] hover:shadow-[0_0_20px_rgba(116,34,132,0.4)] text-white px-8 py-3.5 rounded-full font-bold flex items-center gap-3 active:scale-95 transition-all border-0 shadow-lg"
              >
                 {copied ? "¡Número Copiado!" : store.yapeNumber} <Copy size={18} />
              </button>
            )}
            
            <p className="text-foreground/40 text-xs mt-6 font-medium">Escanea o copia el número desde tu App Yape</p>
          </div>

         <div className="p-8 bg-black/5 border-t border-black/5 relative z-10">
            <h3 className="text-foreground font-bold mb-5 flex items-center gap-2">Paso 2: Adjunta tu voucher <Info size={16} className="text-foreground/30"/></h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                 <label htmlFor="file-upload" className={`w-full border-2 ${file ? 'border-primary/50 bg-primary/5' : 'border-dashed border-black/10 hover:border-primary/50 bg-white/50'} rounded-2xl px-4 py-10 text-center cursor-pointer flex flex-col items-center justify-center transition-all group`}>
                   {file ? (
                     <CheckCircle size={32} className="text-primary mb-3" />
                   ) : (
                     <UploadCloud size={32} className="text-foreground/20 group-hover:text-primary mb-3 transition-colors" />
                   )}
                   <span className={`font-medium mb-1 ${file ? 'text-primary' : 'text-foreground/80'}`}>
                     {file ? file.name : "Toca para abrir galería"}
                   </span>
                   {!file && <span className="text-foreground/40 text-xs font-medium">Soporta PNG o JPG</span>}
                 </label>
                 <input id="file-upload" type="file" accept="image/png, image/jpeg, application/pdf" className="hidden" onChange={handleFileChange} />
              </div>

              <button type="submit" disabled={isSubmitting || !file} className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-20 mt-6 disabled:marker:pointer-events-none text-lg shadow-lg shadow-primary/20">
                {isSubmitting ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" /> : "Validar mi Pago"}
              </button>

            </form>
         </div>

      </div>
    </div>
  );
}
