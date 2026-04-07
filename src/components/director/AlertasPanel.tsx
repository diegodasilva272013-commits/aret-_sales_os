'use client'

import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react'

interface Alerta {
  tipo: string
  nivel: 'critico' | 'warning' | 'info' | 'ok'
  mensaje: string
}

interface AlertasPanelProps {
  alertas: Alerta[]
}

const icons = { critico: AlertTriangle, warning: AlertCircle, info: Info, ok: CheckCircle }
const colors = { critico: 'var(--danger)', warning: 'var(--warning)', info: 'var(--info)', ok: 'var(--success)' }
const bgs = { critico: 'rgba(239,68,68,0.1)', warning: 'rgba(245,158,11,0.1)', info: 'rgba(59,130,246,0.1)', ok: 'rgba(34,197,94,0.1)' }

export default function AlertasPanel({ alertas }: AlertasPanelProps) {
  if (!alertas.length) return null

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Alertas</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {alertas.map((a, i) => {
          const Icon = icons[a.nivel] || Info
          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px',
                background: bgs[a.nivel] || bgs.info,
                borderBottom: i < alertas.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <Icon size={16} style={{ color: colors[a.nivel] || colors.info, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{a.mensaje}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
