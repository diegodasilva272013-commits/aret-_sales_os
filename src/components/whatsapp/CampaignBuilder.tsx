"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

type WaLine = { id: string; label: string | null; phone: string | null; status: string; channel_type: string }
type WaContact = { id: string; phone: string; name: string | null; alias: string | null }
type MetaTemplate = {
  name: string
  language: string
  category: string
  body: string
  header: string | null
  variable_count: number
}
type TemplateConfig = { name: string; language: string; variable_fields?: string[] }
type Variation = { body: string; media_url?: string; template?: TemplateConfig }

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
  // Template mode (Meta only)
  const [useTemplate, setUseTemplate] = useState(false)
  const [templates, setTemplates] = useState<MetaTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)

  // Step 4
  const [config, setConfig] = useState(DEFAULT_CONFIG)

  const selectedLine = lines.find(l => l.id === lineId)
  const isMetaLine = selectedLine?.channel_type === "meta"

  // Load templates when switching to template mode
  const loadTemplates = async () => {
    if (templates.length > 0) return
    setLoadingTemplates(true)
    setTemplateError(null)
    try {
      const res = await fetch("/api/whatsapp/templates")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTemplates(data.templates || [])
      if ((data.templates || []).length === 0) setTemplateError("No hay plantillas aprobadas en tu cuenta de Meta.")
    } catch (e: unknown) {
      setTemplateError(e instanceof Error ? e.message : "Error al cargar plantillas")
    } finally {
      setLoadingTemplates(false)
    }
  }

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
    if (step === 2) {
      if (useTemplate) return !!variations[0]?.template?.name
      return variations.every(v => v.body.trim().length > 0)
    }
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

            {/* Toggle: texto libre vs plantilla Meta */}
            <div className="flex gap-2 p-1 rounded-xl" style={{ background: "var(--surface-2)" }}>
              <button
                onClick={() => setUseTemplate(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: !useTemplate ? "var(--surface)" : "transparent",
                  color: !useTemplate ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: !useTemplate ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                }}
              >
                Texto libre
              </button>
              <button
                onClick={() => { setUseTemplate(true); loadTemplates() }}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: useTemplate ? "var(--surface)" : "transparent",
                  color: useTemplate ? "var(--accent)" : "var(--text-muted)",
                  boxShadow: useTemplate ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Plantilla Meta
              </button>
            </div>

            {/* Info banner según modo */}
            {!useTemplate && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.2)", color: "#eab308" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>El texto libre solo funciona dentro de la ventana de 24hs. Si el contacto no te escribió recientemente, usá <strong>Plantilla Meta</strong>.</span>
              </div>
            )}
            {useTemplate && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Las plantillas aprobadas por Meta se envían <strong>sin límite de 24hs</strong>. Ideal para primer contacto en frío.</span>
              </div>
            )}

            {/* Modo texto libre */}
            {!useTemplate && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    Variaciones ({variations.length}/5)
                  </p>
                  {variations.length < 5 && (
                    <button onClick={addVariation} className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ color: "var(--accent)", background: "rgba(108,99,255,0.1)" }}>
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
                        {["[name]", "[alias]", "[phone]"].map(variable => (
                          <button key={variable} onClick={() => insertVariable(i, variable)}
                            className="text-xs px-2 py-1 rounded-lg font-mono"
                            style={{ color: "var(--text-muted)", background: "var(--surface)", border: "1px solid var(--border)" }}>
                            {variable}
                          </button>
                        ))}
                        {variations.length > 1 && (
                          <button onClick={() => removeVariation(i)} className="text-xs px-2 py-1 rounded-lg"
                            style={{ color: "var(--danger)", background: "rgba(239,68,68,0.08)" }}>
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      value={v.body}
                      onChange={e => setVariations(prev => prev.map((vr, vi) => vi === i ? { ...vr, body: e.target.value } : vr))}
                      placeholder="Hola [name], te escribo porque..."
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>
                ))}
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Las variables [name], [alias], [phone] se reemplazan con los datos de cada contacto.
                </p>
              </>
            )}

            {/* Modo plantilla */}
            {useTemplate && (
              <div className="space-y-3">
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-10 gap-3">
                    <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando plantillas...</span>
                  </div>
                ) : templateError ? (
                  <div className="text-sm px-4 py-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    {templateError}
                  </div>
                ) : templates.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                    No se encontraron plantillas aprobadas.
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                      Seleccioná una plantilla aprobada:
                    </p>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {templates.map(t => {
                        const isSelected = variations[0]?.template?.name === t.name
                        return (
                          <div
                            key={t.name + t.language}
                            onClick={() => {
                              setVariations([{
                                body: t.body,
                                template: { name: t.name, language: t.language, variable_fields: t.variable_count > 0 ? ["name"] : [] },
                              }])
                            }}
                            className="rounded-xl p-4 cursor-pointer transition-all"
                            style={{
                              border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                              background: isSelected ? "rgba(108,99,255,0.06)" : "var(--surface-2)",
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-medium" style={{ color: "var(--text-primary)" }}>{t.name}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                                  {t.language}
                                </span>
                                {t.variable_count > 0 && (
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(108,99,255,0.12)", color: "var(--accent)" }}>
                                    {t.variable_count} variable{t.variable_count > 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" stroke="none">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z"/>
                                </svg>
                              )}
                            </div>
                            <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>{t.body}</p>

                            {/* Si tiene variables, mostrar mapeo */}
                            {isSelected && t.variable_count > 0 && (
                              <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
                                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                                  Mapear variables:
                                </p>
                                {Array.from({ length: t.variable_count }, (_, vi) => (
                                  <div key={vi} className="flex items-center gap-2">
                                    <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: "var(--surface)", color: "var(--accent)", minWidth: "40px", textAlign: "center" }}>
                                      {`{{${vi + 1}}}`}
                                    </span>
                                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>→</span>
                                    <select
                                      value={variations[0]?.template?.variable_fields?.[vi] || "name"}
                                      onChange={e => {
                                        setVariations(prev => {
                                          const fields = [...(prev[0]?.template?.variable_fields || [])]
                                          fields[vi] = e.target.value
                                          return [{ ...prev[0], template: { ...prev[0].template!, variable_fields: fields } }]
                                        })
                                      }}
                                      className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
                                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                                    >
                                      <option value="name">Nombre del contacto</option>
                                      <option value="alias">Alias del contacto</option>
                                      <option value="phone">Teléfono</option>
                                    </select>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
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
