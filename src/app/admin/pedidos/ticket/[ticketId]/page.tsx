"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Printer, ArrowLeft, Copy, Share2, Loader2, AlertTriangle, Camera } from "lucide-react";
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
  const [storeData, setStoreData] = useState<any>(null);

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
          const sd = storeDoc.data();
          setStoreData(sd);
          setStoreSlug(sd.slug || user.storeId);
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

    // Usar el nombre real de la tienda cargado desde Firebase
    const storeName = storeData?.storeName || 'nuestra lavandería';
    const text = `Hola ${ticketData.customerName || ''}, gracias por confiar en ${storeName}. Tu orden #${ticketData.ticketNumber || ticketId.slice(0, 6).toUpperCase()} ha sido recibida.\n\nPuedes ver tu recibo digital y rastrear el estado de tus prendas en tiempo real aquí:\n${trackingLink}`;

    // Si existe el teléfono del cliente lo abrimos en su chat directo, si no, que elija el contacto
    const phone = ticketData.customerPhone ? ticketData.customerPhone.replace(/\D/g, '') : '';
    const encodedText = encodeURIComponent(text);

    // Usamos wa.me que abre WhatsApp en el fon (o WhatsApp Web si está en PC)
    const url = phone ? `https://wa.me/51${phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;

    window.open(url, '_blank');
  };

  const handleCopyImage = () => {
    if (!ticketData) return;

    const W = 220; // Ajustado a 58mm
    const PAD = 12;
    const LINE = 14;
    const SCALE = 3; // Escalado para ultra-nitidez (Retina/HD)

    // Obtener instancia del QR para dibujarla
    const qrEl = document.querySelector("#ticket-content canvas") as HTMLCanvasElement;
    const QR_SIZE = qrEl ? 140 : 0;

    const items: any[] = ticketData.items || [];
    const ticketNum = ticketData.ticketNumber || ticketId.slice(0, 8).toUpperCase();
    const isPaid = ticketData.paymentStatus === "PAID";
    const atendidoPor = ticketData.createdByEmail ? ticketData.createdByEmail.split('@')[0] : '';
    const dateText = dateStr.split(',')[0]; // O separar si quieres

    // Helper para auto-wrap (máximo ~22 caracteres por fila)
    const splitText = (text: string, maxLen: number) => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      words.forEach(word => {
        if ((currentLine + word).length > maxLen) {
          if (currentLine) lines.push(currentLine.trim());
          if (word.length > maxLen) {
            lines.push(word.substring(0, maxLen));
            currentLine = word.substring(maxLen) + ' ';
          } else {
            currentLine = word + ' ';
          }
        } else {
          currentLine += word + ' ';
        }
      });
      if (currentLine) lines.push(currentLine.trim());
      return lines.length > 0 ? lines : [""];
    };

    // Pre-calcular cuantas filas ocupa cada item para sumar a la altura total
    let totalItemsRows = 0;
    const itemsWithLines = items.map(ci => {
      const lines = splitText(ci.item.name, 22);
      totalItemsRows += lines.length;
      return { ...ci, nameLines: lines };
    });

    // Ajustamos la altura total
    const totalH =
      PAD +
      24 +            // store name
      LINE * 2 +      // address + ruc
      10 +            // gap
      LINE * 5 +      // date/ticket/client/dni/atendido
      8 +             // gap
      LINE +          // table header
      (totalItemsRows * LINE) + // <--- FILAS DINÁMICAS
      8 +             // gap
      LINE +          // total/pay row
      16 +            // gap pre-QR
      (ticketData.totalPieces && ticketData.totalPieces > 0 ? LINE + 5 : 0) + // totalPieces info height
      (QR_SIZE > 0 ? QR_SIZE + 24 : 0) + // QR area
      12 +            // guiones
      PAD;

    const canvas = document.createElement("canvas");
    // Multiplicamos por la escala para obtener más píxeles físicos
    canvas.width = W * SCALE;
    canvas.height = totalH * SCALE;
    const ctx = canvas.getContext("2d")!;
    
    // Aplicamos el escalado interno; todo se dibujará 3x más grande y súper nítido
    ctx.scale(SCALE, SCALE);
    ctx.imageSmoothingEnabled = false;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const setFont = (size: number, weight = "normal") => {
      ctx.font = `${weight} ${size}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
    };
    const dashed = (y: number) => {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
      ctx.setLineDash([]);
    };
    const solid = (y: number, lw = 1) => {
      ctx.strokeStyle = "#000";
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    };

    // ── Background ────────────────────────────────────────────────────────────
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, totalH);

    let y = PAD + 10;
    ctx.textBaseline = "alphabetic";

    // ── Header ────────────────────────────────────────────────────────────────
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    setFont(12, "900");
    ctx.fillText(storeData?.storeName?.toUpperCase() || "LAVANDERÍA", W / 2, y); y += 14;
    setFont(9, "bold");
    ctx.fillText(storeData?.address || "Av. Principal 123", W / 2, y); y += 11;
    setFont(9, "normal");
    ctx.fillText(storeData?.ruc ? `RUC: ${storeData.ruc}` : "RUC: 20123456789", W / 2, y); y += 16;

    // ── Info block ────────────────────────────────────────────────────────────
    ctx.textAlign = "left";
    setFont(9, "bold");
    ctx.fillStyle = "#000";
    ctx.fillText(`FECHA: ${dateStr}`, PAD, y); y += LINE;

    // TICKET badge
    ctx.fillText("TICKET:", PAD, y);
    const tw = ctx.measureText("TICKET: ").width;
    setFont(10, "900");
    ctx.fillText(ticketNum, PAD + tw - 4, y);
    y += LINE;

    setFont(9, "bold");
    ctx.fillText(`CLIENTE: ${ticketData.customerName?.substring(0, 22) || "Cliente"}`, PAD, y); y += LINE;
    if (ticketData.customerDni && ticketData.customerDni !== "0") {
      ctx.fillText(`DNI: ${ticketData.customerDni}`, PAD, y); y += LINE;
    }
    if (atendidoPor) {
      ctx.fillText(`ATENDIDO: ${atendidoPor}`, PAD, y); y += LINE;
    }
    
    // Total de Piezas en Imagen
    if (ticketData.totalPieces && ticketData.totalPieces > 0) {
      dashed(y - 8); 
      setFont(9, "bold");
      ctx.fillText(`TOTAL PRENDAS: ${ticketData.totalPieces} uds.`, PAD, y); y += LINE;
    }

    solid(y - LINE/2, 1); y += 6;

    // ── Table header ─────────────────────────────────────────────────────────
    setFont(9, "900");
    ctx.fillText("CANT", PAD, y);
    ctx.fillText("DESC", PAD + 28, y);
    ctx.textAlign = "right";
    ctx.fillText("IMP", W - PAD, y);
    y += LINE - 4;
    solid(y, 1); y += LINE;

    // ── Rows ─────────────────────────────────────────────────────────────────
    setFont(9, "bold");
    for (const ci of itemsWithLines) {
      const price = (ci.item.price * ci.qty).toFixed(2);
      ctx.textAlign = "left";
      ctx.fillText(`${ci.qty}`, PAD, y);
      
      // Dibujar texto multi-línea
      ci.nameLines.forEach((textLine: string, index: number) => {
        ctx.textAlign = "left";
        ctx.fillText(textLine, PAD + 28, y + (index * LINE));
      });

      // El precio se dibuja en la primera línea
      ctx.textAlign = "right";
      ctx.fillText(price, W - PAD, y);
      
      // Avanzar 'y' la cantidad de líneas que ocupó este ítem
      y += ci.nameLines.length * LINE;
    }
    y -= 4;
    solid(y, 1); y += 16;

    // ── Total & Status (Misma final) ─────────────────────────────────────────
    ctx.textAlign = "left";
    setFont(10, "900");
    ctx.fillStyle = "#000";
    
    // Dibujar recuadro para el estado
    const statusText = isPaid ? "PAGADO" : "POR COBRAR";
    const statusW = ctx.measureText(statusText).width + 6;
    ctx.strokeRect(PAD, y - 10, statusW, 14);
    ctx.fillText(statusText, PAD + 3, y + 1);

    ctx.textAlign = "right";
    setFont(11, "900");
    ctx.fillText(`TOTAL: S/ ${Number(ticketData.total).toFixed(2)}`, W - PAD, y + 1); y += 14;

    solid(y, 1); y += 14;

    // ── QR Code ──────────────────────────────────────────────────────────────
    if (qrEl) {
      ctx.textAlign = "center";
      setFont(8, "bold");
      ctx.fillStyle = "#000";
      ctx.fillText("¿En qué estado está tu ropa?", W / 2, y);
      y += 6;
      ctx.drawImage(qrEl, W / 2 - (QR_SIZE / 2), y, QR_SIZE, QR_SIZE);
      y += QR_SIZE + 14;
    }

    // --- . --- (Final del ticket en imagen)
    ctx.textAlign = "center";
    setFont(10, "bold");
    ctx.fillText("--- . ---", W / 2, y);
    y += 10;

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
      <div className="flex h-[60vh] flex-col items-center justify-center text-foreground/40">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p>Generando Ticket Electrónico...</p>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-foreground/40">
        <p>El ticket {ticketId} no existe o fue eliminado.</p>
        <Link href="/admin/pedidos" className="mt-4 text-primary underline">Volver a Órdenes</Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-12 flex flex-col md:flex-row gap-8 items-start justify-center">

      {/* Columna Acciones */}
      <div className="flex flex-col gap-4 w-full md:w-64 shrink-0 print:hidden">
        <Link href="/admin/pedidos" className="text-foreground/40 hover:text-foreground transition-colors flex items-center gap-2 font-medium mb-4 w-fit">
          <ArrowLeft size={18} /> Volver a Órdenes
        </Link>

        <div className="glass-card p-6 flex flex-col gap-3">
          <h2 className="text-foreground font-bold mb-2">Acciones de Emisión</h2>
          <button onClick={handlePrint} className="bg-primary hover:bg-primary-hover active:scale-95 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
            <Printer size={18} /> Imprimir (80mm)
          </button>
          <button onClick={handleCopyImage} className="bg-black/5 hover:bg-black/10 active:scale-95 text-foreground font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-black/10">
            <Copy size={18} /> Copiar Imagen
          </button>
          <button onClick={handleWhatsApp} className="bg-success/20 hover:bg-success/30 active:scale-95 text-success font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-success/30">
            <Share2 size={18} /> Mandar por WhatsApp
          </button>
        </div>

        {/* Evidences Section (Internal) */}
        {ticketData.evidences && ticketData.evidences.length > 0 && (
          <div className="glass-card p-6 flex flex-col gap-3 print:hidden mt-4">
            <h2 className="text-foreground font-bold mb-2 flex items-center gap-2">
              <Camera size={18} /> Evidencias Internas
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {ticketData.evidences.filter((e: any) => e.type === 'image').map((img: any, i: number) => (
                <div key={i} className="aspect-square bg-black/5 rounded-lg overflow-hidden border border-black/10">
                  <a href={img.url} target="_blank" rel="noreferrer">
                    <img src={img.url} alt={`Evidencia ${i}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </a>
                </div>
              ))}
            </div>
            {ticketData.evidences.filter((e: any) => e.type === 'audio').map((aud: any, i: number) => (
              <audio key={i} src={aud.url} controls className="w-full h-8 mt-2" />
            ))}
            <p className="text-[10px] text-foreground/50 mt-2">
              Estas notas son de uso interno y no aparecen en el recibo físico ni en la vista rastreo del cliente.
            </p>
          </div>
        )}
      </div>

      {/* Papel del Ticket Físico (Termal) */}
      <div id="ticket-content" className="ticket-print-area bg-white text-black p-4 w-full max-w-[220px] shadow-xl mx-auto md:mx-0 font-mono text-[10px] relative print:shadow-none print:m-0 print:p-0 leading-tight">

        {/* Corte dentado (decorativo web) */}
        <div className="absolute -top-1 left-0 w-full h-2 bg-background flex print:hidden" style={{ backgroundImage: "radial-gradient(circle, #09090b 4px, transparent 5px)", backgroundSize: "10px 10px" }} />

        {ticketData.status === 'CANCELADO' && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-600 rounded-lg flex flex-col gap-2 items-center text-center print:border-black">
            <div className="flex items-center gap-2 text-red-600 font-black uppercase text-sm print:text-black">
              <AlertTriangle size={20} /> ORDEN ANULADA / CANCELADA
            </div>
            <div className="text-[11px] text-red-800 font-bold bg-red-100 px-3 py-2 rounded border border-red-200 w-full print:bg-white print:text-black print:border-black">
              MOTIVO: {ticketData.cancelReason || 'No especificado'}
            </div>
            {ticketData.cancelledAt && (
              <span className="text-[9px] text-red-400 font-bold uppercase print:text-black">
                Fecha: {new Date(ticketData.cancelledAt).toLocaleString()}
              </span>
            )}
          </div>
        )}

        <div className="text-center mb-1 pb-1">
          <h1 className="text-sm font-black leading-none mb-0.5 truncate whitespace-nowrap overflow-hidden">{storeData?.storeName || "Cargando..."}</h1>
          <p className="text-[9px] font-semibold leading-tight">{storeData?.address || "Av. Principal 123"}</p>
          <p className="text-[9px] leading-tight">{storeData?.ruc ? `RUC: ${storeData.ruc}` : "RUC: 20123456789"}</p>
        </div>

         <div className="mb-1 text-[10px] font-bold leading-[1.2] space-y-0">
          <p>FECHA: {dateStr}</p>
          <p>TICKET: <span className="text-[11px] font-bold">{ticketData.ticketNumber || ticketId.slice(0, 6).toUpperCase()}</span></p>
          <p className="truncate">CLIENTE: {ticketData.customerName || "Cliente"}</p>
          {ticketData.customerDni && ticketData.customerDni !== "0" && <p>DNI: {ticketData.customerDni}</p>}
          {ticketData.createdByEmail && <p>ATENDIDO: {ticketData.createdByEmail.split('@')[0]}</p>}
          {ticketData.totalPieces > 0 && <p className="mt-0.5 pt-0.5 border-t border-black/10">TOTAL PRENDAS: <span className="font-black text-[11px]">{ticketData.totalPieces} uds.</span></p>}
        </div>

        <table className="w-full text-[10px] font-bold mb-1 border-t border-b border-black py-0.5 leading-[1.2]">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left pb-0.5 pt-0.5">CANT</th>
              <th className="text-left pb-0.5 pt-0.5">DESC</th>
              <th className="text-right pb-0.5 pt-0.5">IMP</th>
            </tr>
          </thead>
          <tbody>
            {ticketData.items?.map((cartItem: any, idx: number) => (
              <tr key={idx}>
                <td className="py-0.5 align-top">{cartItem.qty}</td>
                <td className="py-0.5 align-top pr-1 leading-tight">{cartItem.item.name}</td>
                <td className="text-right py-0.5 align-top">{(cartItem.item.price * cartItem.qty).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-end mt-1 mb-1 border-black pt-0.5 pb-1">
          <div className="font-bold text-[12px] uppercase border border-black px-1">
            {ticketData.paymentStatus === 'PAID' ? 'PAGADO' : 'POR COBRAR'}
          </div>
          <p className="font-bold text-[13px] leading-none">TOTAL: S/ {Number(ticketData.total).toFixed(2)}</p>
        </div>

        <div className="flex flex-col items-center justify-center text-center mt-1 pt-1 border-t border-black/10">
          <p className="text-[8px] font-bold mb-1 uppercase tracking-tighter">¿En qué estado está tu ropa?</p>
          <div className="">
            <QRCodeCanvas value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/${storeSlug || user?.storeId}?ticket=${ticketData.ticketNumber || ticketId}`} size={140} level="L" />
          </div>
        </div>

        {/* Espacio extra para que la impresora no corte el QR y asegure el avance de papel */}
        <div className="h-[0.5cm] flex items-end justify-center">
          <span className="text-[10px] font-bold text-black">--- . ---</span>
        </div>

        {/* Corte dentado bottom */}
        <div className="absolute -bottom-1 left-0 w-full h-2 bg-background flex print:hidden" style={{ backgroundImage: "radial-gradient(circle, #09090b 4px, transparent 5px)", backgroundSize: "10px 10px" }} />
      </div>

    </div>
  );
}
