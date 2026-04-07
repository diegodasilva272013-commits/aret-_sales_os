'use client'

import { useState, useEffect, useCallback } from 'react'
import { FolderKanban, Plus, X, Settings, Users, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

interface Proyecto {
  id: string
  nombre: string
  empresa?: string
  descripcion?: string
  tipo: 'evergreen' | 'lanzamiento'
  activo: boolean
  director_proyecto_miembros?: { count: number }[]
}

export default function ProyectosClient() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [equipo, setEquipo] = useState<{ id: string; full_name: string; role: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ nombre: '', empresa: '', descripcion: '', tipo: 'evergreen' })
  const [membersModal, setMembersModal] = useState<string | null>(null)
  const [comisionesModal, setComisionesModal] = useState<string | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [comConfig, setComConfig] = useState<any>(null)

  const fetchProyectos = useCallback(async () => {
    setLoading(true)
    const [pRes, eRes] = await Promise.all([fetch('/api/director/proyectos'), fetch('/api/director/equipo')])
    setProyectos(await pRes.json())
    setEquipo(await eRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchProyectos() }, [fetchProyectos])

  const handleCreate = async () => {
    await fetch('/api/director/proyectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    })
    setShowNew(false)
    setNewForm({ nombre: '', empresa: '', descripcion: '', tipo: 'evergreen' })
    fetchProyectos()
  }

  const openMembers = async (id: string) => {
    setMembersModal(id)
    const res = await fetch(`/api/director/proyectos/${id}/miembros`)
    setMembers(await res.json())
  }

  const addMember = async (userId: string, rol: string) => {
    if (!membersModal) return
    await fetch(`/api/director/proyectos/${membersModal}/miembros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, rol }),
    })
    openMembers(membersModal)
  }

  const removeMember = async (memberId: string) => {
    if (!membersModal) return
    await fetch(`/api/director/proyectos/${membersModal}/miembros?member_id=${memberId}`, { method: 'DELETE' })
    openMembers(membersModal)
  }

  const openComisiones = async (id: string) => {
    setComisionesModal(id)
    const res = await fetch(`/api/director/proyectos/${id}/comisiones`)
    setComConfig(await res.json())
  }

  const saveComisiones = async () => {
    if (!comisionesModal || !comConfig) return
    await fetch(`/api/director/proyectos/${comisionesModal}/comisiones`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comConfig),
    })
    setComisionesModal(null)
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 13,
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FolderKanban size={24} style={{ color: 'var(--accent)' }} /> Proyectos
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{proyectos.length} proyectos</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <Plus size={14} /> Nuevo Proyecto
        </button>
      </div>

      {/* Projects Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {proyectos.map(p => (
          <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{p.nombre}</h3>
                {p.empresa && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.empresa}</div>}
              </div>
              <span style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'capitalize',
                background: p.tipo === 'evergreen' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                color: p.tipo === 'evergreen' ? 'var(--success)' : 'var(--warning)',
              }}>{p.tipo}</span>
            </div>
            {p.descripcion && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{p.descripcion}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
              <Users size={12} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(p.director_proyecto_miembros as any)?.[0]?.count || 0} miembros</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => openMembers(p.id)} style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Users size={12} /> Miembros
              </button>
              <button onClick={() => openComisiones(p.id)} style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Settings size={12} /> Comisiones
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Project Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowNew(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 420, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Nuevo Proyecto</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Nombre" value={newForm.nombre} onChange={e => setNewForm({ ...newForm, nombre: e.target.value })} style={fieldStyle} />
              <input placeholder="Empresa (opcional)" value={newForm.empresa} onChange={e => setNewForm({ ...newForm, empresa: e.target.value })} style={fieldStyle} />
              <textarea placeholder="Descripción (opcional)" value={newForm.descripcion} onChange={e => setNewForm({ ...newForm, descripcion: e.target.value })} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
              <select value={newForm.tipo} onChange={e => setNewForm({ ...newForm, tipo: e.target.value })} style={fieldStyle}>
                <option value="evergreen">Evergreen</option>
                <option value="lanzamiento">Lanzamiento</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleCreate} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {membersModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setMembersModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 460, maxHeight: '80vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Miembros del Proyecto</h3>
              <button onClick={() => setMembersModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {/* Current members */}
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{m.profiles?.full_name} <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>({m.rol})</span></span>
                <button onClick={() => removeMember(m.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>
              </div>
            ))}
            {/* Add member */}
            <div style={{ marginTop: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>AGREGAR MIEMBRO</span>
              {equipo.filter(e => !members.some(m => m.user_id === e.id)).map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e.full_name} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({e.role})</span></span>
                  <button onClick={() => addMember(e.id, e.role)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 11 }}>Agregar</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comisiones Config Modal */}
      {comisionesModal && comConfig && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setComisionesModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 460, maxHeight: '80vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Config. Comisiones</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(comConfig).filter(([k]) => !['id', 'proyecto_id', 'created_at'].includes(k)).map(([key, val]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</label>
                  <input
                    type="number"
                    value={val as number}
                    onChange={e => setComConfig({ ...comConfig, [key]: Number(e.target.value) })}
                    style={fieldStyle}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setComisionesModal(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={saveComisiones} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
