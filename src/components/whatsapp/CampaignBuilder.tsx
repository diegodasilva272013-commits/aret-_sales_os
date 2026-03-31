"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

type WaLine = { id: string; label: string | null; phone: string | null; status: string }
type WaContact = { id: string; phone: string; name: string | null; alias: string | null }
type Variation = { body: string; media_url?: string }

const STEPS = ["Nombre y Línea", "Contactos", "Mensajes", "Anti-blocker"]

const DEFAULT_CONFIG = {
  block_size: 30,
  pause_minutes: 3,
  delay_seconds: 15,
  randomize: true,
}

export default function CampaignBuilder({ lines, contacts }: { lines: WaLine[]; contacts: WaContact[] }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [name, setName] = useState("")
  const [lineId, setLineId] = useState("")

  // Step 2
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [contactSearch, setContactSearch] = useState("")

  // Step 3
  const [variations, setVariations] = useState<Variation[]>([{ body: "" }])

  // Step 4
  const [config, setConfig] = useState(DEFAULT_CONFIG)

  const filteredContacts = contacts.filter(c => {
    if (!contactSearch) return true
    const q = contactSearch.toLowerCase()
    return c.phone.toLowerCase().includes(q) || (c.name || "").toLowerCase().includes(q)
  })

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set())
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)))
    }
  }

  const insertVariable = (varIdx: number, variable: string) => {
    setVariations(prev => prev.map((v, i) => i === varIdx ? { ...v, body: v.body + variable } : v))
  }

  const addVariation = () => {
    if (variations.length < 5) setVariations(prev => [...prev, { body: "" }])
  }

  const removeVariation = (idx: number) => {
    if (variations.length > 1) setVariations(prev => prev.filter((_, i) => i !== idx))
  }

  const canProceed = () => {
    if (step === 0) return name.trim().length > 0 && lineId !== ""
    if (step === 1) return selectedContacts.size > 0
    if (step === 2) return variations.every(v => v.body.trim().length > 0)
    return true
  }

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1)
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/whatsapp/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          line_id: lineId,
          contact_ids: Array.from(selectedContacts),
          variations,
          ...config,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al crear la campaña")
      router.push("/whatsapp/campaigns")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Nueva Campaña</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Configura tu campaña en {STEPS.length} pasos</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => i < step && setStep(i)}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all"
                style={{
                  background: i === step ? "var(--accent)" : i < step ? "rgba(34,197,94,0.15)" : "var(--surface-2)",
                  color: i === step ? "white" : i < step ? "#22c55e" : "var(--text-muted)",
                  border: i < step ? "1px solid rgba(34,197,94,0.3)" : "1px solid var(--border)",
                }}
              >
                {i < step ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block" style={{ color: i === step ? "var(--text-primary)" : "var(--text-muted)" }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-3" style={{ background: i < step ? "rgba(34,197,94,0.3)" : "var(--border)" }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

        {/* Step 0: Name + Line */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                Nombre de la campaña *
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Promo Enero 2026"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                Línea de envío *
              </label>
              {lines.length === 0 ? (
                <p className="text-sm py-3 px-4 rounded-xl" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                  No hay líneas configuradas. Ve a la pestaña Líneas y vincula una primero.
                </p>
              ) : (
                <select
                  value={lineId}
                  onChange={e => setLineId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                >
                  <option value="">Seleccionar línea...</option>
                  {lines.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.label || l.phone || l.id} — {l.status}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Select contacts */}
        {step === 1 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                {selectedContacts.size} de {contacts.length} seleccionados
              </p>
              <button
                onClick={toggleAll}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ color: "var(--accent)", background: "rgba(108,99,255,0.1)" }}
              >
                {selectedContacts.size === filteredContacts.length ? "Deseleccionar todos" : "Seleccionar todos"}
              </button>
            </div>

            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                placeholder="Buscar contactos..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>

            {contacts.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                Sin contactos. Importa un CSV en la pestaña Contactos.
              </p>
            ) : (
              <div className="rounded-xl overflow-hidden max-h-80 overflow-y-auto" style={{ border: "1px solid var(--border)" }}>
                {filteredContacts.map((c, i) => (
                  <div
                    key={c.id}
                    onClick={() => toggleContact(c.id)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                    style={{
                      borderBottom: i < filteredContacts.length - 1 ? "1px solid var(--border)" : "none",
                      background: selectedContacts.has(c.id) ? "rgba(108,99,255,0.06)" : "transparent",
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                      style={{
                        background: selectedContacts.has(c.id) ? "var(--accent)" : "transparent",
                        border: selectedContacts.has(c.id) ? "none" : "1px solid var(--border)",
                      }}
                    >
                      {selectedContacts.has(c.id) && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>{c.phone}</span>
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>{c.name || c.alias || ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Compose messages */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Variaciones de mensaje ({variations.length}/5)
              </p>
              {variations.length < 5 && (
                <button
                  onClick={addVariation}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ color: "var(--accent)", background: "rgba(108,99,255,0.1)" }}
                >
                  + Agregar variación
                </button>
              )}
            </div>

            {variations.map((v, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--accent)", color: "white" }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Variable buttons */}
                    {["[name]", "[alias]", "[phone]"].map(variable => (
                      <button
                        key={variable}
                        onClick={() => insertVariable(i, variable)}
                        className="text-xs px-2 py-1 rounded-lg font-mono"
                        style={{ color: "var(--text-muted)", background: "var(--surface)", border: "1px solid var(--border)" }}
                      >
                        {variable}
                      </button>
                    ))}
                    {variations.length > 1 && (
                      <button
                        onClick={() => removeVariation(i)}
                        className="text-xs px-2 py-1 rounded-lg"
                        style={{ color: "var(--danger)", background: "rgba(239,68,68,0.08)" }}
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={v.body}
                  onChange={e => setVariations(prev => prev.map((vr, vi) => vi === i ? { ...vr, body: e.target.value } : vr))}
                  placeholder={`Hola [name], te escribo porque...`}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
                <div className="flex items-center gap-2 mt-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Media (imagen/video) — disponible cuando el servidor Baileys esté activo
                  </span>
                </div>
              </div>
            ))}

            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Tip: Las variables [name], [alias], [phone] se reemplazan con los datos de cada contacto.
                Las variaciones se distribuyen aleatoriamente entre los contactos.
            </p>
          </div>
        )}

        {/* Step 3: Anti-blocker config */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Tamaño de bloque
                </label>
                <span className="text-sm font-bold px-3 py-1 rounded-xl" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
                  {config.block_size} mensajes
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={config.block_size}
                onChange={e => setConfig(c => ({ ...c, block_size: +e.target.value }))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, var(--accent) ${((config.block_size - 10) / 90) * 100}%, var(--surface-2) ${((config.block_size - 10) / 90) * 100}%)` }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                <span>10</span><span>100</span>
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                Envía mensajes en bloques de este tamaño. Bloque más pequeño = menor riesgo de baneo.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Pausa entre bloques
                </label>
                <span className="text-sm font-bold px-3 py-1 rounded-xl" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
                  {config.pause_minutes} min
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={config.pause_minutes}
                onChange={e => setConfig(c => ({ ...c, pause_minutes: +e.target.value }))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, var(--accent) ${((config.pause_minutes - 1) / 9) * 100}%, var(--surface-2) ${((config.pause_minutes - 1) / 9) * 100}%)` }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                <span>1 min</span><span>10 min</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Demora entre mensajes
                </label>
                <span className="text-sm font-bold px-3 py-1 rounded-xl" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
                  {config.delay_seconds} seg
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={config.delay_seconds}
                onChange={e => setConfig(c => ({ ...c, delay_seconds: +e.target.value }))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, var(--accent) ${((config.delay_seconds - 5) / 55) * 100}%, var(--surface-2) ${((config.delay_seconds - 5) / 55) * 100}%)` }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                <span>5 seg</span><span>60 seg</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Randomización de tiempos</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Varía ligeramente los intervalos para simular comportamiento humano
                </p>
              </div>
              <button
                onClick={() => setConfig(c => ({ ...c, randomize: !c.randomize }))}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
                style={{ background: config.randomize ? "var(--accent)" : "var(--surface)", border: "1px solid var(--border)" }}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm"
                  style={{ transform: config.randomize ? "translateX(24px)" : "translateX(3px)" }}
                />
              </button>
            </div>

            <div className="p-4 rounded-xl" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "#eab308" }}>Resumen de la configuración</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Se enviarán {config.block_size} mensajes, luego {config.pause_minutes} min de pausa, con {config.delay_seconds}s entre cada envío
                {config.randomize ? " (tiempos aleatorizados)" : ""}.
                Tiempo estimado para {selectedContacts.size} contactos:{" "}
                <strong style={{ color: "var(--text-secondary)" }}>
                  {(() => {
                    const blocks = Math.ceil(selectedContacts.size / config.block_size)
                    const totalSecs = selectedContacts.size * config.delay_seconds + (blocks - 1) * config.pause_minutes * 60
                    const mins = Math.round(totalSecs / 60)
                    return mins < 60 ? `~${mins} min` : `~${Math.round(mins / 60)}h ${mins % 60}min`
                  })()}
                </strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className="px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-30"
          style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          Atrás
        </button>
        <div className="flex-1" />
        {step < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            Siguiente
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving || !canProceed()}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
            style={{ background: "#25d366" }}
          >
            {saving ? "Creando campaña..." : "Crear campaña"}
          </button>
        )}
      </div>
    </div>
  )
}
