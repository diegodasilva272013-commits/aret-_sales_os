'use client'

interface EmbudoStage {
  etapa: string
  valor: number
  color: string
}

interface EmbudoTableProps {
  data: EmbudoStage[]
}

export default function EmbudoTable({ data }: EmbudoTableProps) {
  const max = Math.max(...data.map(d => d.valor), 1)

  const defaultData: EmbudoStage[] = data.length > 0 ? data : [
    { etapa: 'Leads Nuevos', valor: 0, color: 'var(--info)' },
    { etapa: 'Citas Agendadas', valor: 0, color: 'var(--accent)' },
    { etapa: 'Citas Show', valor: 0, color: '#818CF8' },
    { etapa: 'Calificadas', valor: 0, color: '#34D399' },
    { etapa: 'Ventas', valor: 0, color: 'var(--success)' },
    { etapa: 'Cobrado', valor: 0, color: 'var(--success)' },
  ]

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Embudo de Ventas</h3>
      </div>
      <div style={{ padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {defaultData.map((stage, i) => {
          const width = max > 0 ? Math.max(5, (stage.valor / max) * 100) : 5
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 100, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{stage.etapa}</span>
              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ height: 24, borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${width}%`,
                      height: '100%',
                      background: stage.color,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: 8,
                      transition: 'width 0.5s ease',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{stage.valor}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
