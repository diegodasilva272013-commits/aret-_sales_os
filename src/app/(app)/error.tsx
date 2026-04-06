"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <div className="text-center max-w-md space-y-6">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Algo salió mal
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {error.message || "Ocurrió un error inesperado. Intenta de nuevo."}
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105"
          style={{ background: "var(--accent)" }}
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}