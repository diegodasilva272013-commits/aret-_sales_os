"use client"

import { useState, useRef } from "react"

type WaContact = {
  id: string
  phone: string
  name: string | null
  alias: string | null
  source: string
  tags: string[]
  created_at: string
}

const sourceConfig: Record<string, { label: string; color: string; bg: string }> = {
  csv:    { label: "CSV",    color: "var(--accent)", bg: "rgba(108,99,255,0.12)" },
  manual: { label: "Manual", color: "var(--text-muted)", bg: "var(--surface-2)" },
  crm:    { label: "CRM",    color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
}

function SourceBadge({ source }: { source: string }) {
  const cfg = sourceConfig[source] || sourceConfig.manual
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  )
}

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: (count: number) => void }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string[][]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").slice(0, 6).filter(Boolean)
      setPreview(lines.map(l => l.split(",").map(c => c.replace(/^"|"$/g, "").trim())))
    }
    reader.readAsText(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith(".csv") || f.type === "text/csv")) handleFile(f)
    else setError("Solo se aceptan archivos .csv")
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/whatsapp/contacts/import", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al importar")
      onImported(data.imported || 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Importar Contactos CSV</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          El CSV debe tener las columnas: <strong>phone</strong> (requerido), name (opcional), alias (opcional).
          Primera fila puede ser encabezado.
        </p>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all mb-4"
          style={{
            border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
            background: dragging ? "rgba(108,99,255,0.05)" : "var(--surface-2)",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="mb-3">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <polyline points="9 15 12 12 15 15"/>
          </svg>
          {file ? (
            <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>{file.name}</p>
          ) : (
            <>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Arrastra un archivo CSV aquí</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>o haz clic para seleccionar</p>
            </>
          )}
        </div>

        {preview.length > 0 && (
          <div className="mb-4 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <p className="text-xs px-3 py-2 font-medium" style={{ background: "var(--surface-2)", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
              Vista previa (primeras filas)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      {row.slice(0, 4).map((cell, j) => (
                        <td key={j} className="px-3 py-1.5 truncate max-w-[120px]" style={{ color: i === 0 ? "var(--text-secondary)" : "var(--text-primary)" }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {loading ? "Importando..." : "Importar"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ContactsClient({ contacts: initialContacts, orgId }: { contacts: WaContact[]; orgId: string }) {
  const [contacts, setContacts] = useState<WaContact[]>(initialContacts)
  const [search, setSearch] = useState("")
  const [showImport, setShowImport] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const filtered = contacts.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.phone.toLowerCase().includes(q) ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.alias || "").toLowerCase().includes(q)
    )
  })

  const handleImported = (count: number) => {
    setShowImport(false)
    setImportMsg(`Se importaron ${count} contactos exitosamente.`)
    setTimeout(() => setImportMsg(null), 4000)
    // Refresh contacts
    fetch("/api/whatsapp/contacts")
      .then(r => r.json())
      .then(data => { if (data.contacts) setContacts(data.contacts) })
      .catch(() => {})
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Contactos</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{contacts.length} contacto{contacts.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Importar CSV
        </button>
      </div>

      {importMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
          {importMsg}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por teléfono, nombre o alias..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="mb-3">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {search ? "Sin resultados" : "Sin contactos"}
            </p>
            {!search && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Importa un CSV para comenzar</p>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Alias</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Origen</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: "var(--text-primary)" }}>{c.phone}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{c.name || "—"}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>{c.alias || "—"}</td>
                  <td className="px-4 py-3"><SourceBadge source={c.source} /></td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(c.created_at).toLocaleDateString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}
    </>
  )
}
