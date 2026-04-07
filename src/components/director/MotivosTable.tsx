'use client'

interface MotivoEntry {
  motivo: string
  cantidad: number
  porcentaje: number
}

interface MotivosTableProps {
  data: MotivoEntry[]
}

export default function MotivosTable({ data }: MotivosTableProps) {
  const colors = ['var(--danger)', 'var(--warning)', 'var(--info)', 'var(--accent)', '#818CF8']

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Motivos de No Cierre</h3>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.map((m, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.motivo}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{m.cantidad} ({m.porcentaje}%)</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
              <div style={{ width: `${m.porcentaje}%`, height: '100%', borderRadius: 3, background: colors[i % colors.length], transition: 'width 0.5s ease' }} />
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin motivos registrados</div>
        )}
      </div>
    </div>
  )
}
