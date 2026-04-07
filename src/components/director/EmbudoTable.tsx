'use client'

import { formatPercent } from '@/lib/utils'

interface Stats {
  totalLeads: number
  totalCitas: number
  totalShows: number
  totalVentas: number
  totalMontoCerrado: number
  totalMontoCobrado: number
  totalMontoPendiente: number
  tasaCierre: number
  tasaShow: number
}

export default function EmbudoTable({ stats }: { stats: Stats }) {
  const stages = [
    { label: 'Leads Recibidos', value: stats.totalLeads, color: '#6366F1', gradient: 'linear-gradient(90deg, #6366F1, #818CF8)' },
    { label: 'Citas Agendadas', value: stats.totalCitas, color: '#34D399', gradient: 'linear-gradient(90deg, #34D399, #6EE7B7)' },
    { label: 'Shows', value: stats.totalShows, color: '#FBBF24', gradient: 'linear-gradient(90deg, #FBBF24, #FDE68A)' },
    { label: 'Ventas Cerradas', value: stats.totalVentas, color: '#F87171', gradient: 'linear-gradient(90deg, #F87171, #FCA5A5)' },
  ]

  const maxVal = Math.max(...stages.map(s => s.value), 1)

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const pct = maxVal > 0 ? (stage.value / maxVal) * 100 : 0
        const nextStage = stages[i + 1]
        const convRate = nextStage && stage.value > 0
          ? Math.round((nextStage.value / stage.value) * 100)
          : null

        return (
          <div key={stage.label}>
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: stage.color }} />
                <span className="text-sm" style={{ color: '#94A3B8' }}>{stage.label}</span>
              </div>
              <span className="text-sm font-bold font-mono tabular-nums" style={{ color: stage.color }}>{stage.value}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a2234' }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: stage.gradient }} />
            </div>
            {convRate !== null && (
              <div className="flex justify-end mt-1">
                <span className="text-xs font-mono" style={{ color: '#475569' }}>→ {convRate}% conversión</span>
              </div>
            )}
          </div>
        )
      })}

      {/* KPI summary */}
      <div className="mt-5 pt-5 grid grid-cols-3 gap-3" style={{ borderTop: '1px solid #1a2234' }}>
        <div className="text-center">
          <p className="text-xs" style={{ color: '#475569' }}>Tasa Show</p>
          <p className="text-lg font-bold" style={{ color: '#FBBF24' }}>{formatPercent(stats.tasaShow)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs" style={{ color: '#475569' }}>Tasa Cierre</p>
          <p className="text-lg font-bold" style={{ color: '#F87171' }}>{formatPercent(stats.tasaCierre)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs" style={{ color: '#475569' }}>Lead → Venta</p>
          <p className="text-lg font-bold" style={{ color: '#6366F1' }}>
            {stats.totalLeads > 0 ? `${((stats.totalVentas / stats.totalLeads) * 100).toFixed(1)}%` : '0%'}
          </p>
        </div>
      </div>
    </div>
  )
}
