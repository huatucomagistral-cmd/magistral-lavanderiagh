"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Users, Receipt, Package, Settings, LogOut, Menu, X, ClipboardList, TrendingUp, Megaphone, DollarSign } from "lucide-react";
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
      const blockedPaths = ["/admin/servicios", "/admin/staff", "/admin/configuracion", "/admin/reportes", "/admin/marketing"];
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary border-r border-black/5 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {currentStore?.logoUrl ? (
              <img 
                src={currentStore.logoUrl} 
                alt={currentStore.name} 
                className="w-8 h-8 rounded-lg object-contain bg-white" 
              />
            ) : (
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
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
          <p className="text-[10px] text-white/70 uppercase tracking-widest font-black">
            {user.role === "ADMIN" ? "Panel Administrador" : "Panel Personal"}
          </p>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
          <SidebarLink href="/admin" icon={<LayoutDashboard size={20} />} label="Dashboard" exact />
          <SidebarLink href="/admin/caja" icon={<Receipt size={20} />} label="Caja" />
          <SidebarLink href="/admin/gastos" icon={<DollarSign size={20} />} label="Gastos" />
          <SidebarLink
            href="/admin/pedidos"
            icon={<Package size={20} />}
            label="Órdenes"
            excludePaths={["/admin/pedidos/historial"]}
          />
          <SidebarLink href="/admin/pedidos/historial" icon={<ClipboardList size={20} />} label="Historial" />
          <SidebarLink href="/admin/clientes" icon={<Users size={20} />} label="Clientes" />
          
          {user.role === "ADMIN" && (
            <>
              <SidebarLink href="/admin/servicios" icon={<Settings size={20} />} label="Servicios" />
              <SidebarLink href="/admin/staff" icon={<Users size={20} />} label="Personal" />
              <SidebarLink href="/admin/reportes" icon={<TrendingUp size={20} />} label="Reportes" />
              <SidebarLink href="/admin/marketing" icon={<Megaphone size={20} />} label="Marketing" />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/10 mt-auto">
          {user.role === "ADMIN" && (
              <SidebarLink href="/admin/configuracion" icon={<Settings size={20} />} label="Configuración" />
          )}
          {/* Email del usuario */}
          <div className="px-3 py-2 mt-1">
            <span className="text-xs text-white/60 truncate block">{user.email}</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 w-full text-white/70 hover:text-white transition-all rounded-xl hover:bg-black/20 mt-1 font-medium">
            <LogOut size={20} />
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        <header className="glass-header h-16 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30 relative">
           
           {/* Left side: Logo + Store Name (mobile) | empty (desktop) */}
           <div className="flex items-center gap-2 md:hidden">
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
             <span className="font-bold text-white text-sm truncate max-w-[130px]">
               {currentStore?.name || "Magistral"}
             </span>
           </div>

           {/* Placeholder for desktop layout alignment */}
           <div className="hidden md:block"></div>

           {/* Right side: Role + Hamburger (mobile) | Email + Role (desktop) */}
           <div className="flex items-center gap-3">
              {/* Desktop: email + role */}
              <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-medium text-white truncate max-w-[200px]">{user.email}</span>
                  <span className="text-[10px] text-foreground/50 uppercase tracking-widest font-bold">{user.role}</span>
              </div>

              {/* Mobile: role label + hamburger */}
              <div className="flex items-center gap-2 md:hidden">
                <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">{user.role}</span>
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Abrir menú"
                >
                  <Menu size={24} />
                </button>
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

function SidebarLink({
  href, icon, label, exact = false, excludePaths = []
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
  excludePaths?: string[];
}) {
  const pathname = usePathname();

  // Excluir rutas hijas específicas (ej. Órdenes no debe activarse cuando es Historial)
  const isExcluded = excludePaths.some(p => pathname.startsWith(p));
  const isActive = !isExcluded && (
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  );
  
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
        isActive 
          ? "bg-white/20 text-white shadow-inner shadow-black/10 border border-white/20" 
          : "text-white/70 hover:text-white hover:bg-white/10"
      }`}
    >
      <div className={`${isActive ? "text-white" : "text-white/60 group-hover:text-white"} transition-colors`}>
        {icon}
      </div>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}
