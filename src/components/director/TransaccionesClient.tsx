'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowUpDown, Plus, X, Download, Trash2, Search, DollarSign } from 'lucide-react'

interface Transaccion {
  id: string
  monto: number
  tipo: 'ingreso' | 'egreso' | 'reembolso'
  fecha: string
  descripcion?: string
  cliente_nombre?: string
}

export default function TransaccionesClient() {
  const [txs, setTxs] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ monto: 0, tipo: 'ingreso', descripcion: '', fecha: new Date().toISOString().split('T')[0] })

  const fetchTxs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    if (filterTipo) params.set('tipo', filterTipo)
    const res = await fetch(`/api/director/facturacion/transacciones?${params}`)
    setTxs(await res.json())
    setLoading(false)
  }, [desde, hasta, filterTipo])

  useEffect(() => { fetchTxs() }, [fetchTxs])

  const handleCreate = async () => {
    await fetch('/api/director/facturacion/transacciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    })
    setShowNew(false)
    setNewForm({ monto: 0, tipo: 'ingreso', descripcion: '', fecha: new Date().toISOString().split('T')[0] })
    fetchTxs()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/director/facturacion/transacciones?id=${id}`, { method: 'DELETE' })
    fetchTxs()
  }

  const filtered = txs.filter(t => {
    if (search && !t.descripcion?.toLowerCase().includes(search.toLowerCase()) && !t.cliente_nombre?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalIngresos = filtered.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0)
  const totalEgresos = filtered.filter(t => t.tipo === 'egreso').reduce((s, t) => s + t.monto, 0)
  const totalReembolsos = filtered.filter(t => t.tipo === 'reembolso').reduce((s, t) => s + t.monto, 0)

  const exportCSV = () => {
    const header = 'Fecha,Tipo,Monto,Descripción,Cliente\n'
    const rows = filtered.map(t => `${t.fecha},${t.tipo},${t.monto},${t.descripcion || ''},${t.cliente_nombre || ''}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'transacciones.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 13,
  }

  const tipoColors: Record<string, { bg: string; text: string }> = {
    ingreso: { bg: 'rgba(34,197,94,0.15)', text: 'var(--success)' },
    egreso: { bg: 'rgba(239,68,68,0.15)', text: 'var(--danger)' },
    reembolso: { bg: 'rgba(245,158,11,0.15)', text: 'var(--warning)' },
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ArrowUpDown size={24} style={{ color: 'var(--accent)' }} /> Transacciones
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{txs.length} transacciones</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
            <Download size={14} /> CSV
          </button>
          <button onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Plus size={14} /> Nueva
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Ingresos', value: totalIngresos, color: 'var(--success)' },
          { label: 'Egresos', value: totalEgresos, color: 'var(--danger)' },
          { label: 'Reembolsos', value: totalReembolsos, color: 'var(--warning)' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>${s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...fieldStyle, paddingLeft: 30 }} />
        </div>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{ ...fieldStyle, width: 'auto' }}>
          <option value="">Todos</option>
          <option value="ingreso">Ingresos</option>
          <option value="egreso">Egresos</option>
          <option value="reembolso">Reembolsos</option>
        </select>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ ...fieldStyle, width: 'auto' }} />
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ ...fieldStyle, width: 'auto' }} />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Fecha', 'Tipo', 'Monto', 'Descripción', 'Cliente', ''].map(label => (
                <th key={label} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const tc = tipoColors[t.tipo] || tipoColors.ingreso
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(t.fecha).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: tc.bg, color: tc.text, textTransform: 'capitalize' }}>{t.tipo}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: t.tipo === 'ingreso' ? 'var(--success)' : t.tipo === 'egreso' ? 'var(--danger)' : 'var(--warning)' }}>
                    {t.tipo === 'ingreso' ? '+' : '-'}${t.monto.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{t.descripcion || '-'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{t.cliente_nombre || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* New Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowNew(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 400, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Nueva Transacción</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select value={newForm.tipo} onChange={e => setNewForm({ ...newForm, tipo: e.target.value })} style={fieldStyle}>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
                <option value="reembolso">Reembolso</option>
              </select>
              <input type="number" placeholder="Monto" value={newForm.monto || ''} onChange={e => setNewForm({ ...newForm, monto: Number(e.target.value) })} style={fieldStyle} />
              <input type="date" value={newForm.fecha} onChange={e => setNewForm({ ...newForm, fecha: e.target.value })} style={fieldStyle} />
              <input placeholder="Descripción" value={newForm.descripcion} onChange={e => setNewForm({ ...newForm, descripcion: e.target.value })} style={fieldStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleCreate} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
