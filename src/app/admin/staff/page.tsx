"use client";

import { useState, useEffect } from "react";
import { UserPlus, ShieldAlert, Mail, Trash2, Smartphone, Users, Loader2 } from "lucide-react";
import { collection, onSnapshot, query, setDoc, doc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useStore } from "@/store/useStore";
import { Lock } from "lucide-react";

type StaffMember = {
  id: string; // The email is used as ID
  email: string;
  role: "ADMIN" | "PERSONAL";
  status: "ACTIVE" | "INVITED";
};

export default function StaffPage() {
  const { user, currentStore } = useStore();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    // Escuchar la colección de usuarios de la tienda
    if (!user?.storeId) return;
    const q = query(collection(db, `stores/${user.storeId}/users`));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as StaffMember[];
      setStaff(data);
    });
    return () => unsub();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 6) {
      setMessage({ text: "La contraseña debe tener al menos 6 caracteres.", type: "error" });
      return;
    }
    
    setIsInviting(true);
    setMessage({ text: "", type: "" });

    try {
      // 1. Añadimos el usuario a nuestra base de datos particular de la tienda
      if (!user?.storeId) throw new Error("Store ID missing");
      
      const normalizedEmail = email.toLowerCase();
      
      await setDoc(doc(db, `stores/${user.storeId}/users`, normalizedEmail), {
        email: normalizedEmail,
        role: "PERSONAL",
        status: "ACTIVE"
      });

      // 1.5. Añadimos el usuario a la base de datos GLOBAL para que AuthProvider pueda asignarle su storeId
      await setDoc(doc(db, "users", normalizedEmail), {
        email: normalizedEmail,
        role: "PERSONAL",
        storeId: user.storeId,
        status: "ACTIVE"
      });

      // 2. Creamos el usuario en Firebase Auth sin desloguear al Admin actual usando una App Temporal
      const tempApp = initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      }, "TempApp-" + Date.now());
      
      const tempAuth = getAuth(tempApp);
      
      try {
        // Creamos la cuenta con la contraseña proporcionada por el Administrador
        await createUserWithEmailAndPassword(tempAuth, email, password);
      } catch (err: any) {
        if (err.code !== "auth/email-already-in-use") {
          throw err; // Solo ignoramos si el usuario ya existe en Auth
        } else {
          // Si ya existe, podemos omitir este paso, la DB ya lo autorizó
        }
      }

      await deleteApp(tempApp); // Limpiamos la app temporal

      setMessage({ text: "Usuario creado exitosamente. Ya puedes enviarle sus credenciales por WhatsApp.", type: "success" });
      setEmail("");
      setPassword("");
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Error al crear personal: " + err.message, type: "error" });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = async (memberEmail: string) => {
    if (confirm("¿Estás seguro de eliminar a este trabajador? Ya no podrá acceder al sistema.")) {
      try {
        if (!user?.storeId) throw new Error("Store ID missing");
        await deleteDoc(doc(db, `stores/${user.storeId}/users`, memberEmail));
        await deleteDoc(doc(db, "users", memberEmail));
        // Nota: Opcionalmente también requerirías una Cloud Function para borrar el usuario de Firebase Auth.
        // Pero al borrarlo de aquí, ya no pasará la verificación del AuthProvider.
      } catch (err) {
        console.error("Error al revocar", err);
      }
    }
  };

  const shareViaWhatsApp = (personEmail: string) => {
    const businessName = currentStore?.storeName || currentStore?.name || "nuestra lavandería";
    const text = `¡Hola! Te he dado acceso al sistema de ${businessName}.\n\nEstas son tus credenciales de acceso:\nUsuario: ${personEmail}\nContraseña: [Escribe aquí la contraseña]\n\nIngresa aquí:\n${window.location.origin}/admin`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Personal del Negocio</h1>
        <p className="text-foreground/60">Agrega empleados a la plataforma. Podrás enviarles sus accesos por WhatsApp.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Invitar Personal */}
        <div className="lg:col-span-1">
          <form onSubmit={handleInvite} className="glass-card p-6 sticky top-24 space-y-4">
             <div className="flex items-center gap-2 mb-4">
               <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                 <UserPlus size={18} />
               </div>
               <h2 className="text-lg font-bold text-foreground leading-tight">Crear Personal</h2>
             </div>

             {message.text && (
               <div className={`text-xs font-medium px-3 py-2 rounded-lg text-balance ${message.type === 'error' ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                 {message.text}
               </div>
             )}

             <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Correo (Usuario)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="personal@magistral.pe"
                      className="w-full bg-white/50 border border-black/10 rounded-xl pl-9 pr-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                    />
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
                    <input type="text" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" minLength={6}
                      className="w-full bg-white/50 border border-black/10 rounded-xl pl-9 pr-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                    />
                  </div>
               </div>
             </div>

             <button type="submit" disabled={isInviting} className="w-full bg-primary hover:bg-primary-hover active:scale-95 transition-all text-white font-bold rounded-xl px-4 py-3 flex items-center justify-center gap-2 mt-4">
               {isInviting ? <Loader2 className="animate-spin" size={20} /> : "Crear Acceso"}
             </button>
             
             <div className="flex gap-2 items-start mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <ShieldAlert className="text-warning shrink-0 mt-0.5" size={14} />
                <p className="text-xs text-foreground/60 leading-relaxed">
                  El rol <strong className="text-foreground">PERSONAL</strong> tiene permisos limitados: solo puede gestionar Caja e Historial de Órdenes. No verá reportes de dinero.
                </p>
             </div>
          </form>
        </div>

        {/* Lista del Personal */}
        <div className="lg:col-span-2 space-y-4">
           {staff.map(person => (
             <div key={person.id} className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group transition-colors hover:bg-black/5">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full border border-primary/10 flex items-center justify-center bg-primary/10 text-lg font-bold text-primary uppercase">
                   {person.email.charAt(0)}
                 </div>
                 <div>
                   <h3 className="text-foreground font-bold mb-0.5 flex items-center gap-2">
                     {person.role === "ADMIN" ? "Propietario" : "Personal"}
                     {person.role === "ADMIN" && (
                       <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded-full">ADMIN</span>
                     )}
                   </h3>
                   <p className="text-foreground/50 text-sm font-mono">{person.email}</p>
                 </div>
               </div>

               <div className="w-full sm:w-auto flex flex-row items-center justify-between sm:justify-end gap-3 border-t border-black/5 pt-4 sm:border-0 sm:pt-0">
                  {person.role !== "ADMIN" && (
                      <button type="button" onClick={() => shareViaWhatsApp(person.email)} title="Avisar por WhatsApp" className="text-foreground/50 hover:text-[#25D366] transition-colors p-2 rounded-lg hover:bg-white/5">
                        <Smartphone size={20} />
                      </button>
                  )}
                  
                  {person.role !== "ADMIN" && (
                     <button onClick={() => handleRevoke(person.email)} className="text-xs font-semibold text-error hover:text-white hover:bg-error px-3 py-1.5 rounded-lg border border-error/20 transition-all flex items-center gap-1.5">
                       <Trash2 size={14} /> Quitar
                     </button>
                  )}
               </div>
             </div>
           ))}
           {staff.length === 0 && (
             <div className="text-center py-12 text-foreground/30 border border-black/5 rounded-2xl border-dashed">
                <Users size={32} className="mx-auto mb-2 opacity-20" />
                No hay personal registrado en la base de datos
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
