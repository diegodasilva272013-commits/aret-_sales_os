"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const STATUS_CONFIG = {
  nuevo: { label: "Nuevo", color: "#6c63ff", bg: "rgba(108,99,255,0.15)" },
  activo: { label: "Activo", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  pausado: { label: "Pausado", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  llamada_agendada: { label: "Llamada Agendada", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  cerrado_ganado: { label: "Cerrado ✓", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  cerrado_perdido: { label: "Cerrado ✗", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
}

type Business = {
  id: string
  name: string
  category: string
  city: string
  country: string
  website: string
  contact_name: string
  contact_email: string
  whatsapp: string
  instagram: string
  linkedin_url: string
  status: string
  follow_up_count: number
  google_rating: number | null
  created_at: string
  profiles?: { full_name: string }
  business_analyses?: { id: string }[]
  place_id: string
  address: string
  phone: string
  google_maps_url: string
}

export default function BusinessesClient({ businesses }: { businesses: Business[] }) {
  const router = useRouter()
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  async function handleAnalyze(biz: Business) {
    setAnalyzing(biz.id)
    try {
      const res = await fetch("/api/businesses/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business: biz }),
      })
      const data = await res.json()
      if (res.status === 409) { router.push(`/businesses/${data.businessId}`); return }
      if (!res.ok) throw new Error(data.error || "Error")
      router.push(`/businesses/${data.businessId}`)
    } catch (err: unknown) {
      setAnalyzing(null)
      alert(err instanceof Error ? err.message : "Error analizando empresa")
    }
  }

  const filtered = businesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.city.toLowerCase().includes(search.toLowerCase()) ||
    b.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--background)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Empresas Prospectadas</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{businesses.length} empresas en total</p>
          </div>
          <Link href="/find"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
            🔍 Buscar empresas
          </Link>
        </div>

        {/* Search */}
        {businesses.length > 0 && (
          <div className="mb-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, ciudad o rubro..."
              className="w-full max-w-sm px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              onFocus={e => e.target.style.borderColor = "var(--accent)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
          </div>
        )}

        <div className="rounded-2xl animate-fade-in overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full" style={{ minWidth: "900px" }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                {["Empresa", "Rubro", "Ciudad", "Contacto", "Canales", "Estado", "Análisis", "Follow-ups", "Setter", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  {businesses.length === 0 ? (
                    <>No hay empresas todavía —{" "}
                    <Link href="/find" className="hover:underline" style={{ color: "var(--accent-light)" }}>buscá empresas</Link></>
                  ) : "No hay resultados para esa búsqueda"}
                </td></tr>
              ) : filtered.map(b => {
                const cfg = STATUS_CONFIG[b.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.nuevo
                const hasAnalysis = (b.business_analyses?.length ?? 0) > 0
                const isAnalyzing = analyzing === b.id
                return (
                  <tr key={b.id} style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "var(--surface-2)")}>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{b.name}</p>
                      {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer"
                        className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>
                        {b.website.replace(/https?:\/\//, "").split("/")[0]}
                      </a>}
                    </td>
                    <td className="px-4 py-4 text-xs capitalize" style={{ color: "var(--text-secondary)" }}>{b.category}</td>
                    <td className="px-4 py-4 text-xs" style={{ color: "var(--text-secondary)" }}>{b.city}</td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{b.contact_name || "—"}</p>
                      {b.contact_email && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{b.contact_email}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1.5">
                        {b.whatsapp && <span className="text-sm" title="WhatsApp">💬</span>}
                        {b.contact_email && <span className="text-sm" title="Email">📧</span>}
                        {b.instagram && <span className="text-sm" title="Instagram">📸</span>}
                        {b.linkedin_url && <span className="text-sm" title="LinkedIn">💼</span>}
                        {!b.whatsapp && !b.contact_email && !b.instagram && !b.linkedin_url &&
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 rounded-full text-xs" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-4">
                      {hasAnalysis ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>✓ Analizada</span>
                      ) : (
                        <button
                          onClick={() => handleAnalyze(b)}
                          disabled={isAnalyzing}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-60 whitespace-nowrap"
                          style={{ background: "rgba(108,99,255,0.12)", color: "var(--accent-light)", border: "1px solid rgba(108,99,255,0.25)" }}>
                          {isAnalyzing ? (
                            <>
                              <span className="w-2.5 h-2.5 border border-current/30 border-t-current rounded-full animate-spin" />
                              Analizando...
                            </>
                          ) : (
                            <>⚡ Analizar IA</>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-0.5">
                        {[0,1,2,3,4,5].map(i => (
                          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: i < (b.follow_up_count || 0) ? "var(--accent)" : "var(--surface-3)" }} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {b.profiles?.full_name?.split(" ")[0] || "—"}
                    </td>
                    <td className="px-3 py-4">
                      <Link href={`/businesses/${b.id}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                        style={{ background: "var(--accent-glow)", color: "var(--accent-light)", border: "1px solid rgba(108,99,255,0.2)" }}>
                        Ver →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
