"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useStore } from "@/store/useStore";
import { Loader2, Mail, Lock, Store, Link as LinkIcon, LogOut } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { user, setUser } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentFbUser, setCurrentFbUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setCurrentFbUser(fbUser);
      setIsLoading(false);
      // Wait, if the user actually has a valid SaaS session, send them to admin
      if (user?.storeId) {
        router.push("/admin");
      }
    });
    return () => unsub();
  }, [user, router]);

  const handleSlugChange = (val: string) => {
    // Solo permitir minúsculas, números y guiones
    const formatted = val.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    setSlug(formatted);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    router.push("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !slug) return;
    
    setIsSubmitting(true);
    setError("");

    try {
      let targetEmail = currentFbUser?.email;

      // Si no hay usuario de Firebase activo, redirigir al login para que auth con Google
      if (!currentFbUser || !targetEmail) {
         setError("Debes iniciar sesión con Google para registrar un negocio. Redirigiendo...");
         setTimeout(() => router.push("/login"), 2000);
         return;
      }

      if (!targetEmail) throw new Error("No hay correo electrónico disponible");

      const rawStoreId = slug.trim().toLowerCase();

      // 1. Crear el Store
      await setDoc(doc(db, "stores", rawStoreId), {
        storeName,
        slug: rawStoreId,
        color: "#3b82f6", // Default
        createdAt: new Date().toISOString()
      });

      // 2. Vincular el Usuario a nivel Global
      await setDoc(doc(db, "users", targetEmail.toLowerCase()), {
        email: targetEmail.toLowerCase(),
        role: "ADMIN",
        storeId: rawStoreId,
        name: "Propietario",
        createdAt: new Date().toISOString()
      });

      // 3. Crear Categorías Iniciales en la Tienda (Opcional, para que no esté vacía)
      await setDoc(doc(db, `stores/${rawStoreId}/services`, "initial-service"), {
        name: "Lavado Básico",
        price: 15.00,
        type: "KG",
        description: "Lavado y secado básico por kilo."
      });

      // El AuthProvider detectará el cambio y nos llevará a /admin o actualizará el Zustand
      // Forzamos redirección por seguridad
      router.push("/admin");

    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("Este correo ya está registrado.");
      } else {
        setError("Error al crear la tienda. Verifica que el enlace no esté ocupado u otros datos.");
      }
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary mb-4" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden py-12">
      {/* Background decorations */}
      <div className="absolute top-0 right-10 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] -z-10 opacity-50 mix-blend-screen max-w-full" />
      <div className="absolute bottom-0 left-10 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 opacity-40 mix-blend-screen max-w-full" />
      
      <div className="glass-card w-full max-w-md p-8 sm:p-10 relative">
        <div className="text-center mb-8">
           <div className="w-full flex justify-center mb-6">
             <img 
               src="https://firebasestorage.googleapis.com/v0/b/magistralc.firebasestorage.app/o/MAGISTRAL_SKY_LOGOTIPO.webp?alt=media&token=85f7a83d-3bec-43de-b8af-f78408d0eeac" 
               alt="Magistral" 
               className="h-12 w-auto object-contain" 
             />
           </div>
           <h1 className="text-2xl font-bold text-foreground tracking-tight">Crea tu Entorno</h1>
           <p className="text-foreground/50 text-sm mt-2">
             {currentFbUser 
               ? "Completa los datos de tu lavandería para terminar el registro."
               : "Crea tu cuenta administradora gratuita en segundos."}
           </p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error text-sm font-medium px-4 py-3 rounded-lg mb-6 text-center text-balance animate-in fade-in zoom-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {!currentFbUser && (
             <div className="flex flex-col items-center justify-center p-6 bg-black/5 rounded-xl border border-black/10 text-center mb-6">
                <p className="text-foreground/70 mb-4 text-sm">Por seguridad, debes utilizar tu cuenta de Google para registrar tu negocio y evitar spam.</p>
                <button type="button" onClick={() => router.push("/login")} className="bg-white text-foreground hover:bg-gray-50 font-bold px-6 py-2 rounded-lg text-sm border border-black/10 transition-colors shadow-sm">Volver y Registrarse con Google</button>
             </div>
          )}

          {currentFbUser && (
            <div className="bg-black/5 border border-black/10 rounded-xl p-4 mb-4 flex justify-between items-center">
               <div>
                 <p className="text-xs text-foreground/50">Logueado como</p>
                 <p className="text-sm font-bold text-foreground truncate">{currentFbUser.email}</p>
               </div>
               <button type="button" onClick={handleLogout} className="p-2 bg-error/10 text-error hover:bg-error/20 rounded-lg transition-colors" title="Cambiar de cuenta">
                  <LogOut size={16} />
               </button>
            </div>
          )}

          {currentFbUser && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Nombre Comercial</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
                  <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} required
                    className="w-full bg-white border border-black/10 rounded-xl pl-10 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm"
                    placeholder="Ej: Lavamatic Premium"
                  />
                </div>
              </div>

               <div>
                 <label className="block text-sm font-medium text-foreground/70 mb-1">Enlace Personalizado</label>
                 <div className="relative flex items-stretch">
                   <span className="bg-black/5 border border-black/10 border-r-0 rounded-l-xl px-3 flex items-center text-foreground/40 text-sm">
                     <LinkIcon size={14} className="mr-1" /> /
                   </span>
                   <input type="text" value={slug} onChange={e => handleSlugChange(e.target.value)} required
                     className="flex-1 bg-white border border-black/10 rounded-r-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono text-sm shadow-sm"
                     placeholder="lavamatic"
                   />
                 </div>
                 <p className="text-xs text-foreground/40 mt-2 font-mono">Tus clientes entrarán a: <br/>magistral.pe/<span className="text-primary font-bold">{slug || "lavamatic"}</span></p>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary-hover active:scale-95 transition-all text-white font-bold rounded-xl py-3.5 mt-6 flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Crear Mi Lavandería"}
              </button>
            </>
          )}

        </form>

      </div>
    </div>
  );
}
