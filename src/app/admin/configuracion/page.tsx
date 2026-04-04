"use client";

import { useState, useEffect } from "react";
import { Save, UploadCloud, ImageIcon } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useStore } from "@/store/useStore";

export default function ConfigPage() {
  const { user } = useStore();
  const [storeName, setStoreName] = useState("Lavandería Sol");
  const [slug, setSlug] = useState("lavanderia-sol");
  const [color, setColor] = useState("#3b82f6");
  const [yapeNumber, setYapeNumber] = useState("");
  const [yapeName, setYapeName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [yapeQrFile, setYapeQrFile] = useState<File | null>(null);
  const [yapeQrPreview, setYapeQrPreview] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!user?.storeId) return;
      try {
        const snap = await getDoc(doc(db, "stores", user.storeId));
        if (snap.exists()) {
          const data = snap.data();
          setStoreName(data.storeName || "Lavandería Magistral");
          setSlug(data.slug || "demo-store");
          setColor(data.color || "#3b82f6");
          setYapeNumber(data.yapeNumber || "");
          setYapeName(data.yapeName || "");
          if (data.yapeQrUrl) setYapeQrPreview(data.yapeQrUrl);
          if (data.logoUrl) setLogoPreview(data.logoUrl);
        }
      } catch (err) {
        console.error("Error fetching config", err);
      } finally {
        setIsFetching(false);
      }
    };
    fetchConfig();
  }, [user?.storeId]);

  const handleYapeQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setYapeQrFile(file);
      setYapeQrPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let uploadedQrUrl = yapeQrPreview; // Mantiene el previo si existe
      let uploadedLogoUrl = logoPreview;

      if (!user?.storeId) throw new Error("Store ID missing");

      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const logoRef = ref(storage, `stores/${user.storeId}/config/logo_${Date.now()}.${fileExt}`);
        await uploadBytes(logoRef, logoFile);
        uploadedLogoUrl = await getDownloadURL(logoRef);
      }

      if (yapeQrFile) {
        const fileExt = yapeQrFile.name.split(".").pop();
        const storageRef = ref(storage, `stores/${user.storeId}/config/yapeQr_${Date.now()}.${fileExt}`);
        await uploadBytes(storageRef, yapeQrFile);
        uploadedQrUrl = await getDownloadURL(storageRef);
      }

      await setDoc(doc(db, "stores", user.storeId), {
        storeName,
        slug,
        color,
        yapeNumber,
        yapeName,
        yapeQrUrl: uploadedQrUrl,
        logoUrl: uploadedLogoUrl,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert("Configuración Guardada exitosamente.");
    } catch (err) {
      console.error("Error al guardar config", err);
      alert("Error al guardar la configuración.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <div className="text-white">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Configuración de Tienda</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
          
          {/* Datos Generales */}
          <section className="glass-card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Datos Generales</h2>
            
            <div className="flex flex-col md:flex-row gap-6">
               <label className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center shrink-0 hover:bg-white/10 transition-colors cursor-pointer group overflow-hidden relative">
                  {logoPreview ? (
                     <img src={logoPreview} alt="Logo" className="w-full h-full object-contain bg-white" />
                  ) : (
                     <>
                        <UploadCloud className="text-white/50 group-hover:text-primary transition-colors" size={24} />
                        <span className="text-xs text-white/50 mt-2 font-medium text-center leading-tight px-1">Subir Logo</span>
                     </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
               </label>
               
               <div className="flex-1 space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-white/70 mb-1">Nombre Comercial</label>
                   <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} required
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                   />
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-white/70 mb-1">URL Pública (Slug)</label>
                     <div className="flex items-center">
                       <span className="bg-white/5 border border-white/10 border-r-0 rounded-l-xl px-3 py-2.5 text-white/40 text-sm">/</span>
                       <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                         className="flex-1 bg-white/5 border border-white/10 rounded-r-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                       />
                     </div>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-white/70 mb-1">Color Principal</label>
                     <div className="flex items-center gap-3">
                       <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                         className="w-10 h-10 rounded-xl bg-transparent border-0 p-0 cursor-pointer"
                       />
                       <span className="text-white/50 text-sm uppercase font-mono">{color}</span>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </section>

          {/* Pagos por Yape */}
          <section className="glass-card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Configuración de Pagos (Yape/Plin)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-medium text-white/70 mb-1">Número Destino</label>
                   <input type="tel" value={yapeNumber} onChange={(e) => setYapeNumber(e.target.value)} required
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#742284]"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-white/70 mb-1">Nombre del Titular</label>
                   <input type="text" value={yapeName} onChange={(e) => setYapeName(e.target.value)} required
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#742284]"
                   />
                 </div>
                 
                 <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-white/70 mb-2">Imagen QR Oficial (Yape/Plin)</label>
                   <div className="flex items-center gap-4">
                      {yapeQrPreview && (
                        <div className="w-24 h-24 rounded-xl border border-white/10 overflow-hidden shrink-0 bg-white items-center flex justify-center">
                           <img src={yapeQrPreview} alt="QR Preview" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <label className="flex-1 border-2 border-dashed border-white/10 hover:border-[#742284]/50 bg-black/20 rounded-xl px-4 py-6 text-center cursor-pointer transition-colors group">
                         <ImageIcon size={24} className="text-white/30 group-hover:text-[#742284] mx-auto mb-2" />
                         <span className="text-white/70 text-sm font-medium">Toca aquí para seleccionar tu QR</span>
                         <input type="file" accept="image/*" className="hidden" onChange={handleYapeQrChange} />
                      </label>
                   </div>
                 </div>
            </div>
            <p className="text-xs text-warning/80 bg-warning/10 p-3 rounded-lg border border-warning/20">
              Estos datos junto con el QR se usarán para la pantalla de cobro que verán tus clientes.
            </p>
          </section>

          <div className="flex justify-end">
             <button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary-hover active:scale-95 transition-all text-white font-semibold rounded-xl px-6 py-3 flex items-center gap-2">
               {isLoading ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" /> : <Save size={20} />}
               <span>Guardar Cambios</span>
             </button>
          </div>
        </form>

         {/* Preview Panel */}
         <div className="lg:col-span-1 hidden lg:block">
            <div className="glass-card p-6 sticky top-24">
              <h3 className="text-white font-medium mb-4 text-center">Vista Previa (Tema)</h3>
              <div className="aspect-[9/16] bg-black rounded-3xl border-[6px] border-white/10 overflow-hidden relative shadow-2xl">
                 {/* Header Mock */}
                 <div className="h-16 flex items-center px-4 z-10 relative gap-3" style={{ background: `linear-gradient(135deg, ${color}, #0a0a0a)` }}>
                    {logoPreview ? (
                       <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 border border-white/20">
                          <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                       </div>
                    ) : (
                       <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-xs shrink-0">L</div>
                    )}
                    <span className="text-white font-bold text-sm truncate">{storeName || 'Tienda'}</span>
                 </div>
                 {/* Body Mock */}
                 <div className="p-4 relative">
                    <div className="absolute top-0 right-[-50px] w-32 h-32 blur-[40px] opacity-30 rounded-full pointer-events-none" style={{ backgroundColor: color }} />
                    <div className="h-6 w-3/4 bg-white/10 rounded mb-4" />
                    <div className="h-20 w-full bg-white/5 rounded-xl border border-white/5 mb-2" />
                    <div className="h-20 w-full bg-white/5 rounded-xl border border-white/5" />
                    
                    <div className="mt-8 mx-auto w-24 h-24 bg-white rounded-xl flex items-center justify-center p-2">
                       <div className="w-full h-full bg-[#742284]/20 rounded-lg border border-[#742284]/30" />
                    </div>
                 </div>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
}
