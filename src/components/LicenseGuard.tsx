"use client";

import { useStore } from "@/store/useStore";
import { ShieldAlert } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { usePathname } from "next/navigation";

export function LicenseGuard({ children }: { children: React.ReactNode }) {
  const { user, hasLicense } = useStore();
  const pathname = usePathname();

  // Rutas públicas que no requieren bloqueo de licencia
  const isPublicRoute = pathname === "/" || pathname === "/login";

  if (isPublicRoute) return <>{children}</>;

  // Si el usuario está logueado pero no tiene licencia activa para lavandería
  if (user && hasLicense === false) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
        <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-8 text-center border border-white/20 animate-in zoom-in duration-300">
          <div className="mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-black text-slate-900 mb-2">Licencia Inactiva</h1>
          <p className="text-slate-500 leading-relaxed mb-8">
            Lo sentimos, tu cuenta (<span className="font-bold text-slate-700">{user.email}</span>) no cuenta con una licencia activa para el sistema de <span className="font-bold text-[#0d7b8a]">Lavandería Magistral</span>.
          </p>

          <div className="space-y-3">
            <button 
              onClick={() => window.open('https://divi.magistral.pe/dashboard/comprar', '_blank')}
              className="w-full bg-[#0d7b8a] hover:bg-[#0a6673] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#0d7b8a]/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              Adquirir Licencia Ahora
            </button>
            
            <button 
              onClick={() => signOut(auth)}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl transition-all"
            >
              Cerrar Sesión
            </button>
          </div>

          <p className="mt-8 text-xs text-slate-400 font-medium uppercase tracking-widest">
            Divi Magistral Ecosystem
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
