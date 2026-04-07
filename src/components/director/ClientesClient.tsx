'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserCheck, Search, ChevronDown, ChevronUp, Plus, X, Download, Edit2, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Cliente {
  id: string
  nombre_cliente: string
  email?: string
  telefono?: string
  estado: 'activo' | 'vencido' | 'pagado' | 'cancelado'
  monto_referencia: number
  notas?: string
  closer_id?: string
  setter_id?: string
  created_at: string
}

export default function ClientesClient() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [sortKey, setSortKey] = useState<string>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Cliente>>({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ nombre_cliente: '', email: '', telefono: '', monto_referencia: 0, estado: 'activo' })

  const supabase = createClient()

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('clientes_cartera')
      .select('*')
      .order('created_at', { ascending: false })
    setClientes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  const filtered = clientes
    .filter(c => {
      if (search && !c.nombre_cliente.toLowerCase().includes(search.toLowerCase()) && !c.email?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterEstado && c.estado !== filterEstado) return false
      return true
    })
    .sort((a: any, b: any) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortAsc ? av - bv : bv - av
    })

  const handleSave = async (id: string) => {
    await supabase.from('clientes_cartera').update(editForm).eq('id', id)
    setEditing(null)
    fetchClientes()
  }

  const handleCreate = async () => {
    await supabase.from('clientes_cartera').insert(newForm)
    setShowNew(false)
    setNewForm({ nombre_cliente: '', email: '', telefono: '', monto_referencia: 0, estado: 'activo' })
    fetchClientes()
  }

  const exportCSV = () => {
    const header = 'Nombre,Email,Teléfono,Estado,Monto Referencia\n'
    const rows = filtered.map(c => `${c.nombre_cliente},${c.email || ''},${c.telefono || ''},${c.estado},${c.monto_referencia}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'clientes.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 13,
  }

  const estadoColors: Record<string, { bg: string; text: string }> = {
    activo: { bg: 'rgba(34,197,94,0.15)', text: 'var(--success)' },
    vencido: { bg: 'rgba(239,68,68,0.15)', text: 'var(--danger)' },
    pagado: { bg: 'rgba(99,102,241,0.15)', text: 'var(--accent)' },
    cancelado: { bg: 'rgba(245,158,11,0.15)', text: 'var(--warning)' },
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserCheck size={24} style={{ color: 'var(--accent)' }} /> Clientes
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{clientes.length} clientes en cartera</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
            <Download size={14} /> CSV
          </button>
          <button onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Plus size={14} /> Agregar
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Buscar clientes..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...fieldStyle, paddingLeft: 30 }} />
        </div>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} style={{ ...fieldStyle, width: 'auto' }}>
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="vencido">Vencidos</option>
          <option value="pagado">Pagados</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Nombre', 'Email', 'Estado', 'Monto', 'Fecha'].map(label => (
                <th key={label} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }}>{label}</th>
              ))}
              <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const ec = estadoColors[c.estado] || estadoColors.activo
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{c.nombre_cliente}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{c.email || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: ec.bg, color: ec.text, textTransform: 'capitalize' }}>{c.estado}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>${c.monto_referencia?.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => { setEditing(c.id); setEditForm(c) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No se encontraron clientes</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Client Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowNew(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 400, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Nuevo Cliente</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Nombre" value={newForm.nombre_cliente} onChange={e => setNewForm({ ...newForm, nombre_cliente: e.target.value })} style={fieldStyle} />
              <input placeholder="Email" value={newForm.email} onChange={e => setNewForm({ ...newForm, email: e.target.value })} style={fieldStyle} />
              <input placeholder="Teléfono" value={newForm.telefono} onChange={e => setNewForm({ ...newForm, telefono: e.target.value })} style={fieldStyle} />
              <input placeholder="Monto referencia" type="number" value={newForm.monto_referencia} onChange={e => setNewForm({ ...newForm, monto_referencia: Number(e.target.value) })} style={fieldStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleCreate} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 400, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Editar Cliente</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={editForm.nombre_cliente || ''} onChange={e => setEditForm({ ...editForm, nombre_cliente: e.target.value })} style={fieldStyle} />
              <input value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={fieldStyle} />
              <input value={editForm.telefono || ''} onChange={e => setEditForm({ ...editForm, telefono: e.target.value })} style={fieldStyle} />
              <input type="number" value={editForm.monto_referencia || 0} onChange={e => setEditForm({ ...editForm, monto_referencia: Number(e.target.value) })} style={fieldStyle} />
              <select value={editForm.estado || 'activo'} onChange={e => setEditForm({ ...editForm, estado: e.target.value as any })} style={fieldStyle}>
                <option value="activo">Activo</option>
                <option value="vencido">Vencido</option>
                <option value="pagado">Pagado</option>
                <option value="cancelado">Cancelado</option>
              </select>
              <textarea value={editForm.notas || ''} onChange={e => setEditForm({ ...editForm, notas: e.target.value })} placeholder="Notas..." rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setEditing(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={() => handleSave(editing)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
