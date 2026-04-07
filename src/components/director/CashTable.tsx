'use client'

import { formatCurrency } from '@/lib/utils'

interface CashRow {
  id: string
  nombre: string
  monto_total_cerrado: number
  monto_cobrado: number
  monto_pendiente: number
  pagos_completos: number
  pagos_parciales: number
  pagos_nulo: number
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function CashTable({ data }: { data: CashRow[] }) {
  if (data.length === 0) return <p className="text-center py-8 text-sm" style={{ color: '#334155' }}>Sin datos de cobros</p>

  const thStyle = {
    color: '#475569',
    fontSize: '0.7rem',
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid #1a2234' }}>
            <th className="text-left px-4 py-3" style={thStyle}>Closer</th>
            <th className="text-right px-4 py-3" style={thStyle}>Cerrado</th>
            <th className="text-right px-4 py-3" style={thStyle}>Cobrado</th>
            <th className="text-right px-4 py-3" style={thStyle}>Pendiente</th>
            <th className="text-center px-4 py-3" style={thStyle}>Completos</th>
            <th className="text-center px-4 py-3" style={thStyle}>Parciales</th>
            <th className="text-center px-4 py-3" style={thStyle}>Sin Cobro</th>
            <th className="text-left px-4 py-3" style={thStyle}>% Cobrado</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const pct = row.monto_total_cerrado > 0 ? Math.round((row.monto_cobrado / row.monto_total_cerrado) * 100) : 0
            return (
              <tr key={row.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)', borderBottom: '1px solid rgba(26,34,52,0.6)' }} className="transition-colors hover:bg-white/[0.015]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0" style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399' }}>{getInitials(row.nombre)}</div>
                    <span className="font-medium" style={{ color: '#F1F5F9' }}>{row.nombre}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: '#94A3B8' }}>{formatCurrency(row.monto_total_cerrado)}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: '#34D399' }}>{formatCurrency(row.monto_cobrado)}</td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: row.monto_pendiente > 0 ? '#FBBF24' : '#334155' }}>{formatCurrency(row.monto_pendiente)}</td>
                <td className="px-4 py-3 text-center font-mono" style={{ color: '#34D399' }}>{row.pagos_completos}</td>
                <td className="px-4 py-3 text-center font-mono" style={{ color: '#FBBF24' }}>{row.pagos_parciales}</td>
                <td className="px-4 py-3 text-center font-mono" style={{ color: row.pagos_nulo > 0 ? '#F87171' : '#334155' }}>{row.pagos_nulo}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2234', minWidth: 60 }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct >= 70 ? '#34D399' : pct >= 40 ? '#FBBF24' : '#F87171' }} />
                    </div>
                    <span className="text-xs font-mono font-semibold tabular-nums" style={{ color: pct >= 70 ? '#34D399' : pct >= 40 ? '#FBBF24' : '#F87171', minWidth: '2.5rem', textAlign: 'right' }}>{pct}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
