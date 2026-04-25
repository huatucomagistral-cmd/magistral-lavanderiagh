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
  const setHasLicense = useStore((state) => state.setHasLicense);
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
            setHasLicense(true);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: data.role as "ADMIN" | "PERSONAL",
              storeId: data.storeId || "demo-store",
            });
            setAuthError(null);

          } else if (OWNER_EMAILS.includes(email)) {
            // Bootstrap: correo del dueño original → crear su tienda
            setHasLicense(true);
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
            const tieneAcceso = await verificarLicencia(email);

            if (tieneAcceso) {
              // ✅ Licencia válida → puede registrar su lavandería
              setHasLicense(true);
              if (pathname && !pathname.startsWith("/registro")) {
                router.push("/registro");
              }
            } else {
              // ❌ Sin licencia → Seteamos estado para mostrar modal
              setHasLicense(false);
              // Seteamos un usuario básico para que la app no lo saque de inmediato
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                role: "ADMIN",
                storeId: "no-license",
              });
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
