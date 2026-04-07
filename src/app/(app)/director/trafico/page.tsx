'use client'

import { Radio } from 'lucide-react'

const C = {
  bg: '#080B14', surface: '#0D1117', border: '#1a2234',
  text: '#F1F5F9', textDim: '#475569', accent: '#6366F1', accentLight: '#818CF8',
}

export default function TraficoPage() {
  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text }}>
      <header className="sticky top-0 z-50" style={{ background: 'rgba(8,11,20,0.92)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-7xl mx-auto px-5 h-12 flex items-center gap-3">
          <Radio size={16} style={{ color: C.accentLight }} />
          <span className="text-sm font-bold tracking-tight">Tráfico</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-5 py-16 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${C.accent}15` }}>
          <Radio size={28} style={{ color: C.accentLight }} />
        </div>
        <h1 className="text-lg font-bold" style={{ color: C.text }}>Módulo Tráfico</h1>
        <p className="text-sm text-center max-w-md" style={{ color: C.textDim }}>
          Gestión de campañas, métricas de tráfico y análisis de fuentes de adquisición.
          Próximamente disponible.
        </p>
        <div className="px-4 py-2 rounded-full text-xs font-semibold" style={{ background: `${C.accent}15`, color: C.accentLight }}>
          Próximamente
        </div>
      </main>
    </div>
  )
}
