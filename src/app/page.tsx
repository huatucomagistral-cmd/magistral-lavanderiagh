import Link from "next/link";
import { ArrowRight, CheckCircle2, Shield, Zap, TrendingUp } from "lucide-react";
import { InstallPWAButton } from "@/components/InstallPWAButton";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm shadow-gray-100/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img
              src="https://firebasestorage.googleapis.com/v0/b/magistralc.firebasestorage.app/o/MAGISTRAL_SKY_LOGOTIPO.webp?alt=media&token=85f7a83d-3bec-43de-b8af-f78408d0eeac"
              alt="Magistral"
              className="h-8 md:h-10 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-4">
            <InstallPWAButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 opacity-60 mix-blend-screen max-w-full" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[150px] -z-10 opacity-60 mix-blend-screen max-w-full" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">

          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            Sistema digital para tu lavandería
          </h1>

          <p className="text-xl text-foreground/70 mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Gestiona pedidos, controla tu caja chica, emite tickets y ofrécele a tus clientes una vista online del estado de sus prendas.
          </p>

          <div className="flex flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link href="/login" className="bg-primary hover:bg-primary-hover px-6 py-3 rounded-xl font-bold text-white text-base flex items-center justify-center transition-all">
              Iniciar Sesión
            </Link>
            <Link href="/registro" className="bg-white text-black hover:bg-gray-100 border border-black/5 px-6 py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95">
              Crear Tienda <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-24 bg-white relative z-10">
        {/* Decorative top edge */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5DB8B0] via-[#4F86F7] to-[#A78BFA]" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-[#5DB8B0] bg-[#5DB8B0]/10 px-4 py-1.5 rounded-full mb-4">Plataforma Todo-en-Uno</span>
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-gray-900">Todo lo que necesitas <br className="hidden md:block" />en un solo lugar</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">Diseñado específicamente para las necesidades logísticas y administrativas del rubro de lavanderías modernas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group relative bg-white border border-gray-100 rounded-2xl p-8 hover:border-[#5DB8B0]/40 hover:shadow-xl hover:shadow-[#5DB8B0]/10 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#5DB8B0]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5DB8B0] to-[#3a9a92] flex items-center justify-center mb-6 shadow-lg shadow-[#5DB8B0]/30 group-hover:scale-110 transition-transform duration-300">
                  <Shield size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-3">Seguridad y Control Total</h3>
                <p className="text-gray-500 leading-relaxed text-sm">Tu negocio, tus reglas. Toda tu información, pedidos y las finanzas de tus locales están 100% protegidas en tu propio espacio privado.</p>
                <div className="mt-6 flex items-center gap-2 text-[#5DB8B0] text-xs font-black uppercase tracking-wider">
                  <span className="w-4 h-0.5 bg-[#5DB8B0] rounded-full" /> Control de acceso por roles
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-white border border-gray-100 rounded-2xl p-8 hover:border-[#4F86F7]/40 hover:shadow-xl hover:shadow-[#4F86F7]/10 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#4F86F7]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4F86F7] to-[#2563eb] flex items-center justify-center mb-6 shadow-lg shadow-[#4F86F7]/30 group-hover:scale-110 transition-transform duration-300">
                  <Zap size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-3">Velocidad en Tiempo Real</h3>
                <p className="text-gray-500 leading-relaxed text-sm">Actualización instantánea. Los estados de pedido que cambies en el administrador se reflejan al instante en la vista del cliente.</p>
                <div className="mt-6 flex items-center gap-2 text-[#4F86F7] text-xs font-black uppercase tracking-wider">
                  <span className="w-4 h-0.5 bg-[#4F86F7] rounded-full" /> Sincronización en vivo
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-white border border-gray-100 rounded-2xl p-8 hover:border-[#10b981]/40 hover:shadow-xl hover:shadow-[#10b981]/10 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center mb-6 shadow-lg shadow-[#10b981]/30 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-3">Gestión de Caja</h3>
                <p className="text-gray-500 leading-relaxed text-sm">Aperturas y cierres de caja con historial. Gestiona múltiples trabajadores con permisos limitados y auditoría clara.</p>
                <div className="mt-6 flex items-center gap-2 text-[#10b981] text-xs font-black uppercase tracking-wider">
                  <span className="w-4 h-0.5 bg-[#10b981] rounded-full" /> Efectivo y Yape separados
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-white text-gray-900 overflow-hidden border-t border-gray-100">
        {/* Gradient top edge matching features section */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#5DB8B0] via-[#4F86F7] to-[#A78BFA]" />
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-[#5DB8B0]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">

            {/* Brand side */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/magistralc.firebasestorage.app/o/MAGISTRAL_SKY_LOGOTIPO.webp?alt=media&token=85f7a83d-3bec-43de-b8af-f78408d0eeac"
                alt="Magistral"
                className="h-8 w-auto object-contain opacity-90"
              />
              <p className="text-gray-400 text-xs max-w-[220px] text-center md:text-left leading-relaxed text-gray-500">
                Sistema de gestión para lavanderías modernas. Rápido, seguro y en la nube.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-[#5DB8B0] animate-pulse" />
                <span className="text-[#5DB8B0] text-xs font-bold">Sistema Activo 24/7</span>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-col items-center md:items-end gap-4">
              <div className="flex gap-6 text-sm">
                <a href="#" className="text-gray-400 hover:text-[#5DB8B0] transition-colors font-medium">Términos</a>
                <a href="#" className="text-gray-400 hover:text-[#5DB8B0] transition-colors font-medium">Privacidad</a>
                <a href="#" className="text-gray-400 hover:text-[#5DB8B0] transition-colors font-medium">Contacto</a>
              </div>
              <span className="text-gray-400 text-xs">© 2026 Magistral. Todos los derechos reservados.</span>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}
