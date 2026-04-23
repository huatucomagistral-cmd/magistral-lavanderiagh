import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

// Segunda instancia Firebase — apunta a magistral-afiliados (Divi magistral)
// Esta instancia es solo para consultar licencias, no para auth ni escritura.
const licenciasConfig = {
  apiKey: process.env.NEXT_PUBLIC_LICENCIAS_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_LICENCIAS_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_LICENCIAS_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_LICENCIAS_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_LICENCIAS_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_LICENCIAS_APP_ID,
};

const LICENCIAS_APP_NAME = "magistral-licencias";
const licenciasApp =
  getApps().find((a) => a.name === LICENCIAS_APP_NAME) ??
  initializeApp(licenciasConfig, LICENCIAS_APP_NAME);

const licenciasDb = getFirestore(licenciasApp);

/**
 * Verifica si el email tiene una licencia activa para el sistema "lavanderia"
 * en la base de datos centralizada de magistral-afiliados.
 */
export async function verificarLicencia(email: string): Promise<boolean> {
  try {
    const q = query(
      collection(licenciasDb, "licencias"),
      where("email", "==", email.toLowerCase()),
      where("sistema", "==", "lavanderia"),
      where("activo", "==", true)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    console.error("[Licencias] Error verificando licencia:", err);
    // En caso de error de red, no bloqueamos al usuario con tienda existente
    return false;
  }
}
