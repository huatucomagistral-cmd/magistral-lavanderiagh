"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Printer, ArrowLeft, Copy, Share2, Loader2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStore } from "@/store/useStore";

export default function TicketViewPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);
  const { user } = useStore();
  const [ticketData, setTicketData] = useState<any>(null);
  const [dateStr, setDateStr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTicket() {
      if (!user?.storeId) return;
      try {
        const d = await getDoc(doc(db, `stores/${user.storeId}/orders`, ticketId));
        if (d.exists()) {
          setTicketData(d.data());
          // Formatearemos la fecha en base al guardado
          const date = new Date(d.data().date);
          setDateStr(date.toLocaleString());
        }
      } catch (e) {
        console.error("Error reading ticket", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTicket();
  }, [ticketId]);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    if (!ticketData) return;
    
    // Crear el link de rastreo
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const trackingLink = `${baseUrl}/${user?.storeId}?ticket=${ticketData.ticketNumber || ticketId}`;
    
    // Si tienes el nombre del comercio en algun config global, genial. Aquí hardcodeo 'Lavandería Magistral' por el momento.
    const text = `Hola ${ticketData.customerName || ''}, gracias por confiar en Lavandería Magistral. Tu pedido #${ticketData.ticketNumber || ticketId.slice(0, 6).toUpperCase()} ha sido recibido.\n\nPuedes ver tu recibo digital y rastrear el estado de tus prendas en tiempo real aquí:\n${trackingLink}`;
    
    // Si existe el teléfono del cliente lo abrimos en su chat directo, si no, que elija el contacto
    const phone = ticketData.customerPhone ? ticketData.customerPhone.replace(/\D/g, '') : '';
    const encodedText = encodeURIComponent(text);
    
    // Usamos wa.me que abre WhatsApp en el fon (o WhatsApp Web si está en PC)
    const url = phone ? `https://wa.me/51${phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
    
    window.open(url, '_blank');
  };

  const handleCopyImage = async () => {
    const element = document.getElementById("ticket-content");
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true,
        backgroundColor: "#ffffff"
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("No se pudo generar la imagen.");
        try {
          await navigator.clipboard.write([
            new window.ClipboardItem({ "image/png": blob })
          ]);
          alert("✅ Imagen copiada al portapapeles. ¡Ahora puedes presionar Ctrl+V en WhatsApp!");
        } catch (clipboardErr: any) {
          console.error("Error del portapapeles:", clipboardErr);
          alert("No se pudo copiar automáticamente (el navegador puede estar bloqueándolo). Se descargará la imagen como alternativa.");
          // Fallback a descarga si el portapapeles falla
          const image = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = image;
          link.download = `Ticket-${ticketData.ticketNumber || ticketId.slice(0,6).toUpperCase()}.png`;
          link.click();
        }
      }, "image/png");

    } catch (e) {
      console.error("Error al generar la captura:", e);
      alert("Hubo un error al generar la imagen. Inténtelo de nuevo.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-white/50">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p>Generando Ticket Electrónico...</p>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-white/50">
        <p>El ticket {ticketId} no existe o fue eliminado.</p>
        <Link href="/admin/pedidos" className="mt-4 text-primary underline">Volver al Kanban</Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-12 flex flex-col md:flex-row gap-8 items-start justify-center">
      
      {/* Columna Acciones */}
      <div className="flex flex-col gap-4 w-full md:w-64 shrink-0 print:hidden">
         <Link href="/admin/pedidos" className="text-white/50 hover:text-white transition-colors flex items-center gap-2 font-medium mb-4 w-fit">
           <ArrowLeft size={18} /> Volver a Pedidos
         </Link>

         <div className="glass-card p-6 flex flex-col gap-3">
            <h2 className="text-white font-bold mb-2">Acciones de Emisión</h2>
            <button onClick={handlePrint} className="bg-primary hover:bg-primary-hover active:scale-95 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
               <Printer size={18} /> Imprimir (80mm)
            </button>
            <button onClick={handleCopyImage} className="bg-white/5 hover:bg-white/10 active:scale-95 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10">
               <Copy size={18} /> Copiar Imagen
            </button>
            <button onClick={handleWhatsApp} className="bg-success/20 hover:bg-success/30 active:scale-95 text-success font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-success/30">
               <Share2 size={18} /> Mandar por WhatsApp
            </button>
         </div>
      </div>

      {/* Papel del Ticket Físico (Termal) */}
      <div id="ticket-content" className="ticket-print-area bg-white text-black p-6 w-full max-w-[320px] shadow-2xl mx-auto md:mx-0 font-mono text-sm relative print:shadow-none print:m-0 print:p-0">
         
         {/* Corte dentado (decorativo web) */}
         <div className="absolute -top-1 left-0 w-full h-2 bg-background flex print:hidden" style={{ backgroundImage: "radial-gradient(circle, #09090b 4px, transparent 5px)", backgroundSize: "10px 10px" }} />
         
         <div className="text-center mb-6 border-b-2 border-dashed border-black/30 pb-4">
            <h1 className="text-2xl font-black uppercase leading-none mb-2">Lavandería Magistral</h1>
            <p className="text-xs font-semibold">Av. Principal 123 - Sede Central</p>
            <p className="text-xs">RUC: 20123456789</p>
         </div>

         <div className="mb-4 text-xs font-bold leading-relaxed space-y-1">
            <p>FECHA: {dateStr}</p>
            <p>TICKET: <span className="text-lg bg-black text-white px-2 py-0.5 ml-1">{ticketData.ticketNumber || ticketId.slice(0, 6).toUpperCase()}</span></p>
            <p>CLIENTE: {ticketData.customerName || "Cliente"}</p>
            {ticketData.customerDni && ticketData.customerDni !== "0" && <p>DNI: {ticketData.customerDni}</p>}
         </div>

         <table className="w-full text-xs font-bold mb-4 border-t-2 border-b-2 border-black py-2">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left pb-1 pt-2">CANT</th>
                <th className="text-left pb-1 pt-2">DESC</th>
                <th className="text-right pb-1 pt-2">IMP</th>
              </tr>
            </thead>
            <tbody>
              {ticketData.items?.map((cartItem: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-1 align-top">{cartItem.qty}</td>
                  <td className="py-1 align-top pr-1">{cartItem.item.name}</td>
                  <td className="text-right py-1 align-top">{(cartItem.item.price * cartItem.qty).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
         </table>

         <div className={`my-4 border-4 p-2 text-center font-black text-xl uppercase tracking-widest -rotate-2 ${ticketData.paymentStatus === 'PAID' ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}`}>
            {ticketData.paymentStatus === 'PAID' ? 'CANCELADO' : 'POR COBRAR'}
         </div>

         <div className="text-right mb-6 text-sm">
           <p className="font-black text-base">TOTAL: S/ {Number(ticketData.total).toFixed(2)}</p>
           <p className="text-[10px] mt-1">Medio de Pago: {ticketData.payMethod === 'LUEGO' ? 'PENDIENTE (Al recoger)' : ticketData.payMethod}</p>
         </div>

         <div className="flex flex-col items-center justify-center text-center mt-6 pt-6 border-t-2 border-dashed border-black/30">
            <p className="text-[10px] font-bold mb-2 uppercase">Escanea para rastrear tu pedido</p>
            <QRCodeCanvas value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/${user?.storeId}?ticket=${ticketData.ticketNumber || ticketId}`} size={100} level="M" />
            <p className="text-[10px] mt-3 font-semibold">¡Gracias por su preferencia!</p>
            <p className="text-[9px] mt-1">Sistemas Magistral - SaaS</p>
         </div>

         {/* Corte dentado bottom */}
         <div className="absolute -bottom-1 left-0 w-full h-2 bg-background flex print:hidden" style={{ backgroundImage: "radial-gradient(circle, #09090b 4px, transparent 5px)", backgroundSize: "10px 10px" }} />
      </div>

    </div>
  );
}
