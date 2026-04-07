'use client'

interface CloserRow {
  id: string
  nombre: string
  motivo_precio: number
  motivo_consultar: number
  motivo_momento: number
  motivo_competencia: number
  motivo_otro: number
  ventas_no_cerradas: number
}

export default function MotivosTable({ data }: { data: CloserRow[] }) {
  const totals = data.reduce((acc, row) => ({
    precio: acc.precio + (row.motivo_precio || 0),
    consultar: acc.consultar + (row.motivo_consultar || 0),
    momento: acc.momento + (row.motivo_momento || 0),
    competencia: acc.competencia + (row.motivo_competencia || 0),
    otro: acc.otro + (row.motivo_otro || 0),
  }), { precio: 0, consultar: 0, momento: 0, competencia: 0, otro: 0 })

  const total = totals.precio + totals.consultar + totals.momento + totals.competencia + totals.otro

  const motivos = [
    { key: 'precio', label: 'Precio / Presupuesto', value: totals.precio, color: '#EF4444', gradient: 'linear-gradient(90deg, #EF4444, #F87171)' },
    { key: 'consultar', label: 'Necesita consultarlo', value: totals.consultar, color: '#F59E0B', gradient: 'linear-gradient(90deg, #F59E0B, #FBBF24)' },
    { key: 'momento', label: 'No es el momento', value: totals.momento, color: '#6366F1', gradient: 'linear-gradient(90deg, #6366F1, #818CF8)' },
    { key: 'competencia', label: 'Prefiere competencia', value: totals.competencia, color: '#8B5CF6', gradient: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' },
    { key: 'otro', label: 'Otro motivo', value: totals.otro, color: '#475569', gradient: 'linear-gradient(90deg, #475569, #64748B)' },
  ].sort((a, b) => b.value - a.value)

  if (data.length === 0 || total === 0) return (
    <p className="text-sm text-center py-8" style={{ color: '#334155' }}>
      Sin datos de objeciones
    </p>
  )

  return (
    <div className="space-y-3">
      {motivos.map(m => {
        const pct = total > 0 ? (m.value / total) * 100 : 0
        return (
          <div key={m.key}>
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                <span className="text-sm" style={{ color: '#94A3B8' }}>{m.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${m.color}18`, color: m.color }}>{m.value}</span>
                <span className="text-xs font-mono tabular-nums" style={{ color: '#475569', minWidth: '3rem', textAlign: 'right' }}>{Math.round(pct)}%</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2234' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: m.gradient }} />
            </div>
          </div>
        )
      })}

      {data.length > 0 && (
        <div className="mt-5 pt-5" style={{ borderTop: '1px solid #1a2234' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#475569' }}>Por Closer</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #1a2234' }}>
                  {['Closer', 'Precio', 'Consultar', 'Momento', 'Competencia', 'Otro'].map(h => (
                    <th key={h} className={`py-2 ${h === 'Closer' ? 'text-left px-2' : 'text-center px-2'}`} style={{ color: '#475569', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={row.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)', borderBottom: '1px solid rgba(26,34,52,0.5)' }} className="transition-colors hover:bg-white/[0.015]">
                    <td className="px-2 py-2.5 font-medium" style={{ color: '#E2E8F0' }}>{row.nombre}</td>
                    <td className="px-2 py-2.5 text-center font-mono" style={{ color: '#F87171' }}>{row.motivo_precio}</td>
                    <td className="px-2 py-2.5 text-center font-mono" style={{ color: '#FBBF24' }}>{row.motivo_consultar}</td>
                    <td className="px-2 py-2.5 text-center font-mono" style={{ color: '#818CF8' }}>{row.motivo_momento}</td>
                    <td className="px-2 py-2.5 text-center font-mono" style={{ color: '#A78BFA' }}>{row.motivo_competencia}</td>
                    <td className="px-2 py-2.5 text-center font-mono" style={{ color: '#64748B' }}>{row.motivo_otro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
