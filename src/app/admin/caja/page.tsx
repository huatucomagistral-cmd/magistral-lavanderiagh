"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { LockKeyhole, LockOpen, DollarSign, Wallet, ArrowRightLeft, Ticket } from "lucide-react";

export default function CajaPage() {
  const { isCajaOpen, setCajaStatus } = useStore();
  const [initialCash, setInitialCash] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Mocks de totales si estuviese abierta
  const mockStats = {
    ingresosEfectivo: 120.00,
    ingresosYape: 85.00,
    ingresosTransferencia: 0.00,
    pedidosCobrados: 8,
  };

  const currentInitial = parseFloat(initialCash) || 50; // Mock current session base

  const handleOpenCaja = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setCajaStatus(true);
      setIsProcessing(false);
    }, 1000);
  };

  const handleCloseCaja = () => {
    if(confirm("Al cerrar caja se generará el reporte del día y no podrás cobrar más pedidos en esta sesión. ¿Continuar?")) {
      setIsProcessing(true);
      setTimeout(() => {
        setCajaStatus(false);
        setInitialCash("");
        setIsProcessing(false);
        alert("Caja cerrada exitosamente. Reporte generado.");
      }, 1000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Control de Caja</h1>
          <p className="text-white/60">Abre tu turno con el sencillo en efectivo y monitorea tus ingresos.</p>
        </div>
        
        {/* Badge de Estado Global */}
        <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold ${isCajaOpen ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
           {isCajaOpen ? <LockOpen size={18} /> : <LockKeyhole size={18} />}
           {isCajaOpen ? 'CAJA ABIERTA' : 'CAJA CERRADA'}
        </div>
      </div>

      {!isCajaOpen ? (
        <div className="max-w-md mx-auto mt-20">
          <form onSubmit={handleOpenCaja} className="glass-card p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
              <DollarSign size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white">Apertura de Caja</h2>
            <p className="text-white/50 text-sm">Ingresa el monto de efectivo con el que estás empezando este turno para poder cobrar pedidos.</p>
            
            <div className="text-left mt-6">
               <label className="block text-sm font-medium text-white/70 mb-2 text-center">Efectivo Inicial (Para Vuelto)</label>
               <div className="relative max-w-xs mx-auto">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-bold">S/</span>
                 <input 
                   type="number" step="0.10" min="0" value={initialCash} onChange={e => setInitialCash(e.target.value)} required
                   className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-white font-mono text-xl text-center focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                   placeholder="0.00"
                 />
               </div>
            </div>

            <button type="submit" disabled={isProcessing} className="w-full bg-primary hover:bg-primary-hover font-bold text-white py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-primary/20">
              {isProcessing ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" /> : <LockOpen size={20} />}
              Abrir Caja Ahora
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Resumen Principal (Efectivo Esperado) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 bg-gradient-to-br from-surface to-primary/10 border-primary/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                 <Wallet size={120} />
              </div>
              <h3 className="text-white/70 font-medium mb-1 relative z-10">Total Efectivo en Caja</h3>
              <p className="text-4xl font-black text-white tracking-tight relative z-10 font-mono">
                S/ {(currentInitial + mockStats.ingresosEfectivo).toFixed(2)}
              </p>
              
              <div className="mt-6 flex flex-col gap-2 relative z-10">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Base Inicial:</span>
                  <span className="text-white font-medium">S/ {currentInitial.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Cobros Efectivo:</span>
                  <span className="text-success font-medium">+ S/ {mockStats.ingresosEfectivo.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                 <button onClick={handleCloseCaja} disabled={isProcessing} className="w-full bg-error hover:bg-error/80 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95">
                    {isProcessing ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" /> : <LockKeyhole size={20} />}
                    Realizar Cierre de Caja
                 </button>
              </div>
            </div>
          </div>

          {/* Medios Digitales y Actividad */}
          <div className="lg:col-span-2 space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-5">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-full bg-[#742284]/20 flex items-center justify-center text-[#742284]"><DollarSign size={16}/></div>
                     <span className="text-white/70 font-medium text-sm">Cobros Yape</span>
                   </div>
                   <p className="text-2xl font-bold text-white font-mono">S/ {mockStats.ingresosYape.toFixed(2)}</p>
                </div>
                <div className="glass-card p-5">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent"><ArrowRightLeft size={16}/></div>
                     <span className="text-white/70 font-medium text-sm">Transferencias</span>
                   </div>
                   <p className="text-2xl font-bold text-white font-mono">S/ {mockStats.ingresosTransferencia.toFixed(2)}</p>
                </div>
                <div className="glass-card p-5">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"><Ticket size={16}/></div>
                     <span className="text-white/70 font-medium text-sm">Pedidos Cobrados</span>
                   </div>
                   <p className="text-2xl font-bold text-white font-mono">{mockStats.pedidosCobrados} pagos</p>
                </div>
             </div>

             <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-4">Últimos Movimientos Pagaods</h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 text-sm">
                      <th className="pb-3 font-medium">Ticket</th>
                      <th className="pb-3 font-medium">Método</th>
                      <th className="pb-3 font-medium text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b border-white/5">
                      <td className="py-3 text-white font-mono">T-0045</td>
                      <td className="py-3"><span className="px-2 py-1 rounded bg-[#742284]/20 text-[#742284] text-xs font-bold">YAPE</span></td>
                      <td className="py-3 text-right text-success font-bold font-mono">+ 15.00</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3 text-white font-mono">T-0044</td>
                      <td className="py-3"><span className="px-2 py-1 rounded bg-white/10 text-white/70 text-xs font-bold">EFECTIVO</span></td>
                      <td className="py-3 text-right text-success font-bold font-mono">+ 25.50</td>
                    </tr>
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
