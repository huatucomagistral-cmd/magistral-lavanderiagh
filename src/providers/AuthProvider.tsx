"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { verificarLicencia } from "@/lib/licencias";
import { useStore } from "@/store/useStore";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

// Correos que siempre tienen acceso de administrador (dueños originales)
const OWNER_EMAILS = ["chuatucorojas25@gmail.com"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useStore((state) => state.setUser);
  const setAuthError = useStore((state) => state.setAuthError);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.email) {
        const email = firebaseUser.email.toLowerCase();
        try {
          // 1. ¿El usuario ya tiene una tienda registrada?
          const userDoc = await getDoc(doc(db, "users", email));

          if (userDoc.exists()) {
            // Usuario conocido → acceso directo
            const data = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: data.role as "ADMIN" | "PERSONAL",
              storeId: data.storeId || "demo-store",
            });
            setAuthError(null);

          } else if (OWNER_EMAILS.includes(email)) {
            // Bootstrap: correo del dueño original → crear su tienda
            await setDoc(doc(db, "users", email), {
              email,
              role: "ADMIN",
              storeId: "demo-store",
              name: "Administrador Principal",
              createdAt: new Date().toISOString(),
            });
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: "ADMIN",
              storeId: "demo-store",
            });
            setAuthError(null);

          } else {
            // 2. Usuario nuevo → verificar licencia en magistral-afiliados
            const tieneAcceso = await verificarLicencia(email);

            if (tieneAcceso) {
              // ✅ Licencia válida → puede registrar su lavandería
              if (pathname && !pathname.startsWith("/registro")) {
                router.push("/registro");
              }
              // No llamamos setUser aquí; AuthProvider lo hará después del registro
            } else {
              // ❌ Sin licencia → cerrar sesión y mostrar error
              await signOut(auth);
              setUser(null);
              setAuthError(
                "No tienes una licencia activa para este sistema. " +
                "Adquiere tu acceso en divi.magistral.pe"
              );
            }
          }
        } catch (error) {
          console.error("Error validando acceso SaaS", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [setUser, setAuthError, pathname, router]);

  if (loading) {
    return (
      <div className="fixed inset-0 min-h-screen flex flex-col items-center justify-center z-50" style={{ backgroundColor: "#0d7b8a" }}>
        <Loader2 className="animate-spin text-white mb-4" size={32} />
        <p className="font-mono text-xs tracking-widest uppercase font-bold text-white/70">Verificando acceso...</p>
      </div>
    );
  }

  return <>{children}</>;
}
