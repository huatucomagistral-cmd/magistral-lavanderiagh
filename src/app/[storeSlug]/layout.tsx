import Link from "next/link";
import { Search, MapPin, Phone } from "lucide-react";

interface PublicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ storeSlug: string }>; // Next.js 16 dynamic route params
}

export default async function PublicLayout({ children, params }: PublicLayoutProps) {
  const { storeSlug } = await params;
  
  // En un caso real buscaríamos en Firestore la data de la tienda
  const storeData = {
    name: "Lavandería Magistral",
    color: "#3b82f6", // tailwind blue-500
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Header Glassmorphism */}
      <header className="glass-header h-16 sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
             className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-lg"
             style={{ background: `linear-gradient(135deg, ${storeData.color}, #0a0a0a)` }}
          >
            LM
          </div>
          <span className="font-bold text-lg tracking-tight text-white hidden sm:block">
             {storeData.name}
          </span>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
           <button className="glass-button w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:text-white">
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
      <footer className="mt-auto border-t border-white/5 bg-surface/30 p-8 text-center backdrop-blur-sm">
        <div className="flex justify-center gap-6 mb-4 text-white/50">
           <div className="flex items-center gap-2"><MapPin size={16}/> Lima, Perú</div>
           <div className="flex items-center gap-2"><Phone size={16}/> 987 654 321</div>
        </div>
        <p className="text-white/30 text-sm font-medium">
          Tecnología <span className="text-white/50">Magistral SaaS</span> &copy; 2026
        </p>
      </footer>
    </div>
  );
}
