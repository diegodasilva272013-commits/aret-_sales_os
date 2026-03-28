"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const BUSINESS_TYPES = [
  "Restaurante", "Hotel", "Clínica médica", "Consultora", "Agencia de marketing",
  "Empresa de logística", "Inmobiliaria", "Estudio contable", "Estudio jurídico",
  "Empresa de construcción", "Empresa de software", "Retail / Tienda", "Gimnasio",
  "Academia / Instituto", "Empresa manufacturera", "Empresa de seguridad",
  "Agencia de viajes", "Centro estético", "Empresa de limpieza", "Distribuidora",
]

const COUNTRIES = [
  "Argentina", "México", "Colombia", "Chile", "Perú", "Uruguay", "Bolivia",
  "Paraguay", "Ecuador", "Venezuela", "España", "Estados Unidos",
]

type Business = {
  place_id: string
  name: string
  category: string
  address: string
  city: string
  country: string
  phone: string
  website: string
  google_rating: number | null
  google_maps_url: string
}

type BizState = {
  saved: boolean
  businessId?: string
  analyzed: boolean
  saving: boolean
  analyzing: boolean
}

export default function FindPage() {
  const [businessType, setBusinessType] = useState("")
  const [customType, setCustomType] = useState("")
  const [city, setCity] = useState("")
  const [country, setCountry] = useState("Argentina")
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [results, setResults] = useState<Business[]>([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState("")
  const [savingAll, setSavingAll] = useState(false)
  const [bizStates, setBizStates] = useState<Record<string, BizState>>({})
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [shownIds, setShownIds] = useState<string[]>([])
  const [lastQuery, setLastQuery] = useState({ query: "", location: "", country: "" })
  const router = useRouter()

  function setBizState(placeId: string, update: Partial<BizState>) {
    setBizStates(prev => ({ ...prev, [placeId]: { ...prev[placeId], ...update } }))
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const type = customType || businessType
    if (!type || !city) { setError("Completá el tipo de empresa y la ciudad"); return }
    setLoading(true)
    setError("")
    setResults([])
    setBizStates({})
    setNextPageToken(null)
    setShownIds([])

    const q = { query: type, location: city, country }
    setLastQuery(q)

    try {
      const res = await fetch("/api/businesses/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(q),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error en la búsqueda")
      const newBizs = data.businesses || []
      setResults(newBizs)
      setShownIds(newBizs.map((b: Business) => b.place_id))
      setNextPageToken(data.nextPageToken || null)
      setSearched(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  async function handleLoadMore() {
    if (!nextPageToken && shownIds.length === 0) return
    setLoadingMore(true)
    try {
      const res = await fetch("/api/businesses/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...lastQuery,
          pageToken: nextPageToken || undefined,
          excludeIds: shownIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")
      const newBizs: Business[] = data.businesses || []
      setResults(prev => [...prev, ...newBizs])
      setShownIds(prev => [...prev, ...newBizs.map(b => b.place_id)])
      setNextPageToken(data.nextPageToken || null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error buscando más")
    } finally {
      setLoadingMore(false)
    }
  }

  async function handleSave(biz: Business) {
    setBizState(biz.place_id, { saving: true })
    try {
      const res = await fetch("/api/businesses/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business: biz }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBizState(biz.place_id, { saved: true, businessId: data.businessId, saving: false })
    } catch {
      setBizState(biz.place_id, { saving: false })
      alert("Error guardando empresa")
    }
  }

  async function handleSaveAll() {
    setSavingAll(true)
    const unsaved = results.filter(b => !bizStates[b.place_id]?.saved)
    await Promise.all(unsaved.map(biz => handleSave(biz)))
    setSavingAll(false)
  }

  async function handleAnalyze(biz: Business) {
    setBizState(biz.place_id, { analyzing: true })
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
      setBizState(biz.place_id, { analyzing: false })
      alert(err instanceof Error ? err.message : "Error analizando empresa")
    }
  }

  const savedCount = results.filter(b => bizStates[b.place_id]?.saved).length

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--background)" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Buscar Empresas</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Encontrá empresas por rubro y zona — guardá la lista o analizá cada una con IA
          </p>
        </div>

        {/* Search form */}
        <div className="rounded-2xl p-6 mb-6 animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <form onSubmit={handleSearch} className="grid grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Tipo de empresa</label>
              <select
                value={businessType}
                onChange={e => { setBusinessType(e.target.value); setCustomType("") }}
                className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                <option value="">Seleccionar...</option>
                {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>O escribí un rubro</label>
              <input
                value={customType}
                onChange={e => setCustomType(e.target.value)}
                placeholder="Ej: empresa de RRHH..."
                className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Ciudad / Zona</label>
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Ej: Buenos Aires..."
                required
                className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>País</label>
              <div className="flex gap-2">
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="flex-1 px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="submit" disabled={loading}
                  className="px-5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Buscando...
                    </span>
                  ) : "🔍 Buscar"}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {searched && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                {results.length > 0 ? `${results.length} empresas encontradas` : "No se encontraron empresas"}
                {nextPageToken && <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>(hay más disponibles)</span>}
                {savedCount > 0 && <span className="ml-2" style={{ color: "var(--success)" }}>· {savedCount} guardadas</span>}
              </p>
              {results.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveAll}
                    disabled={savingAll || savedCount === results.length}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ background: "var(--surface)", border: "1px solid var(--accent)", color: "var(--accent-light)" }}>
                    {savingAll ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        Guardando...
                      </span>
                    ) : savedCount === results.length ? "✓ Lista guardada" : "💾 Guardar toda la lista"}
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-3">
              {results.map(biz => {
                const state = bizStates[biz.place_id] || {}
                return (
                  <div key={biz.place_id}
                    className="rounded-2xl p-5 transition-all"
                    style={{
                      background: "var(--surface)",
                      border: `1px solid ${state.saved ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
                    }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                          <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{biz.name}</h3>
                          {state.saved && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                              ✓ Guardada
                            </span>
                          )}
                          {biz.google_rating && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.15)", color: "var(--warning)" }}>
                              ⭐ {biz.google_rating}
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                            {biz.category}
                          </span>
                        </div>
                        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>📍 {biz.address}</p>
                        <div className="flex items-center gap-4 flex-wrap">
                          {biz.phone && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>📞 {biz.phone}</span>}
                          {biz.website && (
                            <a href={biz.website} target="_blank" rel="noopener noreferrer"
                              className="text-xs hover:underline" style={{ color: "var(--accent-light)" }}>
                              🌐 {biz.website.replace(/https?:\/\//, "").split("/")[0]}
                            </a>
                          )}
                          {biz.google_maps_url && (
                            <a href={biz.google_maps_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>
                              Ver en Maps →
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Guardar sin IA */}
                        {!state.saved && (
                          <button
                            onClick={() => handleSave(biz)}
                            disabled={state.saving}
                            className="px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                            {state.saving ? (
                              <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                Guardando
                              </span>
                            ) : "💾 Guardar"}
                          </button>
                        )}

                        {/* Ver si ya guardada */}
                        {state.saved && state.businessId && (
                          <button
                            onClick={() => router.push(`/businesses/${state.businessId}`)}
                            className="px-3 py-2 rounded-xl text-sm font-medium"
                            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                            Ver ficha →
                          </button>
                        )}

                        {/* Analizar con IA */}
                        <button
                          onClick={() => handleAnalyze(biz)}
                          disabled={state.analyzing}
                          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-70"
                          style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                          {state.analyzing ? (
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Analizando...
                            </span>
                          ) : "⚡ Analizar con IA"}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Botón buscar más */}
            <div className="mt-6 flex items-center justify-center gap-4">
              {savedCount > 0 && (
                <button
                  onClick={() => router.push("/businesses")}
                  className="px-6 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                  Ver todas mis empresas →
                </button>
              )}
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: "var(--surface)", border: "1px solid var(--accent)", color: "var(--accent-light)" }}>
                {loadingMore ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    Buscando más...
                  </>
                ) : (
                  <>🔄 Buscar más resultados</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
