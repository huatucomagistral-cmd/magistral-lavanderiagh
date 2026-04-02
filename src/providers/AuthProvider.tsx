"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useStore } from "@/store/useStore";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useStore((state) => state.setUser);
  const setAuthError = useStore((state) => state.setAuthError);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.email) {
        try {
          // Buscamos al usuario en la BD GLOBAL de usuarios SaaS
          const userDoc = await getDoc(doc(db, "users", firebaseUser.email.toLowerCase()));
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: data.role as "ADMIN" | "PERSONAL",
              storeId: data.storeId || "demo-store",
            });
            setAuthError(null);
          } else {
            // MIGRACIÓN/BOOTSTRAP: Si es el correo del dueño original, le damos su tienda histórica
            const ownerEmails = ["chuatucorojas25@gmail.com"];
            if (ownerEmails.includes(firebaseUser.email.toLowerCase())) {
              await setDoc(doc(db, "users", firebaseUser.email.toLowerCase()), {
                email: firebaseUser.email.toLowerCase(),
                role: "ADMIN",
                storeId: "demo-store",
                name: "Administrador Principal",
                createdAt: new Date().toISOString()
              });
              
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                role: "ADMIN",
                storeId: "demo-store",
              });
              setAuthError(null);
            } else {
              // Si entra y no tiene tienda, lo redirigimos a crear su lavandería (Onboarding SaaS)
              if (pathname && !pathname.startsWith('/registro')) {
                console.warn("Usuario sin tienda SaaS:", firebaseUser.email);
                router.push('/registro');
              } else {
                 console.warn("Usuario logueado pero sin roles SaaS");
              }
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
      <div className="fixed inset-0 min-h-screen bg-background flex flex-col items-center justify-center text-white/50 z-50">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-mono text-sm tracking-wider uppercase font-bold text-primary">Cargando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
