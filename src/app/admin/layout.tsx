"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Users, Receipt, Package, Settings, LogOut } from "lucide-react";
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
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-white/5 hidden md:flex flex-col">
        <div className="p-6 border-b border-white/5">
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
            <h1 className="font-bold text-xl tracking-tight text-white truncate max-w-[150px]">
              {currentStore?.name || "Magistral"}
            </h1>
          </div>
          <p className="text-xs text-white/50 mt-1 uppercase tracking-wider font-semibold">
            {user.role === "ADMIN" ? "Admin Panel" : "Personal Panel"}
          </p>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-2">
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
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full text-white/50 hover:text-error transition-colors rounded-lg hover:bg-white/5 mt-2">
            <LogOut size={20} />
            <span className="font-medium text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header */}
        <header className="glass-header h-16 flex items-center justify-end px-6">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center text-sm font-bold text-primary uppercase">
                {user.email.charAt(0)}
              </div>
              <div className="flex flex-col items-end">
                  <span className="text-sm font-medium">{user.email}</span>
                  <span className="text-[10px] text-white/50 uppercase tracking-widest">{user.role}</span>
              </div>
           </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link 
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all group"
    >
      <div className="text-white/50 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}
