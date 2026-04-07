'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, X, Save, CreditCard, Trash2, ChevronDown, ChevronUp, Search, Building } from 'lucide-react'

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
  phone?: string
  avatar_url?: string
  is_active: boolean
  pagos: { id: string; tipo: string; datos: string; titular: string; principal: boolean }[]
  proyectos: { proyecto_id: string; nombre: string }[]
}

export default function EquipoClient() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [proyectos, setProyectos] = useState<{ id: string; nombre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editData, setEditData] = useState<Partial<TeamMember> | null>(null)
  const [addPago, setAddPago] = useState<{ userId: string; tipo: string; datos: string; titular: string } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [mRes, pRes] = await Promise.all([
      fetch('/api/director/equipo'),
      fetch('/api/director/proyectos'),
    ])
    setMembers(await mRes.json())
    setProyectos(await pRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = members.filter(m => {
    if (search && !m.full_name.toLowerCase().includes(search.toLowerCase()) && !m.email?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRole && m.role !== filterRole) return false
    return true
  })

  const handleSaveMember = async (memberId: string) => {
    if (!editData) return
    await fetch(`/api/director/equipo/${memberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    })
    setEditData(null)
    fetchData()
  }

  const handleAddMember = async (form: { email: string; full_name: string; role: string }) => {
    await fetch('/api/director/equipo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowAdd(false)
    fetchData()
  }

  const handleAddPago = async () => {
    if (!addPago) return
    await fetch(`/api/director/equipo/${addPago.userId}/pagos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: addPago.tipo, datos: addPago.datos, titular: addPago.titular }),
    })
    setAddPago(null)
    fetchData()
  }

  const handleDeletePago = async (userId: string, pagoId: string) => {
    await fetch(`/api/director/equipo/${userId}/pagos?pago_id=${pagoId}`, { method: 'DELETE' })
    fetchData()
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 13,
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={24} style={{ color: 'var(--accent)' }} />
            Equipo
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{members.length} miembros</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          <Plus size={14} /> Agregar
        </button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            placeholder="Buscar miembros..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...fieldStyle, paddingLeft: 30 }}
          />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ ...fieldStyle, width: 'auto' }}>
          <option value="">Todos los roles</option>
          <option value="setter">Setters</option>
          <option value="closer">Closers</option>
        </select>
      </div>

      {/* Members Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {filtered.map(member => (
          <div key={member.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Card header */}
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--accent)', overflow: 'hidden', flexShrink: 0 }}>
                  {member.avatar_url ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : member.full_name?.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{member.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{member.email}</div>
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                  background: member.role === 'setter' ? 'rgba(99,102,241,0.15)' : 'rgba(34,197,94,0.15)',
                  color: member.role === 'setter' ? 'var(--accent)' : 'var(--success)',
                }}>
                  {member.role}
                </span>
              </div>

              {/* Projects */}
              {member.proyectos.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
                  {member.proyectos.map(p => (
                    <span key={p.proyecto_id} style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-muted)', fontSize: 10 }}>
                      <Building size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />{p.nombre}
                    </span>
                  ))}
                </div>
              )}

              {/* Expand toggle */}
              <button
                onClick={() => setExpanded(expanded === member.id ? null : member.id)}
                style={{ width: '100%', marginTop: 10, padding: '6px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                {expanded === member.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded === member.id ? 'Cerrar' : 'Ver detalles'}
              </button>
            </div>

            {/* Expanded panel */}
            {expanded === member.id && (
              <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                {/* Payment methods */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Métodos de Pago</span>
                    <button
                      onClick={() => setAddPago({ userId: member.id, tipo: 'transferencia', datos: '', titular: '' })}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11 }}
                    >
                      <Plus size={12} /> Agregar
                    </button>
                  </div>
                  {member.pagos.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <span style={{ fontSize: 12, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{p.tipo}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{p.datos}</span>
                      </div>
                      <button onClick={() => handleDeletePago(member.id, p.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {member.pagos.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin métodos de pago</div>}
                </div>

                {/* Quick edit status */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'default',
                    background: member.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: member.is_active ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {member.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                  {member.phone && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{member.phone}</span>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Member Modal */}
      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onSave={handleAddMember} />}

      {/* Add Pago Modal */}
      {addPago && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setAddPago(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 380, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Agregar Método de Pago</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select value={addPago.tipo} onChange={e => setAddPago({ ...addPago, tipo: e.target.value })} style={fieldStyle}>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="crypto">Crypto</option>
                <option value="paypal">PayPal</option>
              </select>
              <input placeholder="Datos (CBU, alias, wallet...)" value={addPago.datos} onChange={e => setAddPago({ ...addPago, datos: e.target.value })} style={fieldStyle} />
              <input placeholder="Titular" value={addPago.titular} onChange={e => setAddPago({ ...addPago, titular: e.target.value })} style={fieldStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setAddPago(null)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleAddPago} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddMemberModal({ onClose, onSave }: { onClose: () => void; onSave: (form: { email: string; full_name: string; role: string }) => void }) {
  const [form, setForm] = useState({ email: '', full_name: '', role: 'setter' })

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 13,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 400, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Nuevo Miembro</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Nombre completo" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} style={fieldStyle} />
          <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={fieldStyle} />
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={fieldStyle}>
            <option value="setter">Setter</option>
            <option value="closer">Closer</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
          <button onClick={() => onSave(form)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Crear Miembro</button>
        </div>
      </div>
    </div>
  )
}
