'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, Plus, X, Save, ChevronLeft, ChevronRight, Clock, Trash2, Paperclip, Users, Link2, Repeat } from 'lucide-react'

interface Tarea {
  id: string
  titulo: string
  descripcion?: string
  tipo: 'tarea' | 'evento' | 'reunion' | 'bloqueo'
  prioridad: 'alta' | 'media' | 'baja'
  estado: 'pendiente' | 'completada' | 'cancelada'
  fecha_inicio?: string
  fecha_fin?: string
  todo_el_dia: boolean
  recurrencia?: string
  participantes?: string[]
  link_reunion?: string
}

const TIPO_COLORS: Record<string, string> = {
  tarea: 'var(--accent)',
  evento: 'var(--success)',
  reunion: 'var(--info)',
  bloqueo: 'var(--text-muted)',
}

const PRIORIDAD_COLORS: Record<string, { bg: string; text: string }> = {
  alta: { bg: 'rgba(239,68,68,0.15)', text: 'var(--danger)' },
  media: { bg: 'rgba(245,158,11,0.15)', text: 'var(--warning)' },
  baja: { bg: 'rgba(34,197,94,0.15)', text: 'var(--success)' },
}

export default function AgendaClient() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [equipo, setEquipo] = useState<{ id: string; full_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'day' | 'week' | 'month'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editTarea, setEditTarea] = useState<Tarea | null>(null)
  const [form, setForm] = useState<Partial<Tarea>>({ titulo: '', tipo: 'tarea', prioridad: 'media', estado: 'pendiente', todo_el_dia: false, participantes: [] })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [tRes, eRes] = await Promise.all([
      fetch('/api/director/tareas'),
      fetch('/api/director/equipo'),
    ])
    setTareas(await tRes.json())
    setEquipo(await eRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    if (editTarea) {
      await fetch('/api/director/tareas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarea.id, ...form }),
      })
    } else {
      await fetch('/api/director/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }
    setShowModal(false)
    setEditTarea(null)
    setForm({ titulo: '', tipo: 'tarea', prioridad: 'media', estado: 'pendiente', todo_el_dia: false, participantes: [] })
    fetchData()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/director/tareas?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  const handleComplete = async (tarea: Tarea) => {
    await fetch('/api/director/tareas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tarea.id, estado: tarea.estado === 'completada' ? 'pendiente' : 'completada' }),
    })
    fetchData()
  }

  const openEdit = (tarea: Tarea) => {
    setEditTarea(tarea)
    setForm(tarea)
    setShowModal(true)
  }

  const openNew = (date?: Date) => {
    setEditTarea(null)
    const d = date || new Date()
    setForm({
      titulo: '', tipo: 'tarea', prioridad: 'media', estado: 'pendiente', todo_el_dia: false,
      fecha_inicio: d.toISOString().slice(0, 16),
      fecha_fin: new Date(d.getTime() + 3600000).toISOString().slice(0, 16),
      participantes: [],
    })
    setShowModal(true)
  }

  // Navigation
  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  // Month calendar
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay()
    const days: { date: Date; isCurrentMonth: boolean }[] = []

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d, isCurrentMonth: false })
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }
    return days
  }, [currentDate])

  const getTareasForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return tareas.filter(t => t.fecha_inicio?.startsWith(dateStr))
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 13,
  }

  const todayStr = new Date().toISOString().split('T')[0]

  // Week days for day view
  const weekTareas = useMemo(() => {
    const start = new Date(currentDate)
    const day = start.getDay()
    start.setDate(start.getDate() - day)
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      days.push(d)
    }
    return days
  }, [currentDate])

  // Day list
  const dayTareas = getTareasForDate(currentDate)

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={24} style={{ color: 'var(--accent)' }} /> Agenda
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {(['day', 'week', 'month'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: view === v ? 'var(--accent)' : 'var(--surface-2)',
                color: view === v ? '#fff' : 'var(--text-secondary)',
              }}>{v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => navigate(-1)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
            <button onClick={() => setCurrentDate(new Date())} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>Hoy</button>
            <button onClick={() => navigate(1)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><ChevronRight size={16} /></button>
          </div>
          <button onClick={() => openNew()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Plus size={14} /> Nueva
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'month' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{d}</div>
            ))}
          </div>
          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {monthDays.map((day, i) => {
              const dateStr = day.date.toISOString().split('T')[0]
              const dayTareas = getTareasForDate(day.date)
              const isToday = dateStr === todayStr
              return (
                <div
                  key={i}
                  onClick={() => { setCurrentDate(day.date); openNew(day.date) }}
                  style={{
                    minHeight: 80, padding: 6, borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                    borderBottom: '1px solid var(--border)',
                    background: isToday ? 'var(--accent-glow)' : 'transparent',
                    opacity: day.isCurrentMonth ? 1 : 0.4,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--accent)' : 'var(--text-secondary)', marginBottom: 4 }}>
                    {day.date.getDate()}
                  </div>
                  {dayTareas.slice(0, 3).map(t => (
                    <div
                      key={t.id}
                      onClick={e => { e.stopPropagation(); openEdit(t) }}
                      style={{
                        fontSize: 10, padding: '1px 4px', borderRadius: 3, marginBottom: 2,
                        background: TIPO_COLORS[t.tipo] || 'var(--accent)',
                        color: '#fff',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        textDecoration: t.estado === 'completada' ? 'line-through' : 'none',
                        opacity: t.estado === 'completada' ? 0.6 : 1,
                      }}
                    >
                      {t.titulo}
                    </div>
                  ))}
                  {dayTareas.length > 3 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{dayTareas.length - 3} más</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'week' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekTareas.map((day, i) => {
              const dateStr = day.toISOString().split('T')[0]
              const isToday = dateStr === todayStr
              const dt = getTareasForDate(day)
              return (
                <div key={i} style={{ borderRight: i < 6 ? '1px solid var(--border)' : 'none', minHeight: 300 }}>
                  <div style={{ padding: '10px', borderBottom: '1px solid var(--border)', textAlign: 'center', background: isToday ? 'var(--accent-glow)' : 'transparent' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][day.getDay()]}</div>
                    <div style={{ fontSize: 16, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--accent)' : 'var(--text-primary)' }}>{day.getDate()}</div>
                  </div>
                  <div style={{ padding: 4 }}>
                    {dt.map(t => (
                      <div key={t.id} onClick={() => openEdit(t)} style={{
                        fontSize: 11, padding: '4px 6px', borderRadius: 4, marginBottom: 4,
                        background: `${TIPO_COLORS[t.tipo]}22` || 'var(--surface-2)',
                        borderLeft: `3px solid ${TIPO_COLORS[t.tipo]}`,
                        cursor: 'pointer',
                      }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.titulo}</div>
                        {t.fecha_inicio && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{new Date(t.fecha_inicio).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'day' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
            {currentDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          {dayTareas.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 40 }}>No hay tareas para este día</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayTareas.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)', borderLeft: `3px solid ${TIPO_COLORS[t.tipo]}` }}>
                  <input type="checkbox" checked={t.estado === 'completada'} onChange={() => handleComplete(t)} style={{ cursor: 'pointer' }} />
                  <div style={{ flex: 1 }} onClick={() => openEdit(t)}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', textDecoration: t.estado === 'completada' ? 'line-through' : 'none', cursor: 'pointer' }}>{t.titulo}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      {t.fecha_inicio && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}><Clock size={10} style={{ marginRight: 2, verticalAlign: 'middle' }} />{new Date(t.fecha_inicio).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>}
                      <span style={{ ...PRIORIDAD_COLORS[t.prioridad], padding: '0 4px', borderRadius: 3, fontSize: 10, fontWeight: 600 }}>{t.prioridad}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => { setShowModal(false); setEditTarea(null) }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 480, maxHeight: '85vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{editTarea ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {editTarea && (
                  <button onClick={() => { handleDelete(editTarea.id); setShowModal(false); setEditTarea(null) }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                )}
                <button onClick={() => { setShowModal(false); setEditTarea(null) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Título" value={form.titulo || ''} onChange={e => setForm({ ...form, titulo: e.target.value })} style={fieldStyle} />
              <textarea placeholder="Descripción" value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select value={form.tipo || 'tarea'} onChange={e => setForm({ ...form, tipo: e.target.value as any })} style={fieldStyle}>
                  <option value="tarea">Tarea</option>
                  <option value="evento">Evento</option>
                  <option value="reunion">Reunión</option>
                  <option value="bloqueo">Bloqueo</option>
                </select>
                <select value={form.prioridad || 'media'} onChange={e => setForm({ ...form, prioridad: e.target.value as any })} style={fieldStyle}>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Inicio</label>
                  <input type="datetime-local" value={form.fecha_inicio?.slice(0, 16) || ''} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} style={fieldStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fin</label>
                  <input type="datetime-local" value={form.fecha_fin?.slice(0, 16) || ''} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} style={fieldStyle} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.todo_el_dia || false} onChange={e => setForm({ ...form, todo_el_dia: e.target.checked })} />
                Todo el día
              </label>
              {form.tipo === 'reunion' && (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Link2 size={10} /> Link de reunión</label>
                  <input placeholder="https://meet.google.com/..." value={form.link_reunion || ''} onChange={e => setForm({ ...form, link_reunion: e.target.value })} style={fieldStyle} />
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Users size={10} /> Participantes</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {equipo.map(e => {
                    const selected = form.participantes?.includes(e.id)
                    return (
                      <button
                        key={e.id}
                        onClick={() => {
                          const p = form.participantes || []
                          setForm({ ...form, participantes: selected ? p.filter(id => id !== e.id) : [...p, e.id] })
                        }}
                        style={{
                          padding: '3px 8px', borderRadius: 6, border: 'none', fontSize: 11, cursor: 'pointer',
                          background: selected ? 'var(--accent)' : 'var(--surface-2)',
                          color: selected ? '#fff' : 'var(--text-secondary)',
                        }}
                      >{e.full_name}</button>
                    )
                  })}
                </div>
              </div>
              <select value={form.recurrencia || ''} onChange={e => setForm({ ...form, recurrencia: e.target.value || undefined })} style={fieldStyle}>
                <option value="">Sin recurrencia</option>
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => { setShowModal(false); setEditTarea(null) }} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleSave} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Save size={14} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
