"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Printer, ArrowLeft, Copy, Share2, Loader2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStore } from "@/store/useStore";
import { toast } from "react-hot-toast";

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
  const [storeSlug, setStoreSlug] = useState<string>("");

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
        // Obtener el slug real de la tienda
        const storeDoc = await getDoc(doc(db, "stores", user.storeId));
        if (storeDoc.exists()) {
          setStoreSlug(storeDoc.data().slug || user.storeId);
        } else {
          setStoreSlug(user.storeId);
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
    const slug = storeSlug || user?.storeId;
    const trackingLink = `${baseUrl}/${slug}?ticket=${ticketData.ticketNumber || ticketId}`;
    
    // Si tienes el nombre del comercio en algun config global, genial. Aquí hardcodeo 'Lavandería Magistral' por el momento.
    const text = `Hola ${ticketData.customerName || ''}, gracias por confiar en Lavandería Magistral. Tu pedido #${ticketData.ticketNumber || ticketId.slice(0, 6).toUpperCase()} ha sido recibido.\n\nPuedes ver tu recibo digital y rastrear el estado de tus prendas en tiempo real aquí:\n${trackingLink}`;
    
    // Si existe el teléfono del cliente lo abrimos en su chat directo, si no, que elija el contacto
    const phone = ticketData.customerPhone ? ticketData.customerPhone.replace(/\D/g, '') : '';
    const encodedText = encodeURIComponent(text);
    
    // Usamos wa.me que abre WhatsApp en el fon (o WhatsApp Web si está en PC)
    const url = phone ? `https://wa.me/51${phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
    
    window.open(url, '_blank');
  };

  const handleCopyImage = () => {
    if (!ticketData) return;

    const W = 380;
    const PAD = 24;
    const LINE = 20;

    // Obtener instancia del QR para dibujarla
    const qrEl = document.querySelector("#ticket-content canvas") as HTMLCanvasElement;
    const QR_SIZE = qrEl ? 120 : 0;
    
    // Obtener imagen del logo o en su defecto solo texto
    // ── First pass: measure height ────────────────────────────────────────────
    const items: any[] = ticketData.items || [];
    const ticketNum = ticketData.ticketNumber || ticketId.slice(0, 8).toUpperCase();
    const isPaid = ticketData.paymentStatus === "PAID";
    const totalH =
      PAD +           
      60 +            // store name
      LINE * 2 +      // address + ruc
      16 +            // gap
      LINE * 4 +      // date/ticket/client/dni
      16 +            
      LINE +          // table header
      items.length * LINE +
      16 +            
      60 +            // status stamp
      LINE * 2 +      // total/pay
      32 +            // gap pre-QR
      (QR_SIZE > 0 ? QR_SIZE + 40 : 0) + // QR area
      LINE +          // footer
      PAD;            

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = totalH;
    const ctx = canvas.getContext("2d")!;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const setFont = (size: number, weight = "normal") => {
      ctx.font = `${weight} ${size}px 'Courier New', Courier, monospace`;
    };
    const dashed = (y: number) => {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
      ctx.setLineDash([]);
    };
    const solid = (y: number, lw = 2) => {
      ctx.strokeStyle = "#111";
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    };

    // ── Background ────────────────────────────────────────────────────────────
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, totalH);

    let y = PAD;

    // ── Header ────────────────────────────────────────────────────────────────
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    setFont(26, "900");
    ctx.fillText("LAVANDERÍA MAGISTRAL", W / 2, y + 24); y += 38;
    setFont(12, "bold");
    ctx.fillText("Av. Principal 123 - Sede Central", W / 2, y); y += LINE - 4;
    setFont(12);
    ctx.fillText("RUC: 20123456789", W / 2, y); y += LINE;
    dashed(y); y += 16;

    // ── Info block ────────────────────────────────────────────────────────────
    ctx.textAlign = "left";
    setFont(12, "bold");
    ctx.fillStyle = "#000";
    ctx.fillText(`FECHA: ${dateStr}`, PAD, y); y += LINE;
    
    // TICKET badge
    ctx.fillText("TICKET:", PAD, y);
    const tw = ctx.measureText("TICKET:").width;
    ctx.fillStyle = "#000";
    ctx.fillRect(PAD + tw + 6, y - 14, 110, LINE + 2);
    ctx.fillStyle = "#fff";
    setFont(14, "900");
    ctx.fillText(ticketNum, PAD + tw + 12, y + 2);
    y += LINE;
    
    ctx.fillStyle = "#000";
    setFont(12, "bold");
    ctx.fillText(`CLIENTE: ${ticketData.customerName || "Cliente"}`, PAD, y); y += LINE;
    if (ticketData.customerDni && ticketData.customerDni !== "0") {
      ctx.fillText(`DNI: ${ticketData.customerDni}`, PAD, y); y += LINE;
    }
    y += 4;
    solid(y); y += 6;

    // ── Table header ─────────────────────────────────────────────────────────
    setFont(11, "900");
    ctx.fillText("CANT DESC", PAD, y + LINE - 6);
    ctx.textAlign = "right";
    ctx.fillText("IMP", W - PAD, y + LINE - 6);
    y += LINE;
    solid(y, 1); y += 8;

    // ── Rows ─────────────────────────────────────────────────────────────────
    setFont(12, "bold");
    for (const ci of items) {
      const price = (ci.item.price * ci.qty).toFixed(2);
      ctx.textAlign = "left";
      ctx.fillText(`${ci.qty}`, PAD, y + LINE - 4);
      ctx.fillText(ci.item.name, PAD + 30, y + LINE - 4);
      ctx.textAlign = "right";
      ctx.fillText(price, W - PAD, y + LINE - 4);
      y += LINE;
    }
    y += 8;
    solid(y); y += 24;

    // ── Status stamp (Rotated) ───────────────────────────────────────────────
    const stampColor = isPaid ? "#16a34a" : "#dc2626";
    ctx.save();
    ctx.translate(W / 2, y + 15);
    ctx.rotate(-2 * Math.PI / 180);
    ctx.strokeStyle = stampColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(-120, -18, 240, 36);
    setFont(20, "900");
    ctx.fillStyle = stampColor;
    ctx.textAlign = "center";
    ctx.fillText(isPaid ? "CANCELADO" : "POR COBRAR", 0, 7);
    ctx.restore();
    y += 48;

    // ── Total ─────────────────────────────────────────────────────────────────
    ctx.textAlign = "right";
    setFont(16, "900");
    ctx.fillStyle = "#000";
    ctx.fillText(`TOTAL: S/ ${Number(ticketData.total).toFixed(2)}`, W - PAD, y); y += LINE;
    setFont(10, "bold");
    const payLabel = ticketData.payMethod === "LUEGO" ? "PENDIENTE (Al recoger)" : ticketData.payMethod;
    ctx.fillText(`Medio de Pago: ${payLabel}`, W - PAD, y); y += LINE + 4;

    dashed(y); y += 24;

    // ── QR Code ──────────────────────────────────────────────────────────────
    if (qrEl) {
      ctx.textAlign = "center";
      setFont(10, "bold");
      ctx.fillText("ESCANEA PARA RASTREAR TU PEDIDO", W / 2, y);
      y += 10;
      ctx.drawImage(qrEl, W / 2 - 60, y, 120, 120);
      y += 140;
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    ctx.textAlign = "center";
    setFont(10);
    ctx.fillStyle = "#333";
    ctx.fillText("¡Gracias por su preferencia!", W / 2, y);
    y += 12;
    setFont(9);
    ctx.fillText("Sistemas Magistral - SaaS", W / 2, y);

    // ── Copy to Clipboard ───────────────────────────────────────────────────
    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error("Error al generar la imagen del ticket.");
        return;
      }
      try {
        await navigator.clipboard.write([
          new window.ClipboardItem({ "image/png": blob }),
        ]);
        toast.success("✅ Ticket copiado al portapapeles. (Usa Ctrl+V para pegar en WhatsApp o Telegram)");
      } catch (err) {
        console.error("Clipboard error:", err);
        // Fallback a descarga si el navegador bloquea el portapapeles (ej. algunos móviles)
        const fileName = `Ticket-${ticketNum}.png`;
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast("⚠️ Tu navegador no permite copiar. El ticket se ha descargado como alternativa.");
      }
    }, "image/png");
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
            <QRCodeCanvas value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/${storeSlug || user?.storeId}?ticket=${ticketData.ticketNumber || ticketId}`} size={100} level="M" />
            <p className="text-[10px] mt-3 font-semibold">¡Gracias por su preferencia!</p>
            <p className="text-[9px] mt-1">Sistemas Magistral - SaaS</p>
         </div>

         {/* Corte dentado bottom */}
         <div className="absolute -bottom-1 left-0 w-full h-2 bg-background flex print:hidden" style={{ backgroundImage: "radial-gradient(circle, #09090b 4px, transparent 5px)", backgroundSize: "10px 10px" }} />
      </div>

    </div>
  );
}
