"use client";

import { useState, useEffect } from "react";

export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback message if prompt is not available (e.g. iOS or already installed)
      alert("Para instalar la app, usa la opción 'Añadir a la pantalla de inicio' de tu navegador (En Chrome/Safari de iOS). Si ya está instalada, no aparecerá esta opción.");
    }
  };

  return (
    <button
      onClick={handleInstallClick}
      className="bg-primary hover:bg-primary-hover active:scale-95 transition-all px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 text-white"
    >
      Instalar App
    </button>
  );
}
