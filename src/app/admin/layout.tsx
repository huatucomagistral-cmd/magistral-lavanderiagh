import { LayoutDashboard, Users, Receipt, Package, Settings, LogOut } from "lucide-react";
import Link from "next/link";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-white/5 hidden md:flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
              <span className="font-bold text-white text-lg">M</span>
            </div>
            <h1 className="font-bold text-xl tracking-tight text-white">
              Magistral
            </h1>
          </div>
          <p className="text-xs text-white/50 mt-1 uppercase tracking-wider font-semibold">
            Admin Panel
          </p>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-2">
          <SidebarLink href="/admin" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <SidebarLink href="/admin/caja" icon={<Receipt size={20} />} label="Caja" />
          <SidebarLink href="/admin/pedidos" icon={<Package size={20} />} label="Pedidos" />
          <SidebarLink href="/admin/servicios" icon={<Settings size={20} />} label="Servicios" />
          <SidebarLink href="/admin/staff" icon={<Users size={20} />} label="Personal" />
        </nav>

        <div className="p-4 border-t border-white/5 mt-auto">
          <SidebarLink href="/admin/configuracion" icon={<Settings size={20} />} label="Configuración" />
          <button className="flex items-center gap-3 px-3 py-2 w-full text-white/50 hover:text-error transition-colors rounded-lg hover:bg-white/5 mt-2">
            <LogOut size={20} />
            <span className="font-medium text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header - Mobile mostly, but visible here as status bar */}
        <header className="glass-header h-16 flex items-center justify-end px-6">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center text-sm font-bold text-primary">
                O
              </div>
              <span className="text-sm font-medium">Owner Demo</span>
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
