"use client"

import { useEffect } from "react"

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("App error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--background)" }}>
      <div className="max-w-md text-center animate-scale-pop">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(239,68,68,0.12)" }}>
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Algo salió mal
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Hubo un error al cargar esta página. Probá recargando o volvé al dashboard.
        </p>
        {error.digest && (
          <p className="text-xs mb-4 font-mono" style={{ color: "var(--text-muted)" }}>
            Código: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold btn-press"
            style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
            Reintentar
          </button>
          <a href="/dashboard"
            className="px-5 py-2.5 rounded-xl text-sm font-medium btn-press"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            Ir al Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
