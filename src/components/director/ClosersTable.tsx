'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, Edit2 } from 'lucide-react'
import Badge from './Badge'

interface Closer {
  id: string
  nombre: string
  foto_url?: string
  shows: number
  ventas_cerradas: number
  tasa_cierre: number
  monto_cobrado: number
  badge?: string
}

interface ClosersTableProps {
  closers: Closer[]
  onEdit?: (closerId: string, reporteId?: string) => void
}

type SortKey = 'nombre' | 'shows' | 'ventas_cerradas' | 'tasa_cierre' | 'monto_cobrado'

export default function ClosersTable({ closers, onEdit }: ClosersTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('monto_cobrado')
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = [...closers].sort((a, b) => {
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

  function getBadge(c: Closer): 'top' | 'bueno' | 'revisar' | 'coaching' {
    if (c.tasa_cierre >= 40 && c.ventas_cerradas >= 5) return 'top'
    if (c.tasa_cierre >= 25) return 'bueno'
    if (c.tasa_cierre >= 15) return 'revisar'
    return 'coaching'
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Closers</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {th('Closer', 'nombre')}
              {th('Shows', 'shows')}
              {th('Ventas', 'ventas_cerradas')}
              {th('Tasa Cierre', 'tasa_cierre')}
              {th('Cobrado', 'monto_cobrado')}
              <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--accent)', overflow: 'hidden' }}>
                      {c.foto_url ? <img src={c.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.nombre.charAt(0)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{c.nombre}</span>
                    <Badge tipo={getBadge(c)} />
                  </div>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{c.shows}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.ventas_cerradas}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: c.tasa_cierre >= 30 ? 'var(--success)' : 'var(--warning)' }}>{c.tasa_cierre}%</td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>${c.monto_cobrado.toLocaleString()}</td>
                <td style={{ padding: '10px 12px' }}>
                  {onEdit && (
                    <button onClick={() => onEdit(c.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                      <Edit2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin datos de closers para este período</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
