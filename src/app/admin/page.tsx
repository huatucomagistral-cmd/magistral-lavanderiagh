"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminRedirect() {
  const router = useRouter();
  const { user } = useStore();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!user?.storeId) return;

    const checkCajaState = async () => {
      try {
        // Consultamos directamente Firebase para evitar parpadeos y retardos de sincronización
        const docRef = doc(db, `stores/${user.storeId}/caja/sesion`);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().isOpen === true) {
          // Caja está ABIERTA -> Ir directo a Órdenes
          router.replace("/admin/pedidos");
        } else {
          // Caja está CERRADA -> Obligarlos a abrirla primero
          router.replace("/admin/caja");
        }
      } catch (error) {
        console.error("Error comprobando el estado de la caja", error);
        setErrorMsg("Error de conexión. Redirigiendo a Caja...");
        // Seguridad por defecto: mandarlos a caja
        setTimeout(() => router.replace("/admin/caja"), 1500);
      }
    };

    checkCajaState();
  }, [user, router]);

  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="text-foreground/50 font-medium animate-pulse text-lg">
        {errorMsg || "Redirigiendo a tu área de trabajo..."}
      </p>
    </div>
  );
}
