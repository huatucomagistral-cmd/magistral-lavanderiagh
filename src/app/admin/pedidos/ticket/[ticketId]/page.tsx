"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Printer, ArrowLeft, Copy, Share2, Loader2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
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

  const handleDownloadImage = () => {
    if (!ticketData) return;

    const W = 560;
    const PAD = 32;
    const LINE = 22;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const setFont = (size: number, weight = "normal") => {
      ctx.font = `${weight} ${size}px 'Courier New', Courier, monospace`;
    };
    const dashed = (y: number) => {
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
      ctx.setLineDash([]);
    };
    const solid = (y: number) => {
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    };
    const wrapText = (text: string, x: number, y: number, maxW: number, lh: number): number => {
      const words = text.split(" ");
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, x, y); y += lh; line = word;
        } else { line = test; }
      }
      if (line) { ctx.fillText(line, x, y); y += lh; }
      return y;
    };

    // ── First pass: measure height ────────────────────────────────────────────
    const items: any[] = ticketData.items || [];
    const ticketNum = ticketData.ticketNumber || ticketId.slice(0, 8).toUpperCase();
    const isPaid = ticketData.paymentStatus === "PAID";
    const totalH =
      PAD +           // top
      60 +            // store name
      LINE * 2 +      // address + ruc
      16 +            // gap
      LINE * 4 +      // date / ticket / client / dni
      16 +            // gap
      LINE +          // table header
      items.length * LINE +   // rows
      16 +            // gap
      60 +            // status stamp
      LINE * 2 +      // total + pay method
      24 +            // gap
      LINE +          // footer
      PAD;            // bottom

    canvas.width = W;
    canvas.height = totalH;

    // ── Background ────────────────────────────────────────────────────────────
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, totalH);

    let y = PAD;

    // ── Header ────────────────────────────────────────────────────────────────
    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    setFont(28, "bold");
    ctx.fillText("LAVANDERÍA MAGISTRAL", W / 2, y + 28); y += 40;
    setFont(13);
    ctx.fillText("Av. Principal 123 - Sede Central", W / 2, y); y += LINE;
    ctx.fillText("RUC: 20123456789", W / 2, y); y += LINE + 8;
    dashed(y); y += 16;

    // ── Info block ────────────────────────────────────────────────────────────
    ctx.textAlign = "left";
    setFont(13, "bold");
    ctx.fillStyle = "#111";
    ctx.fillText(`FECHA: ${dateStr}`, PAD, y); y += LINE;
    ctx.fillText(`TICKET: ${ticketNum}`, PAD, y); y += LINE;
    ctx.fillText(`CLIENTE: ${ticketData.customerName || "Cliente"}`, PAD, y); y += LINE;
    if (ticketData.customerDni && ticketData.customerDni !== "0") {
      ctx.fillText(`DNI: ${ticketData.customerDni}`, PAD, y); y += LINE;
    }
    y += 8;
    solid(y); y += 8;

    // ── Table header ─────────────────────────────────────────────────────────
    setFont(12, "bold");
    ctx.fillStyle = "#333";
    ctx.textAlign = "left";
    ctx.fillText("CANT", PAD, y + LINE - 4);
    ctx.fillText("DESCRIPCIÓN", PAD + 60, y + LINE - 4);
    ctx.textAlign = "right";
    ctx.fillText("IMPORTE", W - PAD, y + LINE - 4);
    y += LINE;
    solid(y); y += 8;

    // ── Rows ─────────────────────────────────────────────────────────────────
    setFont(12);
    ctx.fillStyle = "#111";
    for (const ci of items) {
      const price = (ci.item.price * ci.qty).toFixed(2);
      ctx.textAlign = "left";
      ctx.fillText(`${ci.qty}`, PAD, y + LINE - 4);
      ctx.fillText(ci.item.name, PAD + 60, y + LINE - 4);
      ctx.textAlign = "right";
      ctx.fillText(price, W - PAD, y + LINE - 4);
      y += LINE;
    }
    y += 8;
    solid(y); y += 16;

    // ── Status stamp ─────────────────────────────────────────────────────────
    const stampColor = isPaid ? "#16a34a" : "#dc2626";
    ctx.strokeStyle = stampColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(PAD + 40, y, W - PAD * 2 - 80, 44);
    setFont(22, "bold");
    ctx.fillStyle = stampColor;
    ctx.textAlign = "center";
    ctx.fillText(isPaid ? "CANCELADO" : "POR COBRAR", W / 2, y + 30);
    y += 60;

    // ── Total ─────────────────────────────────────────────────────────────────
    ctx.textAlign = "right";
    setFont(16, "bold");
    ctx.fillStyle = "#111";
    ctx.fillText(`TOTAL: S/ ${Number(ticketData.total).toFixed(2)}`, W - PAD, y); y += LINE;
    setFont(12);
    const payLabel = ticketData.payMethod === "LUEGO" ? "PENDIENTE (Al recoger)" : ticketData.payMethod;
    ctx.fillText(`Medio de Pago: ${payLabel}`, W - PAD, y); y += LINE + 8;

    dashed(y); y += 16;

    // ── Footer ────────────────────────────────────────────────────────────────
    ctx.textAlign = "center";
    setFont(11);
    ctx.fillStyle = "#888";
    ctx.fillText("¡Gracias por su preferencia! - Sistemas Magistral SaaS", W / 2, y);

    // ── Download ─────────────────────────────────────────────────────────────
    const fileName = `Ticket-${ticketNum}.png`;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <button onClick={handleDownloadImage} className="bg-white/5 hover:bg-white/10 active:scale-95 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10">
               <Copy size={18} /> Descargar Imagen
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
