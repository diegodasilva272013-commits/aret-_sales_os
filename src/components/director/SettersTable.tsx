'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, Edit2 } from 'lucide-react'
import Badge from './Badge'

interface Setter {
  id: string
  nombre: string
  foto_url?: string
  citas_agendadas: number
  citas_show: number
  citas_calificadas: number
  leads_nuevos: number
  tasa_show: number
  badge?: string
}

interface SettersTableProps {
  setters: Setter[]
  onEdit?: (setterId: string, reporteId?: string) => void
}

type SortKey = 'nombre' | 'leads_nuevos' | 'citas_agendadas' | 'citas_show' | 'citas_calificadas' | 'tasa_show'

export default function SettersTable({ setters, onEdit }: SettersTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('citas_calificadas')
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = [...setters].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey]
    if (typeof av === 'string') return sortAsc ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string)
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null
    return sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  const th = (label: string, key: SortKey) => (
    <th
      onClick={() => toggleSort(key)}
      style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: 0.5, userSelect: 'none' }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{label}<SortIcon k={key} /></span>
    </th>
  )

  function getBadge(s: Setter): 'top' | 'bueno' | 'revisar' | 'coaching' {
    if (s.tasa_show >= 70 && s.citas_calificadas >= 5) return 'top'
    if (s.tasa_show >= 50) return 'bueno'
    if (s.tasa_show >= 30) return 'revisar'
    return 'coaching'
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Setters</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {th('Setter', 'nombre')}
              {th('Leads', 'leads_nuevos')}
              {th('Agendadas', 'citas_agendadas')}
              {th('Show', 'citas_show')}
              {th('Calificadas', 'citas_calificadas')}
              {th('Tasa Show', 'tasa_show')}
              <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--accent)', overflow: 'hidden' }}>
                      {s.foto_url ? <img src={s.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.nombre.charAt(0)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{s.nombre}</span>
                    <Badge tipo={getBadge(s)} />
                  </div>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{s.leads_nuevos}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{s.citas_agendadas}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{s.citas_show}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.citas_calificadas}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: s.tasa_show >= 50 ? 'var(--success)' : 'var(--warning)' }}>{s.tasa_show}%</td>
                <td style={{ padding: '10px 12px' }}>
                  {onEdit && (
                    <button onClick={() => onEdit(s.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                      <Edit2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin datos de setters para este período</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
