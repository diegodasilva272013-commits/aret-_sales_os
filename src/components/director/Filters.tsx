'use client'

import { Calendar, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface FiltersProps {
  desde: string
  hasta: string
  onChange: (desde: string, hasta: string) => void
  proyectos?: { id: string; nombre: string }[]
  proyectoId?: string
  onProyectoChange?: (id: string) => void
}

const quickPills = [
  { label: 'Hoy', getValue: () => { const t = new Date().toISOString().split('T')[0]; return [t, t] } },
  { label: 'Esta semana', getValue: () => { const d = new Date(); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); return [d.toISOString().split('T')[0], new Date().toISOString().split('T')[0]] } },
  { label: 'Este mes', getValue: () => { const d = new Date(); return [`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, d.toISOString().split('T')[0]] } },
  { label: 'Último mes', getValue: () => { const d = new Date(); d.setMonth(d.getMonth()-1); const start = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; const end = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0]; return [start, end] } },
]

export default function Filters({ desde, hasta, onChange, proyectos, proyectoId, onProyectoChange }: FiltersProps) {
  const [active, setActive] = useState<number | null>(null)

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      {quickPills.map((pill, i) => (
        <button
          key={i}
          onClick={() => { const [d, h] = pill.getValue(); onChange(d, h); setActive(i) }}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: 'none',
            background: active === i ? 'var(--accent)' : 'var(--surface-2)',
            color: active === i ? '#fff' : 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {pill.label}
        </button>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
        <input
          type="date"
          value={desde}
          onChange={(e) => { onChange(e.target.value, hasta); setActive(null) }}
          style={{
            padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 12,
          }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
        <input
          type="date"
          value={hasta}
          onChange={(e) => { onChange(desde, e.target.value); setActive(null) }}
          style={{
            padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 12,
          }}
        />
      </div>
      {proyectos && proyectos.length > 0 && (
        <div style={{ position: 'relative', marginLeft: 8 }}>
          <select
            value={proyectoId || ''}
            onChange={(e) => onProyectoChange?.(e.target.value)}
            style={{
              padding: '6px 24px 6px 10px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 12,
              appearance: 'none', cursor: 'pointer',
            }}
          >
            <option value="">Todos los proyectos</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>
      )}
    </div>
  )
}
