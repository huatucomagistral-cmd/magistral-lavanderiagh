"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Printer, ArrowLeft, Download, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function TicketViewPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);
  
  // Fake API Fetch
  const ticketInfo = {
    storeName: "Lavandería Magistral",
    address: "Av. Principal 123",
    customer: "Carlos Pérez Ramírez",
    date: new Date().toLocaleString(),
    items: [
      { name: "Edredón 2 Plazas", qty: 2, subtotal: 50.00 },
      { name: "Lavado por Kilo", qty: 3, subtotal: 16.50 },
    ],
    total: 66.50,
    trackingUrl: `http://localhost:3000/demo-store` // Mock tracking URL
  };

  const handlePrint = () => {
    window.print();
  };

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
            <button className="bg-white/5 hover:bg-white/10 active:scale-95 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10">
               <Download size={18} /> Guardar Imagen
            </button>
            <button className="bg-success/20 hover:bg-success/30 text-success font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
               <Share2 size={18} /> Mandar por WhatsApp
            </button>
         </div>
      </div>

      {/* Papel del Ticket Físico (Termal) */}
      <div className="bg-white text-black p-6 w-full max-w-[320px] shadow-2xl mx-auto md:mx-0 font-mono text-sm relative print:shadow-none print:m-0 print:p-0">
         
         {/* Corte dentado (decorativo web) */}
         <div className="absolute -top-1 left-0 w-full h-2 bg-background flex print:hidden" style={{ backgroundImage: "radial-gradient(circle, #09090b 4px, transparent 5px)", backgroundSize: "10px 10px" }} />
         
         <div className="text-center mb-6 border-b-2 border-dashed border-black/30 pb-4">
            <h1 className="text-2xl font-black uppercase leading-none mb-2">{ticketInfo.storeName}</h1>
            <p className="text-xs font-semibold">{ticketInfo.address}</p>
            <p className="text-xs">RUC: 20123456789</p>
         </div>

         <div className="mb-4 text-xs font-bold leading-relaxed space-y-1">
            <p>FECHA: {ticketInfo.date}</p>
            <p>TICKET: <span className="text-lg bg-black text-white px-2 py-0.5 ml-1">{ticketId}</span></p>
            <p>CLIENTE: {ticketInfo.customer}</p>
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
              {ticketInfo.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 align-top">{item.qty}</td>
                  <td className="py-1 align-top">{item.name}</td>
                  <td className="text-right py-1 align-top">{item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
         </table>

         <div className="text-right mb-6 text-sm">
           <p className="font-black text-base">TOTAL: S/ {ticketInfo.total.toFixed(2)}</p>
           <p className="text-[10px] mt-1">Efectivo | Vuelto: S/ 0.00</p>
         </div>

         <div className="flex flex-col items-center justify-center text-center mt-6 pt-6 border-t-2 border-dashed border-black/30">
            <p className="text-[10px] font-bold mb-2 uppercase">Escanea para rastrear tu pedido</p>
            <QRCodeSVG value={ticketInfo.trackingUrl} size={100} level="M" />
            <p className="text-[10px] mt-3 font-semibold">¡Gracias por su preferencia!</p>
            <p className="text-[9px] mt-1">Sistemas Magistral - SaaS</p>
         </div>

         {/* Corte dentado bottom */}
         <div className="absolute -bottom-1 left-0 w-full h-2 bg-background flex print:hidden" style={{ backgroundImage: "radial-gradient(circle, #09090b 4px, transparent 5px)", backgroundSize: "10px 10px" }} />
      </div>

    </div>
  );
}
