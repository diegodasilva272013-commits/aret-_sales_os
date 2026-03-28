"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function ApiKeysSection({ orgId }: { orgId: string }) {
  const supabase = createClient()
  const [openaiKey, setOpenaiKey] = useState("")
  const [mapsKey, setMapsKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showKeys, setShowKeys] = useState(false)

  useEffect(() => {
    supabase.from("org_api_keys").select("openai_key, google_maps_key").eq("organization_id", orgId).single()
      .then(({ data }) => {
        if (data) {
          setOpenaiKey(data.openai_key || "")
          setMapsKey(data.google_maps_key || "")
        }
      })
  }, [orgId])

  async function handleSave() {
    setSaving(true)
    const { data: existing } = await supabase.from("org_api_keys").select("id").eq("organization_id", orgId).single()
    if (existing) {
      await supabase.from("org_api_keys").update({ openai_key: openaiKey, google_maps_key: mapsKey, updated_at: new Date().toISOString() }).eq("organization_id", orgId)
    } else {
      await supabase.from("org_api_keys").insert({ organization_id: orgId, openai_key: openaiKey, google_maps_key: mapsKey })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all font-mono"
  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }

  return (
    <div className="p-6 rounded-2xl animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>API Keys</h2>
        <button onClick={() => setShowKeys(v => !v)}
          className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          style={{ background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
          {showKeys ? (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Ocultar</>
          ) : (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Mostrar</>
          )}
        </button>
      </div>
      <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
        Tus API keys se guardan encriptadas y nunca se exponen al cliente
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
            OpenAI API Key <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type={showKeys ? "text" : "password"}
            value={openaiKey}
            onChange={e => setOpenaiKey(e.target.value)}
            placeholder="sk-proj-..."
            className={inputCls}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Google Maps API Key
          </label>
          <input
            type={showKeys ? "text" : "password"}
            value={mapsKey}
            onChange={e => setMapsKey(e.target.value)}
            placeholder="AIzaSy..."
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-5">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {openaiKey ? "✓ OpenAI configurado" : "⚠ OpenAI requerido para analizar prospectos"}
        </p>
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: saved ? "rgba(34,197,94,0.2)" : "var(--accent)", color: saved ? "#22c55e" : "white", opacity: saving ? 0.7 : 1 }}>
          {saved ? "✓ Guardado" : saving ? "Guardando..." : "Guardar keys"}
        </button>
      </div>
    </div>
  )
}
