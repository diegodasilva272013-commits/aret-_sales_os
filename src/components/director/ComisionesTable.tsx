'use client'

import { formatCurrency } from '@/lib/utils'
import Badge from '@/components/director/Badge'

interface SetterRow {
  id: string
  nombre: string
  citas_calificadas: number
  ventas_cerradas?: number
}

interface CloserRow {
  id: string
  nombre: string
  monto_cobrado: number
  ventas_cerradas: number
  citas_show: number
}

interface ComisionConfig {
  setter_base_mensual?: number
  setter_por_cita_show_calificada?: number
  setter_por_venta_cerrada?: number
  closer_comision_porcentaje?: number
  closer_bonus_cierre?: number
  closer_bonus_tasa_minima?: number
}

interface Props {
  setters: SetterRow[]
  closers: CloserRow[]
  comisionConfig?: ComisionConfig
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function ComisionesTable({ setters, closers, comisionConfig }: Props) {
  const SETTER_POR_CITA = comisionConfig?.setter_por_cita_show_calificada ?? 25
  const SETTER_POR_VENTA = comisionConfig?.setter_por_venta_cerrada ?? 75
  const SETTER_BASE = comisionConfig?.setter_base_mensual ?? 500
  const CLOSER_PCT = (comisionConfig?.closer_comision_porcentaje ?? 8) / 100
  const CLOSER_BONUS = comisionConfig?.closer_bonus_cierre ?? 500
  const CLOSER_TASA_MIN = (comisionConfig?.closer_bonus_tasa_minima ?? 40) / 100

  const thStyle = {
    color: '#475569',
    fontSize: '0.68rem',
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  }

  return (
    <div className="space-y-8">
      {/* Setters */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded-full" style={{ background: '#6366F1' }} />
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#818CF8' }}>Setters</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #1a2234' }}>
                <th className="text-left px-4 py-3" style={thStyle}>Setter</th>
                <th className="text-right px-4 py-3" style={thStyle}>Base</th>
                <th className="text-right px-4 py-3" style={thStyle}>x Citas Cal.</th>
                <th className="text-right px-4 py-3" style={thStyle}>x Ventas</th>
                <th className="text-right px-4 py-3" style={thStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              {setters.map((row, i) => {
                const porCitas = (row.citas_calificadas || 0) * SETTER_POR_CITA
                const porVentas = (row.ventas_cerradas || 0) * SETTER_POR_VENTA
                const total = SETTER_BASE + porCitas + porVentas
                return (
                  <tr key={row.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)', borderBottom: '1px solid rgba(26,34,52,0.6)' }} className="transition-colors hover:bg-white/[0.015]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0" style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>{getInitials(row.nombre)}</div>
                        <span className="font-medium" style={{ color: '#F1F5F9' }}>{row.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono" style={{ color: '#64748B' }}>{formatCurrency(SETTER_BASE)}</td>
                    <td className="px-4 py-3 text-right font-mono" style={{ color: '#818CF8' }}>{formatCurrency(porCitas)}</td>
                    <td className="px-4 py-3 text-right font-mono" style={{ color: '#A78BFA' }}>{formatCurrency(porVentas)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-base font-black" style={{ color: '#34D399' }}>{formatCurrency(total)}</span>
                    </td>
                  </tr>
                )
              })}
              {setters.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm" style={{ color: '#334155' }}>Sin setters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Closers */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded-full" style={{ background: '#10B981' }} />
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#34D399' }}>Closers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #1a2234' }}>
                <th className="text-left px-4 py-3" style={thStyle}>Closer</th>
                <th className="text-right px-4 py-3" style={thStyle}>{Math.round(CLOSER_PCT * 100)}% Cobrado</th>
                <th className="text-right px-4 py-3" style={thStyle}>Bonus Cierre</th>
                <th className="text-right px-4 py-3" style={thStyle}>Total</th>
                <th className="text-left px-4 py-3" style={thStyle}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {closers.map((row, i) => {
                const comisionBase = (row.monto_cobrado || 0) * CLOSER_PCT
                const tasaCierre = row.citas_show > 0 ? row.ventas_cerradas / row.citas_show : 0
                const bonusCalifica = tasaCierre >= CLOSER_TASA_MIN
                const total = comisionBase + (bonusCalifica ? CLOSER_BONUS : 0)
                return (
                  <tr key={row.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)', borderBottom: '1px solid rgba(26,34,52,0.6)' }} className="transition-colors hover:bg-white/[0.015]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0" style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399' }}>{getInitials(row.nombre)}</div>
                        <span className="font-medium" style={{ color: '#F1F5F9' }}>{row.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono" style={{ color: '#818CF8' }}>{formatCurrency(comisionBase)}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {bonusCalifica ? (
                        <span className="font-semibold" style={{ color: '#34D399' }}>{formatCurrency(CLOSER_BONUS)}</span>
                      ) : (
                        <span className="text-xs" style={{ color: '#334155' }}>Tasa &lt; {Math.round(CLOSER_TASA_MIN * 100)}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-base font-black" style={{ color: '#34D399' }}>{formatCurrency(total)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={bonusCalifica ? 'top' : 'revisar'}>
                        {Math.round(tasaCierre * 100)}% cierre
                      </Badge>
                    </td>
                  </tr>
                )
              })}
              {closers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm" style={{ color: '#334155' }}>Sin closers</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
