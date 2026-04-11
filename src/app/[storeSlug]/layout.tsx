import Link from "next/link";
import { Search, MapPin, Phone } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PublicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ storeSlug: string }>; // Next.js 16 dynamic route params
}

export default async function PublicLayout({ children, params }: PublicLayoutProps) {
  const { storeSlug } = await params;
  
  // Buscamos la tienda en la colección por el campo slug
  let storeData = null;

  try {
    const q = query(collection(db, "stores"), where("slug", "==", storeSlug.toLowerCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      storeData = {
        name: data.storeName || "Nuestra Lavandería",
        color: data.color || "#3b82f6",
        logoUrl: data.logoUrl || null,
      };
    }
  } catch (error) {
    console.error("Error obteniendo los datos de la tienda para el Layout:", error);
  }

  // SI LA TIENDA NO EXISTE, MOSTRAMOS UN 404 LIMPIO, NO EL LAYOUT
  if (!storeData) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground justify-center p-4 text-center items-center">
        <h1 className="text-6xl font-black text-black/5 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-foreground mb-2">Tienda no encontrada</h2>
        <p className="text-foreground/50 max-w-sm mx-auto">
          No hemos encontrado ninguna lavandería con el enlace <b className="text-foreground">/{storeSlug}</b>. Verifica la URL e inténtalo nuevamente.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Header Glassmorphism */}
      <header className="glass-header h-16 sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {storeData.logoUrl ? (
             <div 
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-lg overflow-hidden border border-white/20 shrink-0"
             >
                <img src={storeData.logoUrl} alt={storeData.name} className="w-full h-full object-contain" />
             </div>
          ) : (
             <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-lg shrink-0"
                style={{ background: `linear-gradient(135deg, ${storeData.color}, ${storeData.color}88)` }}
             >
               {storeData.name.charAt(0).toUpperCase()}
             </div>
          )}
          <span className="font-bold text-lg tracking-tight text-foreground hidden sm:block truncate max-w-[200px]">
             {storeData.name}
          </span>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
           <button className="glass-button w-10 h-10 flex items-center justify-center rounded-full text-foreground/70 hover:text-foreground">
             <Search size={18} />
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 relative">
        {/* Decorative ambient light */}
        <div 
           className="absolute top-0 right-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl -z-10 pointer-events-none"
           style={{ backgroundColor: storeData.color }}
        />
        {children}
      </main>

      {/* Footer Público */}
      <footer className="mt-auto border-t border-black/5 bg-white/30 p-8 text-center backdrop-blur-sm">
        <div className="flex justify-center gap-6 mb-4 text-foreground/50">
           <div className="flex items-center gap-2"><MapPin size={16}/> Lima, Perú</div>
           <div className="flex items-center gap-2"><Phone size={16}/> 987 654 321</div>
        </div>
        <p className="text-foreground/30 text-sm font-medium">
          Tecnología <span className="text-foreground/50">Magistral</span> &copy; 2026
        </p>
      </footer>
    </div>
  );
}
