'use client'

import { useState } from 'react'
import Badge from '@/components/director/Badge'
import { formatCurrency } from '@/lib/utils'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface CloserRow {
  id: string
  nombre: string
  citas_recibidas: number
  citas_show: number
  citas_noshow: number
  ventas_cerradas: number
  ventas_no_cerradas: number
  monto_total_cerrado: number
  monto_cobrado: number
  monto_pendiente: number
  pagos_completos: number
  pagos_parciales: number
  pagos_nulo: number
  propuestas_enviadas?: number
  seguimientos_realizados?: number
  asistio_reunion?: boolean | null
  motivo_precio: number
  motivo_consultar: number
  motivo_momento: number
  motivo_competencia: number
  motivo_otro: number
}

function getCloserStatus(row: CloserRow) {
  const cierre = row.citas_show > 0 ? row.ventas_cerradas / row.citas_show : 0
  const cobro = row.monto_total_cerrado > 0 ? row.monto_cobrado / row.monto_total_cerrado : 0
  if (cierre >= 0.4 && cobro >= 0.7) return { variant: 'top' as const, label: 'Top' }
  if (cierre >= 0.25 && cobro >= 0.5) return { variant: 'bueno' as const, label: 'Bueno' }
  if (cierre >= 0.15) return { variant: 'revisar' as const, label: 'Revisar' }
  return { variant: 'coaching' as const, label: 'Coaching' }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

type SortKey = keyof CloserRow
type SortDir = 'asc' | 'desc'

export default function ClosersTable({ data }: { data: CloserRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('ventas_cerradas')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey]
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  const showPropuestas = data.some(r => (r.propuestas_enviadas ?? 0) > 0)
  const showSeguimientos = data.some(r => (r.seguimientos_realizados ?? 0) > 0)
  const showReunion = data.some(r => r.asistio_reunion !== undefined && r.asistio_reunion !== null)

  const cols: { key: SortKey; label: string }[] = [
    { key: 'nombre', label: 'Closer' },
    { key: 'citas_recibidas', label: 'Recibidas' },
    { key: 'citas_show', label: 'Show' },
    { key: 'ventas_cerradas', label: 'Ventas' },
    { key: 'monto_total_cerrado', label: 'Cerrado' },
    { key: 'monto_cobrado', label: 'Cobrado' },
    { key: 'monto_pendiente', label: 'Pendiente' },
  ]

  if (data.length === 0) return <p className="text-center py-8 text-sm" style={{ color: '#334155' }}>Sin datos en el rango seleccionado</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid #1a2234' }}>
            {cols.map(col => (
              <th key={col.key} onClick={() => handleSort(col.key)} className="text-left px-4 py-3 cursor-pointer select-none whitespace-nowrap transition-colors" style={{ color: sortKey === col.key ? '#6366F1' : '#475569', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <div className="flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronDown size={11} style={{ opacity: 0.2 }} />}
                </div>
              </th>
            ))}
            {showPropuestas && <th className="text-left px-4 py-3 whitespace-nowrap" style={{ color: '#475569', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Propuestas</th>}
            {showSeguimientos && <th className="text-left px-4 py-3 whitespace-nowrap" style={{ color: '#475569', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Seguim.</th>}
            {showReunion && <th className="text-left px-4 py-3 whitespace-nowrap" style={{ color: '#475569', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reunión</th>}
            <th className="text-left px-4 py-3 whitespace-nowrap" style={{ color: '#475569', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const status = getCloserStatus(row)
            const cierre = row.citas_show > 0 ? Math.round((row.ventas_cerradas / row.citas_show) * 100) : 0
            return (
              <tr key={row.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)', borderBottom: '1px solid rgba(26,34,52,0.6)' }} className="transition-colors hover:bg-white/[0.015]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0" style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399' }}>{getInitials(row.nombre)}</div>
                    <span className="font-medium" style={{ color: '#F1F5F9' }}>{row.nombre}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono" style={{ color: '#94A3B8' }}>{row.citas_recibidas}</td>
                <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#34D399' }}>{row.citas_show}</td>
                <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#818CF8' }}>{row.ventas_cerradas}</td>
                <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#34D399' }}>{formatCurrency(row.monto_total_cerrado)}</td>
                <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#34D399' }}>{formatCurrency(row.monto_cobrado)}</td>
                <td className="px-4 py-3 font-mono" style={{ color: row.monto_pendiente > 0 ? '#FBBF24' : '#334155' }}>{formatCurrency(row.monto_pendiente)}</td>
                {showPropuestas && <td className="px-4 py-3 font-mono" style={{ color: '#A78BFA' }}>{row.propuestas_enviadas ?? 0}</td>}
                {showSeguimientos && <td className="px-4 py-3 font-mono" style={{ color: '#818CF8' }}>{row.seguimientos_realizados ?? 0}</td>}
                {showReunion && (
                  <td className="px-4 py-3">
                    {row.asistio_reunion === null || row.asistio_reunion === undefined ? <span style={{ color: '#334155' }}>—</span> : row.asistio_reunion ? <span className="text-base" title="Asistió">✓</span> : <span className="text-base" title="No asistió" style={{ color: '#F87171' }}>✗</span>}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <span className="text-xs" style={{ color: '#334155' }}>Cierre: {cierre}%</span>
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
