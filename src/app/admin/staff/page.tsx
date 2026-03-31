"use client";

import { useState } from "react";
import { UserPlus, ShieldAlert, Mail } from "lucide-react";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "EMPLOYEE" | "DELIVERY";
  status: "ACTIVE" | "INVITED";
};

const initialStaff: StaffMember[] = [
  { id: "1", name: "Tú (Dueño)", email: "dueno@magistral.com", role: "OWNER", status: "ACTIVE" },
  { id: "2", name: "Cajero 1", email: "juan@lavanderiasol.com", role: "EMPLOYEE", status: "ACTIVE" },
  { id: "3", name: "Pendiente Aceptación", email: "reparto@gmail.com", role: "DELIVERY", status: "INVITED" },
];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EMPLOYEE" | "DELIVERY">("EMPLOYEE");
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    // Simula API de envío de invitación por email
    setTimeout(() => {
      setStaff([...staff, { id: Math.random().toString(), name: "Esperando Registro...", email, role, status: "INVITED" }]);
      setEmail("");
      setRole("EMPLOYEE");
      setIsInviting(false);
      alert("Invitación enviada por email");
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Personal del Negocio</h1>
        <p className="text-white/60">Agrega empleados y repartidores para que usen la plataforma.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Invitar Personal */}
        <div className="lg:col-span-1">
          <form onSubmit={handleInvite} className="glass-card p-6 sticky top-24 space-y-4">
             <div className="flex items-center gap-2 mb-4">
               <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                 <UserPlus size={18} />
               </div>
               <h2 className="text-lg font-bold text-white leading-tight">Invitar Nuevo</h2>
             </div>

             <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="empleado@gmail.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
             </div>

             <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Rol</label>
                <select value={role} onChange={e => setRole(e.target.value as any)}
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="EMPLOYEE">Cajero / Atendedor</option>
                  <option value="DELIVERY">Motorizado (Delivery)</option>
                </select>
             </div>

             <button type="submit" disabled={isInviting} className="w-full bg-primary hover:bg-primary-hover active:scale-95 transition-all text-white font-semibold rounded-xl px-4 py-3 flex items-center justify-center gap-2 mt-4">
               {isInviting ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5 mx-auto" /> : "Enviar Invitación"}
             </button>
             
             <div className="flex gap-2 items-start mt-4 p-3 rounded-lg bg-surface border border-white/5">
                <ShieldAlert className="text-warning shrink-0 mt-0.5" size={14} />
                <p className="text-xs text-white/50 leading-relaxed">
                  Los empleados nunca tendrán acceso a los recortes financieros totales ni a la configuración general de pagos.
                </p>
             </div>
          </form>
        </div>

        {/* Lista del Personal */}
        <div className="lg:col-span-2 space-y-4">
           {staff.map(person => (
             <div key={person.id} className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-gradient-to-br from-surface to-background text-lg font-bold text-white">
                   {person.name.charAt(0)}
                 </div>
                 <div>
                   <h3 className="text-white font-bold mb-0.5 flex items-center gap-2">
                     {person.name}
                     {person.role === "OWNER" && (
                       <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/60 px-2 py-0.5 rounded-full">Propietario</span>
                     )}
                     {person.status === "INVITED" && (
                       <span className="text-[10px] font-bold uppercase tracking-wider bg-warning/20 text-warning px-2 py-0.5 rounded-full">Pendiente</span>
                     )}
                   </h3>
                   <p className="text-white/50 text-sm font-mono">{person.email}</p>
                 </div>
               </div>

               <div className="w-full sm:w-auto flex flex-row items-center justify-between sm:justify-end gap-4 border-t border-white/5 pt-4 sm:border-0 sm:pt-0">
                  <span className="text-sm font-medium text-white/70">
                    {person.role === "EMPLOYEE" ? "Cajero" : person.role === "DELIVERY" ? "Motorizado" : "Admin"}
                  </span>
                  
                  {person.role !== "OWNER" && (
                     <button className="text-xs font-semibold text-error hover:text-white hover:bg-error/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-error/20 transition-colors">
                       Revoque
                     </button>
                  )}
               </div>
             </div>
           ))}
        </div>

      </div>
    </div>
  );
}
