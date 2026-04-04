"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useStore } from "@/store/useStore";
import { Loader2, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, authError, setAuthError } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const displayError = localError || authError;

  useEffect(() => {
    if (authError) {
      setIsLoading(false);
    }
  }, [authError]);

  // Si ya hay usuario activo, redirigir directo al admin
  useEffect(() => {
    if (user) {
      router.push("/admin");
    }
  }, [user, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setLocalError("");
    setAuthError(null);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // AuthProvider maneja la redirecion al setear el user en Zustand
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential") {
        setLocalError("Correo o contraseña incorrectos.");
      } else if (err.code === "auth/user-not-found") {
        setLocalError("No existe una cuenta con este correo.");
      } else {
        setLocalError("Ocurrió un error al iniciar sesión.");
      }
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setLocalError("");
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    
    try {
      await signInWithPopup(auth, provider);
      // AuthProvider validará los permisos en la base de datos
    } catch (err: any) {
      console.error(err);
      setLocalError("No se pudo iniciar sesión con Google.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden py-12">
      
      {/* Background decorations */}
      <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] -z-10 opacity-50 mix-blend-screen max-w-full" />
      <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] -z-10 opacity-40 mix-blend-screen max-w-full" />
      
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-6 relative z-10">
        
        {/* Columna Izquierda: Iniciar Sesión */}
        <div className="glass-card p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-8 flex flex-col items-center sm:items-start text-center sm:text-left">
             <img 
               src="https://firebasestorage.googleapis.com/v0/b/magistralc.firebasestorage.app/o/MAGISTRAL_SKY_LOGOTIPO.webp?alt=media&token=85f7a83d-3bec-43de-b8af-f78408d0eeac" 
               alt="Magistral" 
               className="h-10 w-auto mb-6 object-contain mx-auto sm:mx-0" 
             />
             <h1 className="text-2xl font-bold text-white tracking-tight">Iniciar Sesión</h1>
          </div>

          {displayError && (
            <div className="bg-error/10 border border-error/20 text-error text-sm font-medium px-4 py-3 rounded-lg mb-6 text-center text-balance animate-in fade-in zoom-in">
              {displayError}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-white/70 mb-3">Administradores</p>
              <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full bg-white text-black hover:bg-gray-100 active:scale-95 transition-all font-bold rounded-xl py-3.5 flex items-center justify-center gap-3 disabled:opacity-50 shadow-sm border border-transparent">
                 <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                 </svg>
                 Entrar con Google
              </button>
            </div>

            <div className="flex items-center gap-4 text-white/30 text-xs uppercase font-bold tracking-widest my-2">
               <div className="flex-1 border-b border-white/10"></div>
               Trabajadores
               <div className="flex-1 border-b border-white/10"></div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Correo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    placeholder="trabajador@lavanderia.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-surface hover:bg-surface/80 border border-white/10 active:scale-95 transition-all text-white font-bold rounded-xl py-3.5 flex items-center justify-center disabled:opacity-50 gap-2">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Entrar como Trabajador"}
              </button>
            </form>
          </div>
        </div>

        {/* Columna Derecha: Registro (Google) */}
        <div className="rounded-2xl p-8 sm:p-10 flex flex-col justify-center items-center text-center bg-gradient-to-br from-primary/20 to-accent/10 border border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
          
          <h2 className="text-3xl font-bold text-white mb-4">Abre tu Lavandería Digital</h2>

          <div className="w-full max-w-sm bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl relative z-10">
            <h3 className="text-lg font-semibold text-white mb-4">Comienza Completamente Gratis</h3>
            <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-red-600/25">
               <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#FFF"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#FFF"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FFF"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#FFF"/>
               </svg>
               Registrarse con Google
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
