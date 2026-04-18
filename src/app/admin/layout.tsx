"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SquaresFour, Users, Receipt, Package, Gear, SignOut, List, X, ClipboardText, ChartLineUp, CurrencyDollar, ShoppingCart } from "@phosphor-icons/react";
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
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    
    // Ignorar si estamos en menú móvil para no crear glitches
    if (isMobileMenuOpen) return;

    if (currentScrollY > lastScrollY.current + 15) {
      // Scrolling down -> ocultamos si bajó más de 15px
      setIsHeaderVisible(false);
      lastScrollY.current = currentScrollY;
    } else if (currentScrollY < lastScrollY.current - 15 || currentScrollY < 10) {
      // Scrolling up -> mostramos si subió más de 15px o está casi arriba
      setIsHeaderVisible(true);
      lastScrollY.current = currentScrollY;
    }
  };

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
      const blockedPaths = ["/admin/servicios", "/admin/staff", "/admin/configuracion", "/admin/reportes", "/admin/inventario"];
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
        useStore.getState().setCajaStatus(data.isOpen || false, data.initialCash || 0, data.openedAt || null);
      } else {
        useStore.getState().setCajaStatus(false, 0, null);
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
        <div className="h-16 px-4 lg:px-6 border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {currentStore?.logoUrl ? (
              <img
                src={currentStore.logoUrl}
                alt={currentStore.name}
                className="w-8 h-8 rounded-lg object-contain bg-white shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <span className="font-bold text-white text-lg">
                  {currentStore?.name ? currentStore.name.charAt(0).toUpperCase() : "M"}
                </span>
              </div>
            )}
            <h1 className="font-bold text-sm lg:text-base leading-tight tracking-tight text-white line-clamp-2">
              {currentStore?.name || "Magistral"}
            </h1>
          </div>
          {/* Close button for mobile */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white/50 hover:text-white shrink-0">
            <X size={20} />
          </button>
        </div>


        <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
          <SidebarLink href="/admin/caja" icon={<Receipt size={22} weight="duotone" />} label="Caja" />
          <SidebarLink href="/admin/gastos" icon={<CurrencyDollar size={22} weight="duotone" />} label="Gastos" />
          <SidebarLink href="/admin/pos" icon={<ShoppingCart size={22} weight="duotone" />} label="Tienda" />
          <SidebarLink
            href="/admin/pedidos"
            icon={<Package size={22} weight="duotone" />}
            label="Órdenes"
            excludePaths={["/admin/pedidos/historial"]}
          />
          <SidebarLink href="/admin/pedidos/historial" icon={<ClipboardText size={22} weight="duotone" />} label="Historial" />
          <SidebarLink href="/admin/clientes" icon={<Users size={22} weight="duotone" />} label="Clientes" />

          {user.role === "ADMIN" && (
            <>
              <SidebarLink href="/admin/staff" icon={<Users size={22} weight="duotone" />} label="Personales" />
              <SidebarLink href="/admin/reportes" icon={<ChartLineUp size={22} weight="duotone" />} label="Reportes" />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/10 mt-auto">
          {user.role === "ADMIN" && (
            <SidebarLink href="/admin/configuracion" icon={<Gear size={22} weight="duotone" />} label="Configuración" />
          )}
          {/* Email del usuario y Rol */}
          <div className="px-3 py-2 mt-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-white/60 truncate" title={user.email}>{user.email}</span>
              <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white font-black uppercase tracking-widest shrink-0">{user.role}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full text-white/70 hover:text-white transition-all rounded-xl hover:bg-black/20 mt-1 font-medium">
            <SignOut size={22} weight="duotone" />
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        <header className={`glass-header h-16 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 relative md:hidden border-b border-black/5 transition-all duration-300 ease-in-out ${isHeaderVisible ? "mt-0" : "-mt-16"}`}>

          {/* Left side: Logo + Store Name (mobile) */}
          <div className="flex items-center gap-2">
            {currentStore?.logoUrl ? (
              <img
                src={currentStore.logoUrl}
                alt={currentStore.name}
                className="w-7 h-7 rounded object-contain bg-white shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-sm shrink-0">
                <span className="font-bold text-white text-sm">
                  {currentStore?.name ? currentStore.name.charAt(0).toUpperCase() : "M"}
                </span>
              </div>
            )}
            <span className="font-bold text-primary text-sm line-clamp-2 max-w-[160px] leading-tight">
              {currentStore?.name || "Magistral"}
            </span>
          </div>

          {/* Right side: Hamburger (mobile) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-primary hover:text-primary-hover hover:bg-black/5 rounded-lg transition-colors"
              aria-label="Abrir menú"
            >
              <List size={24} weight="bold" />
            </button>
          </div>
        </header>


        <div className="flex-1 overflow-y-auto w-full bg-background md:bg-transparent" onScroll={handleScroll}>
          <div className="p-3 sm:p-5 max-w-6xl mx-auto w-full min-h-full">
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
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${isActive
        ? "bg-white/20 text-white shadow-inner shadow-black/10 border border-white/20"
        : "text-white/70 hover:text-white hover:bg-white/10"
        }`}
    >
      <div className="text-white transition-colors">
        {icon}
      </div>
      <span className="font-medium text-[15px] leading-[20px] text-white">{label}</span>
    </Link>
  );
}
