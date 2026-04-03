"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Users, Receipt, Package, Settings, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/store/useStore";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, currentStore } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Route Guard: Evitar que el PERSONAL entre a urls bloqueadas escribiéndolas manual
  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    if (user.role === "PERSONAL") {
      const blockedPaths = ["/admin/servicios", "/admin/staff", "/admin/configuracion"];
      if (blockedPaths.some(p => pathname.startsWith(p))) {
        router.push("/admin"); // Kick them back to dashboard
      }
    }
  }, [user, pathname, router]);

  // Sincronización en tiempo real del estado de la CAJA y de la TIENDA
  useEffect(() => {
    if (!user) return;
    
    // Escuchar el documento "sesion" para la caja de esta tienda
    const unsubCaja = onSnapshot(doc(db, `stores/${user.storeId}/caja/sesion`), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        useStore.getState().setCajaStatus(data.isOpen || false, data.initialCash || 0);
      } else {
        useStore.getState().setCajaStatus(false, 0);
      }
    });

    // Escuchar la información de la tienda en tiempo real (Logo, Nombre, etc.)
    const unsubStore = onSnapshot(doc(db, "stores", user.storeId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        useStore.getState().setStore({
          id: snap.id,
          name: data.storeName || data.name || "Mi Lavandería",
          slug: data.slug || snap.id,
          logoUrl: data.logoUrl || null,
          yapeNumber: data.yapeNumber || null,
          yapeName: data.yapeName || null,
          themeColor: data.themeColor || "#2563eb", // fallback a primary
        });
      }
    });

    return () => {
      unsubCaja();
      unsubStore();
    };
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    useStore.getState().setStore(null);
    router.push("/");
  };

  // Prevenir renderizado errático si no hay usuario o fue expulsado
  if (!user) return null;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 glass border-r border-white/5 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {currentStore?.logoUrl ? (
              <img 
                src={currentStore.logoUrl} 
                alt={currentStore.name} 
                className="w-8 h-8 rounded-lg object-contain bg-white" 
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
                <span className="font-bold text-white text-lg">
                  {currentStore?.name ? currentStore.name.charAt(0).toUpperCase() : "M"}
                </span>
              </div>
            )}
            <h1 className="font-bold text-xl tracking-tight text-white truncate max-w-[120px]">
              {currentStore?.name || "Magistral"}
            </h1>
          </div>
          {/* Close button for mobile */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white/50 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-2">
          <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
            {user.role === "ADMIN" ? "Panel Administrador" : "Panel Personal"}
          </p>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
          <SidebarLink href="/admin" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <SidebarLink href="/admin/caja" icon={<Receipt size={20} />} label="Caja" />
          <SidebarLink href="/admin/pedidos" icon={<Package size={20} />} label="Pedidos" />
          
          {user.role === "ADMIN" && (
            <>
              <SidebarLink href="/admin/servicios" icon={<Settings size={20} />} label="Servicios" />
              <SidebarLink href="/admin/staff" icon={<Users size={20} />} label="Personal" />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/5 mt-auto">
          {user.role === "ADMIN" && (
              <SidebarLink href="/admin/configuracion" icon={<Settings size={20} />} label="Configuración" />
          )}
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 w-full text-white/50 hover:text-error transition-all rounded-xl hover:bg-error/10 mt-2 font-medium">
            <LogOut size={20} />
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Top Header */}
        <header className="glass-header h-16 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30 relative">
           
           {/* Left side: Hamburger menu & Mobile Logo */}
           <div className="flex items-center gap-3 md:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Abrir menú"
              >
                <Menu size={24} />
              </button>
              
              <div className="flex items-center gap-2">
                {currentStore?.logoUrl ? (
                  <img 
                    src={currentStore.logoUrl} 
                    alt={currentStore.name} 
                    className="w-7 h-7 rounded object-contain bg-white" 
                  />
                ) : (
                  <div className="w-7 h-7 rounded bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
                    <span className="font-bold text-white text-sm">
                      {currentStore?.name ? currentStore.name.charAt(0).toUpperCase() : "M"}
                    </span>
                  </div>
                )}
                <span className="font-bold text-white text-sm truncate max-w-[100px]">
                  {currentStore?.name || "Magistral"}
                </span>
              </div>
           </div>

           {/* Placeholder for desktop layout alignment */}
           <div className="hidden md:block"></div>

           {/* Right side: User Profile */}
           <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-white truncate max-w-[120px] sm:max-w-[200px]">{user.email}</span>
                  <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">{user.role}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center text-sm font-bold text-primary uppercase shadow-lg">
                {user.email.charAt(0)}
              </div>
           </div>
        </header>
        
        <div className="flex-1 overflow-y-auto w-full">
          <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto w-full min-h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
        isActive 
          ? "bg-primary/20 text-white shadow-inner shadow-primary/20 border border-primary/20" 
          : "text-white/70 hover:text-white hover:bg-white/5"
      }`}
    >
      <div className={`${isActive ? "text-primary" : "text-white/50 group-hover:text-primary"} transition-colors`}>
        {icon}
      </div>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}
