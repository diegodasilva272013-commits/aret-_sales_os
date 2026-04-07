'use client'

import { CheckCircle, XCircle, Clock } from 'lucide-react'

interface MemberReport {
  nombre: string
  foto_url?: string
  rol: string
  envio: boolean
  hora?: string
}

interface ReportesHoyProps {
  data: MemberReport[]
}

export default function ReportesHoy({ data }: ReportesHoyProps) {
  const enviados = data.filter(d => d.envio).length
  const total = data.length

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Reportes Hoy</h3>
        <span style={{ fontSize: 12, color: enviados === total ? 'var(--success)' : 'var(--warning)' }}>
          {enviados}/{total} enviados
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {data.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderBottom: i < data.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--accent)', overflow: 'hidden' }}>
                {m.foto_url ? <img src={m.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.nombre.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{m.rol}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {m.envio ? (
                <>
                  <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.hora}</span>
                </>
              ) : (
                <>
                  <Clock size={14} style={{ color: 'var(--warning)' }} />
                  <span style={{ fontSize: 11, color: 'var(--warning)' }}>Pendiente</span>
                </>
              )}
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin miembros del equipo</div>
        )}
      </div>
    </div>
  )
}
