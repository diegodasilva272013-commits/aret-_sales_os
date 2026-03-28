import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Decoración fondo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-60 -left-60 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)" }} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="font-bold text-lg gradient-text">Arete Prospector</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={undefined}>
            Iniciar sesión
          </Link>
          <Link href="/login" className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
            Empezar gratis →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-6 pt-20 pb-24 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8"
          style={{ background: "rgba(108,99,255,0.15)", color: "var(--accent-light)", border: "1px solid rgba(108,99,255,0.3)" }}>
          ✨ Prospección inteligente con IA
        </div>
        <h1 className="text-5xl font-black mb-6 leading-tight" style={{ color: "var(--text-primary)" }}>
          Convertí perfiles de LinkedIn{" "}
          <span className="gradient-text">en clientes</span>{" "}
          con IA
        </h1>
        <p className="text-lg mb-10 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          Analizá perfiles de LinkedIn e Instagram, generá mensajes hiperpersonalizados y gestioná todo tu equipo de setters desde un solo lugar.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/login" className="px-8 py-4 rounded-2xl font-bold text-base transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white", boxShadow: "0 8px 32px rgba(108,99,255,0.3)" }}>
            Crear cuenta gratis →
          </Link>
          <a href="#features" className="px-8 py-4 rounded-2xl font-semibold text-base transition-all"
            style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            Ver cómo funciona
          </a>
        </div>
        <p className="mt-5 text-xs" style={{ color: "var(--text-muted)" }}>Sin tarjeta de crédito · 50 análisis gratis</p>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-6 pb-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: "🧠",
              title: "Análisis psicológico",
              desc: "Detecta el perfil DISC, estilo de comunicación y puntos de dolor de cada prospecto automáticamente.",
            },
            {
              icon: "✍️",
              title: "Mensajes personalizados",
              desc: "Genera 6+ mensajes de seguimiento únicos por prospecto, adaptados a cada fase del proceso de venta.",
            },
            {
              icon: "👥",
              title: "Gestión de equipo",
              desc: "Invitá setters, asigná leads, exportá datos y controlá el progreso desde el panel de admin.",
            },
            {
              icon: "🏢",
              title: "Búsqueda de empresas",
              desc: "Encontrá empresas con Google Maps, analizalas con IA y encontrá al decisor de compra.",
            },
            {
              icon: "📊",
              title: "Dashboard en tiempo real",
              desc: "Métricas de conversión, ranking de setters, tasa de respuesta y distribución por fase.",
            },
            {
              icon: "📤",
              title: "Exportación CSV",
              desc: "Exportá tus prospectos y empresas en un click para usar en tu CRM o herramientas externas.",
            },
          ].map(f => (
            <div key={f.title} className="p-6 rounded-2xl transition-all hover:scale-[1.02]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold mb-2" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 px-6 pb-32 max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-3" style={{ color: "var(--text-primary)" }}>Planes simples</h2>
        <p className="text-center mb-12 text-sm" style={{ color: "var(--text-muted)" }}>Empezá gratis, escalá cuando lo necesités</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { name: "Free", price: "$0", analyses: "50 análisis/mes", setters: "1 setter", color: "var(--surface)", highlight: false },
            { name: "Pro", price: "$49", analyses: "200 análisis/mes", setters: "5 setters", color: "linear-gradient(135deg, rgba(108,99,255,0.15), rgba(124,58,237,0.15))", highlight: true },
            { name: "Agency", price: "$150", analyses: "Ilimitado", setters: "Setters ilimitados", color: "var(--surface)", highlight: false },
          ].map(plan => (
            <div key={plan.name} className="p-6 rounded-2xl relative"
              style={{ background: plan.color, border: plan.highlight ? "2px solid var(--accent)" : "1px solid var(--border)" }}>
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "var(--accent)", color: "white" }}>
                  Más popular
                </div>
              )}
              <h3 className="font-bold text-lg mb-1" style={{ color: "var(--text-primary)" }}>{plan.name}</h3>
              <p className="text-3xl font-black mb-1 gradient-text">{plan.price}<span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>/mes</span></p>
              <div className="mt-4 space-y-2 mb-6">
                <p className="text-sm flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--success)" }}>✓</span> {plan.analyses}
                </p>
                <p className="text-sm flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--success)" }}>✓</span> {plan.setters}
                </p>
                <p className="text-sm flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--success)" }}>✓</span> Exportación CSV
                </p>
                <p className="text-sm flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--success)" }}>✓</span> Panel admin
                </p>
              </div>
              <Link href="/login"
                className="block w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all"
                style={{
                  background: plan.highlight ? "linear-gradient(135deg, var(--accent), #7c3aed)" : "var(--surface-2)",
                  color: plan.highlight ? "white" : "var(--text-secondary)",
                  border: plan.highlight ? "none" : "1px solid var(--border)",
                }}>
                Empezar
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t py-8 text-center text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        Arete Soluciones © {new Date().getFullYear()} · Todos los derechos reservados
      </footer>
    </div>
  )
}
