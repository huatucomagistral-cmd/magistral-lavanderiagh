import Link from "next/link";
import { ArrowRight, CheckCircle2, Shield, Zap, TrendingUp } from "lucide-react";

  export default function LandingPage() {
    return (
      <div className="min-h-screen bg-background text-white selection:bg-primary/30">
        
        {/* Navbar */}
        <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/magistralc.firebasestorage.app/o/MAGISTRAL_SKY_LOGOTIPO.webp?alt=media&token=85f7a83d-3bec-43de-b8af-f78408d0eeac" 
              alt="Magistral SaaS" 
              className="h-8 md:h-10 w-auto object-contain" 
            />
          </Link>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                Iniciar Sesión
              </Link>
              <Link href="/login" className="bg-primary hover:bg-primary-hover active:scale-95 transition-all px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/20">
                Crear Tienda
              </Link>
            </div>
          </div>
        </nav>
  
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          {/* Background Gradients */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 opacity-60 mix-blend-screen max-w-full" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[150px] -z-10 opacity-60 mix-blend-screen max-w-full" />
          
          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="text-white/80">La solución definitiva para el éxito de tu lavandería</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 mb-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              El software más avanzado para tu lavandería
            </h1>
            
            <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              Gestiona pedidos, controla tu caja chica, emite tickets y ofrécele a tus clientes una vista online del estado de sus prendas.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
              <Link href="/login" className="w-full sm:w-auto bg-white text-black hover:bg-gray-100 px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95">
                Empieza Gratis Ahora <ArrowRight size={20} />
              </Link>
              <Link href="/login" className="w-full sm:w-auto glass-button px-8 py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center">
                Acceso a Trabajador
              </Link>
            </div>
          </div>
        </section>

      {/* Features Showcase */}
      <section className="py-20 bg-surface/30 backdrop-blur-xl border-y border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
             <h2 className="text-3xl font-bold mb-4">Todo lo que necesitas en un solo lugar</h2>
             <p className="text-white/50 max-w-xl mx-auto">Diseñado específicamente para las necesidades logísticas y administrativas del rubro de lavanderías modernas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="glass-card p-8 group hover:bg-white/[0.03] transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Seguridad y Control Total</h3>
              <p className="text-white/60 leading-relaxed">Tu negocio, tus reglas. Toda tu información, pedidos y las finanzas de tus locales están 100% protegidas en tu propio espacio privado.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="glass-card p-8 group hover:bg-white/[0.03] transition-colors">
              <div className="w-12 h-12 rounded-xl bg-accent/20 text-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Velocidad en Tiempo Real</h3>
              <p className="text-white/60 leading-relaxed">Actualización instantánea. Los estados de pedido que cambies en el administrador se reflejan al instante en la vista del cliente.</p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-8 group hover:bg-white/[0.03] transition-colors">
              <div className="w-12 h-12 rounded-xl bg-success/20 text-success flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Gestión de Caja</h3>
              <p className="text-white/60 leading-relaxed">Aperturas y cierres de caja con historial. Gestiona múltiples trabajadores con permisos limitados y auditoría clara.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/magistralc.firebasestorage.app/o/MAGISTRAL_SKY_LOGOTIPO.webp?alt=media&token=85f7a83d-3bec-43de-b8af-f78408d0eeac" 
              alt="Magistral SaaS" 
              className="h-6 w-auto object-contain opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all" 
            />
            <span className="font-bold text-sm text-white/50">© 2026 Magistral SaaS. Todos los derechos reservados.</span>
          </div>
          <div className="flex gap-6 text-sm text-white/40">
            <a href="#" className="hover:text-white transition-colors">Términos</a>
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
