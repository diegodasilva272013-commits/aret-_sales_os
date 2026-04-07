'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, TrendingUp, Users as UsersIcon, Filter } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import Filters from './Filters'

const COLORS = ['#6366F1', '#34D399', '#F59E0B', '#F87171', '#818CF8', '#3B82F6', '#EC4899', '#8B5CF6']

export default function AnalyticsClient() {
  const today = new Date()
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  const [desde, setDesde] = useState(firstDay)
  const [hasta, setHasta] = useState(today.toISOString().split('T')[0])
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')
  const [proyectoId, setProyectoId] = useState('')
  const [proyectos, setProyectos] = useState<{ id: string; nombre: string }[]>([])
  const [equipo, setEquipo] = useState<{ id: string; full_name: string; role: string }[]>([])
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ desde, hasta, group_by: groupBy })
    if (proyectoId) params.set('proyecto_id', proyectoId)

    const [aRes, pRes, eRes] = await Promise.all([
      fetch(`/api/director/analytics?${params}`),
      fetch('/api/director/proyectos'),
      fetch('/api/director/equipo'),
    ])
    setData(await aRes.json())
    setProyectos(await pRes.json())
    setEquipo(await eRes.json())
    setLoading(false)
  }, [desde, hasta, groupBy, proyectoId])

  useEffect(() => { fetchData() }, [fetchData])

  const tt = {
    contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 },
    itemStyle: { color: 'var(--text-secondary)' },
    labelStyle: { color: 'var(--text-primary)', fontWeight: 600 },
  }

  const sectionStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16,
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 size={24} style={{ color: 'var(--accent)' }} /> Analytics
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Análisis avanzado del rendimiento del equipo</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Filters desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h) }} proyectos={proyectos} proyectoId={proyectoId} onProyectoChange={setProyectoId} />
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {(['day', 'week', 'month'] as const).map(g => (
            <button key={g} onClick={() => setGroupBy(g)} style={{
              padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: groupBy === g ? 'var(--accent)' : 'var(--surface-2)',
              color: groupBy === g ? '#fff' : 'var(--text-secondary)',
            }}>{g === 'day' ? 'Día' : g === 'week' ? 'Semana' : 'Mes'}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>Cargando analytics...</div>
      ) : data && (
        <>
          {/* Timeline */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              <TrendingUp size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Evolución del Embudo
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fecha" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <Tooltip {...tt} />
                <Legend />
                <Area type="monotone" dataKey="leads_nuevos" stroke="#3B82F6" fill="rgba(59,130,246,0.1)" name="Leads" />
                <Area type="monotone" dataKey="citas_agendadas" stroke="#6366F1" fill="rgba(99,102,241,0.1)" name="Agendadas" />
                <Area type="monotone" dataKey="citas_show" stroke="#818CF8" fill="rgba(129,140,248,0.1)" name="Show" />
                <Area type="monotone" dataKey="ventas_cerradas" stroke="#34D399" fill="rgba(52,211,153,0.1)" name="Ventas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Per-person comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Setters */}
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Comparativa Setters</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.porPersonaSetter}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="nombre" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip {...tt} />
                  <Legend />
                  <Bar dataKey="leads_nuevos" fill="#3B82F6" name="Leads" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="citas_agendadas" fill="#6366F1" name="Agendadas" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="citas_calificadas" fill="#34D399" name="Calificadas" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Closers */}
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Comparativa Closers</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.porPersonaCloser}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="nombre" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip {...tt} />
                  <Legend />
                  <Bar dataKey="shows" fill="#818CF8" name="Shows" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="ventas_cerradas" fill="#34D399" name="Ventas" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="monto_cobrado" fill="#F59E0B" name="Cobrado $" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per project */}
          {data.porProyecto?.length > 0 && (
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Rendimiento por Proyecto</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.porProyecto}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="proyecto" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip {...tt} />
                  <Legend />
                  <Bar dataKey="leads_nuevos" fill="#3B82F6" name="Leads" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="citas_agendadas" fill="#6366F1" name="Citas" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="ventas_cerradas" fill="#34D399" name="Ventas" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="monto_cobrado" fill="#F59E0B" name="Cobrado" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Distributions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {data.distribucionPagos?.length > 0 && (
              <div style={sectionStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Distribución de Pagos</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.distribucionPagos} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label>
                      {data.distribucionPagos.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...tt} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.motivosNoCierre?.length > 0 && (
              <div style={sectionStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Motivos No Cierre</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.motivosNoCierre} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label>
                      {data.motivosNoCierre.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...tt} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Evolution lines */}
          {data.setterEvolucion?.data?.length > 0 && (
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Evolución Individual - Setters</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.setterEvolucion.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="fecha" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip {...tt} />
                  <Legend />
                  {(data.setterEvolucion.names || []).map((name: string, i: number) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.closerEvolucion?.data?.length > 0 && (
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Evolución Individual - Closers</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.closerEvolucion.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="fecha" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip {...tt} />
                  <Legend />
                  {(data.closerEvolucion.names || []).map((name: string, i: number) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
