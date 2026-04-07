'use client'

import { useState } from 'react'
import Badge from '@/components/director/Badge'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface SetterRow {
  id: string
  nombre: string
  leads_recibidos: number
  intentos_contacto: number
  contactados: number
  citas_agendadas: number
  citas_show: number
  citas_noshow: number
  citas_calificadas: number
  citas_reprogramadas: number
  mensajes_enviados?: number
  respuestas_obtenidas?: number
  asistio_reunion?: boolean | null
}

function getSetterStatus(row: SetterRow) {
  const showRate = row.citas_agendadas > 0 ? row.citas_show / row.citas_agendadas : 0
  const convRate = row.leads_recibidos > 0 ? row.citas_agendadas / row.leads_recibidos : 0
  if (showRate >= 0.7 && convRate >= 0.3) return { variant: 'top' as const, label: 'Top' }
  if (showRate >= 0.5 && convRate >= 0.2) return { variant: 'bueno' as const, label: 'Bueno' }
  if (showRate >= 0.3) return { variant: 'revisar' as const, label: 'Revisar' }
  return { variant: 'coaching' as const, label: 'Coaching' }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

type SortKey = keyof SetterRow
type SortDir = 'asc' | 'desc'

export default function SettersTable({ data }: { data: SetterRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('citas_agendadas')
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

  const showMensajes = data.some(r => (r.mensajes_enviados ?? 0) > 0)
  const showRespuestas = data.some(r => (r.respuestas_obtenidas ?? 0) > 0)
  const showReunion = data.some(r => r.asistio_reunion !== undefined && r.asistio_reunion !== null)

  const cols: { key: SortKey; label: string }[] = [
    { key: 'nombre', label: 'Setter' },
    { key: 'leads_recibidos', label: 'Leads' },
    { key: 'intentos_contacto', label: 'Intentos' },
    { key: 'contactados', label: 'Contactados' },
    { key: 'citas_agendadas', label: 'Agendadas' },
    { key: 'citas_show', label: 'Show' },
    { key: 'citas_noshow', label: 'No Show' },
    { key: 'citas_calificadas', label: 'Calificadas' },
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
            {showMensajes && <th className="text-left px-4 py-3 whitespace-nowrap" style={{ color: '#475569', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mensajes</th>}
            {showRespuestas && <th className="text-left px-4 py-3 whitespace-nowrap" style={{ color: '#475569', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Respuestas</th>}
            {showReunion && <th className="text-left px-4 py-3 whitespace-nowrap" style={{ color: '#475569', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reunión</th>}
            <th className="text-left px-4 py-3 whitespace-nowrap" style={{ color: '#475569', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const status = getSetterStatus(row)
            const showRate = row.citas_agendadas > 0 ? Math.round((row.citas_show / row.citas_agendadas) * 100) : 0
            return (
              <tr key={row.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)', borderBottom: '1px solid rgba(26,34,52,0.6)' }} className="transition-colors hover:bg-white/[0.015]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0" style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>{getInitials(row.nombre)}</div>
                    <span className="font-medium" style={{ color: '#F1F5F9' }}>{row.nombre}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono" style={{ color: '#94A3B8' }}>{row.leads_recibidos}</td>
                <td className="px-4 py-3 font-mono" style={{ color: '#64748B' }}>{row.intentos_contacto}</td>
                <td className="px-4 py-3 font-mono" style={{ color: '#94A3B8' }}>{row.contactados}</td>
                <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#818CF8' }}>{row.citas_agendadas}</td>
                <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#34D399' }}>{row.citas_show}</td>
                <td className="px-4 py-3 font-mono" style={{ color: '#F87171' }}>{row.citas_noshow}</td>
                <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#A78BFA' }}>{row.citas_calificadas}</td>
                {showMensajes && <td className="px-4 py-3 font-mono" style={{ color: '#A78BFA' }}>{row.mensajes_enviados ?? 0}</td>}
                {showRespuestas && <td className="px-4 py-3 font-mono" style={{ color: '#818CF8' }}>{row.respuestas_obtenidas ?? 0}</td>}
                {showReunion && (
                  <td className="px-4 py-3">
                    {row.asistio_reunion === null || row.asistio_reunion === undefined ? <span style={{ color: '#334155' }}>—</span> : row.asistio_reunion ? <span className="text-base" title="Asistió">✓</span> : <span className="text-base" title="No asistió" style={{ color: '#F87171' }}>✗</span>}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <span className="text-xs" style={{ color: '#334155' }}>Show: {showRate}%</span>
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
