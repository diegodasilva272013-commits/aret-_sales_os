'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, BarChart2, TrendingUp, ArrowUp, ArrowDown, Users, Target } from 'lucide-react'
import {
  LineChart, Line,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'

interface TimelineEntry {
  fecha: string
  leads: number
  citas: number
  shows: number
  ventas: number
  monto_cobrado: number
}

interface SetterRow {
  id: string
  nombre: string
  leads: number
  contactados: number
  citas: number
  shows: number
  citas_calificadas: number
  tasa_conversion: number
}

interface CloserRow {
  id: string
  nombre: string
  ventas: number
  monto_cobrado: number
  shows: number
  tasa_cierre: number
}

interface ProyectoRow {
  nombre: string
  leads: number
  citas: number
  shows: number
  ventas: number
  monto_cobrado: number
}

interface PieEntry {
  name: string
  value: number
}

interface AnalyticsData {
  timeline: TimelineEntry[]
  porPersonaSetter: SetterRow[]
  porPersonaCloser: CloserRow[]
  porProyecto: ProyectoRow[]
  distribucionPagos: PieEntry[]
  motivosNoCierre: PieEntry[]
  setterEvolucion: Record<string, string | number>[]
  setterNombres: string[]
  closerEvolucion: Record<string, string | number>[]
  closerNombres: string[]
}

interface Proyecto {
  id: string
  nombre: string
  activo: boolean
}

interface Profile {
  id: string
  nombre: string
  apellido?: string
  rol: string
}

const GRID_COLOR = '#1a2234'
const AXIS_COLOR = '#334155'
const TEXT_COLOR = '#64748B'
const TOOLTIP_STYLE = {
  backgroundColor: '#0D1117',
  border: '1px solid #1a2234',
  borderRadius: 8,
  color: '#F1F5F9',
  fontSize: 12,
}

const PIE_COLORS = ['#6366F1', '#34D399', '#FBBF24', '#F87171', '#A78BFA']
const BAR_COLORS = ['#6366F1', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#38BDF8']

const PERIOD_OPTIONS = [
  { label: 'Hoy', days: 1 },
  { label: 'Semana', days: 7 },
  { label: 'Mes', days: 30 },
  { label: '3 meses', days: 90 },
]

const GROUP_BY_OPTIONS = [
  { label: 'Día', value: 'day' },
  { label: 'Semana', value: 'week' },
  { label: 'Mes', value: 'month' },
]

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div style={{ width: 3, height: 16, borderRadius: 2, background: '#6366F1' }} />
      <Icon size={14} style={{ color: '#6366F1' }} />
      <h2 style={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h2>
    </div>
  )
}

function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#0D1117', border: '1px solid #1a2234', borderRadius: 12, padding: '1.25rem' }}>
      <p style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{title}</p>
      {description && <p style={{ color: '#475569', fontSize: 11, marginBottom: 14, lineHeight: 1.4 }}>{description}</p>}
      {!description && <div style={{ marginBottom: 12 }} />}
      {children}
    </div>
  )
}

function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        borderRadius: 8,
        padding: '4px 12px',
        cursor: 'pointer',
        background: active ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.05)',
        border: `1px solid ${active ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.15)'}`,
        color: active ? '#A5B4FC' : '#64748B',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCustomLabel(props: any) {
  const { x = 0, y = 0, width = 0, value = 0 } = props
  if (!value) return null
  return (
    <text x={x + width / 2} y={y - 4} fill="#64748B" textAnchor="middle" fontSize={9}>
      {value}%
    </text>
  )
}

export default function AnalyticsClient() {
  const today = new Date().toISOString().split('T')[0]
  const [desde, setDesde] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().split('T')[0]
  })
  const [hasta] = useState(today)
  const [proyectoId, setProyectoId] = useState('')
  const [userId, setUserId] = useState('')
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])

  useEffect(() => {
    fetch('/api/director/proyectos').then(r => r.ok ? r.json() : []).then(d => setProyectos(Array.isArray(d) ? d : []))
    fetch('/api/director/equipo').then(r => r.ok ? r.json() : {}).then((d: { profiles?: Profile[] }) => setProfiles(d.profiles || []))
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ desde, hasta, group_by: groupBy })
    if (proyectoId) params.set('proyecto_id', proyectoId)
    if (userId) params.set('user_id', userId)
    const res = await fetch(`/api/director/analytics?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [desde, proyectoId, userId, groupBy, hasta])

  useEffect(() => { fetchData() }, [fetchData])

  function setPeriod(days: number) {
    const d = new Date(); d.setDate(d.getDate() - days + 1)
    setDesde(d.toISOString().split('T')[0])
  }

  // KPI trend table: compare first half vs second half of timeline
  function buildKpiTrends() {
    if (!data || data.timeline.length < 2) return []
    const half = Math.floor(data.timeline.length / 2)
    const first = data.timeline.slice(0, half)
    const second = data.timeline.slice(half)
    const sum = (arr: TimelineEntry[], key: keyof TimelineEntry) => arr.reduce((s, r) => s + Number(r[key]), 0)
    const metrics = [
      { label: 'Leads', key: 'leads' as keyof TimelineEntry },
      { label: 'Citas', key: 'citas' as keyof TimelineEntry },
      { label: 'Shows', key: 'shows' as keyof TimelineEntry },
      { label: 'Ventas', key: 'ventas' as keyof TimelineEntry },
      { label: 'Monto cobrado', key: 'monto_cobrado' as keyof TimelineEntry },
    ]
    return metrics.map(m => {
      const prev = sum(first, m.key)
      const curr = sum(second, m.key)
      const pct = prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100)
      return { label: m.label, prev, curr, pct }
    })
  }

  const kpiTrends = buildKpiTrends()

  const setterRateData = (data?.porPersonaSetter || []).map(s => ({
    nombre: s.nombre.split(' ')[0],
    'Tasa conv. %': s.tasa_conversion,
    'Citas cal.': s.citas_calificadas,
    'Shows': s.shows,
  }))

  const closerRateData = (data?.porPersonaCloser || []).map(c => ({
    nombre: c.nombre.split(' ')[0],
    'Tasa cierre %': c.tasa_cierre,
    'Ventas': c.ventas,
  }))

  // Build people list from first unfiltered load
  const [peopleOptions, setPeopleOptions] = React.useState<{ id: string; nombre: string; rol: string }[]>([])
  React.useEffect(() => {
    if (!data || userId) return
    const map = new Map<string, { id: string; nombre: string; rol: string }>()
    for (const s of data.porPersonaSetter || []) {
      map.set(s.id, { id: s.id, nombre: s.nombre, rol: 'setter' })
    }
    for (const c of data.porPersonaCloser || []) {
      map.set(c.id, { id: c.id, nombre: c.nombre, rol: 'closer' })
    }
    for (const p of profiles) {
      if (!map.has(p.id)) {
        map.set(p.id, { id: p.id, nombre: p.nombre, rol: p.rol })
      }
    }
    setPeopleOptions(Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)))
  }, [data, profiles, userId])

  const selectedPerson = peopleOptions.find(p => p.id === userId)
  const selectedPersonName = selectedPerson?.nombre || ''
  const selectedPersonRol = selectedPerson?.rol || ''

  return (
    <div className="min-h-screen" style={{ background: '#080B14' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/director" style={{ color: '#475569' }}>
            <ArrowLeft size={18} />
          </Link>
          <BarChart2 size={18} style={{ color: '#6366F1' }} />
          <h1 style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 18 }}>Analytics</h1>
        </div>

        {/* Filters */}
        <div style={{ background: '#0D1117', border: '1px solid #1a2234', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem' }}>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Period pills */}
            <div className="flex gap-1.5">
              {PERIOD_OPTIONS.map(opt => (
                <PillButton key={opt.label} active={false} onClick={() => setPeriod(opt.days)}>
                  {opt.label}
                </PillButton>
              ))}
            </div>

            <div style={{ width: 1, height: 24, background: '#1a2234' }} />

            {/* Group by */}
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 11, color: '#475569' }}>Ver por:</span>
              {GROUP_BY_OPTIONS.map(opt => (
                <PillButton key={opt.value} active={groupBy === opt.value} onClick={() => setGroupBy(opt.value as 'day' | 'week' | 'month')}>
                  {opt.label}
                </PillButton>
              ))}
            </div>

            <div style={{ width: 1, height: 24, background: '#1a2234' }} />

            {/* Project selector */}
            <div className="relative">
              <select
                value={proyectoId}
                onChange={e => setProyectoId(e.target.value)}
                style={{ background: '#080B14', border: '1px solid #1a2234', borderRadius: 8, padding: '4px 28px 4px 10px', color: '#64748B', fontSize: 12, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">Todos los proyectos</option>
                {proyectos.filter(p => p.activo).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: '#475569' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Person selector */}
            <div className="relative">
              <select
                value={userId}
                onChange={e => setUserId(e.target.value)}
                style={{ background: '#080B14', border: '1px solid #1a2234', borderRadius: 8, padding: '4px 28px 4px 10px', color: '#64748B', fontSize: 12, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">Todas las personas</option>
                {peopleOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} ({p.rol})</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: '#475569' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          </div>
        )}

        {!loading && data && (
          <div className="space-y-8">

            {/* No data message */}
            {data.timeline.length === 0 && data.porPersonaSetter.length === 0 && data.porPersonaCloser.length === 0 && (
              <div style={{ background: '#0D1117', border: '1px solid #1a2234', borderRadius: 12, padding: '3rem' }} className="text-center">
                <p style={{ color: '#64748B', fontSize: 14 }}>No hay reportes cargados en el período seleccionado.</p>
                <p style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>Probá con un rango de fechas más amplio o verificá que los setters/closers hayan enviado sus reportes.</p>
              </div>
            )}

            {/* ── Section 1: Embudo general en el tiempo ── */}
            {data.timeline.length > 0 && (
            <section>
              <SectionTitle icon={TrendingUp} title={selectedPersonName ? `Embudo de ${selectedPersonName} en el tiempo` : 'Embudo de ventas en el tiempo'} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard
                  title={selectedPersonName && selectedPersonRol === 'setter' ? `${selectedPersonName}: Leads → Citas → Shows` : 'Setter: Leads → Citas → Shows'}
                  description={selectedPersonName && selectedPersonRol === 'setter'
                    ? `Evolución del embudo de ${selectedPersonName}: cuántos leads recibió, cuántos convirtió en citas y cuántos asistieron (show).`
                    : 'Evolución diaria del embudo de los setters. Muestra cuántos leads entraron, cuántos se convirtieron en citas agendadas y cuántos asistieron (show). Ideal para detectar cuellos de botella en la captación.'}
                >
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={data.timeline} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366F1" stopOpacity={0} /></linearGradient>
                        <linearGradient id="gradCitas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34D399" stopOpacity={0.3} /><stop offset="95%" stopColor="#34D399" stopOpacity={0} /></linearGradient>
                        <linearGradient id="gradShows" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FBBF24" stopOpacity={0.3} /><stop offset="95%" stopColor="#FBBF24" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                      <XAxis dataKey="fecha" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <YAxis stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 11, color: TEXT_COLOR }} />
                      <Area type="monotone" dataKey="leads" stroke="#6366F1" strokeWidth={2} fill="url(#gradLeads)" dot={{ r: 3, fill: '#6366F1' }} name="Leads" />
                      <Area type="monotone" dataKey="citas" stroke="#34D399" strokeWidth={2} fill="url(#gradCitas)" dot={{ r: 3, fill: '#34D399' }} name="Citas" />
                      <Area type="monotone" dataKey="shows" stroke="#FBBF24" strokeWidth={2} fill="url(#gradShows)" dot={{ r: 3, fill: '#FBBF24' }} name="Shows" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title={selectedPersonName && selectedPersonRol === 'closer' ? `${selectedPersonName}: Ventas & Monto cobrado` : 'Closer: Ventas & Monto cobrado'}
                  description={selectedPersonName && selectedPersonRol === 'closer'
                    ? `Evolución de ventas cerradas y monto cobrado por ${selectedPersonName}. Permite ver si está cerrando pero no cobrando.`
                    : 'Evolución diaria de las ventas cerradas (eje izquierdo) y el monto efectivamente cobrado en $ (eje derecho). Permite ver si se está cerrando pero no cobrando.'}
                >
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={data.timeline} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                      <XAxis dataKey="fecha" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <YAxis yAxisId="left" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => name === 'Monto cobrado' ? [`$${Number(value).toLocaleString()}`, name] : [value, name]} />
                      <Legend wrapperStyle={{ fontSize: 11, color: TEXT_COLOR }} />
                      <Line yAxisId="left" type="monotone" dataKey="ventas" stroke="#818CF8" strokeWidth={2} dot={{ r: 4, fill: '#818CF8' }} name="Ventas" />
                      <Line yAxisId="right" type="monotone" dataKey="monto_cobrado" stroke="#34D399" strokeWidth={2} dot={{ r: 4, fill: '#34D399' }} name="Monto cobrado" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            </section>
            )}

            {/* ── Section 2: Evolución individual por persona ── */}
            {(data.setterEvolucion.length > 0 || data.closerEvolucion.length > 0) && (
            <section>
              <SectionTitle icon={Users} title={selectedPersonName ? `Evolución de ${selectedPersonName}` : 'Evolución individual por persona'} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.setterEvolucion.length > 0 && (
                <ChartCard
                  title="Citas agendadas por Setter"
                  description={selectedPersonName && selectedPersonRol === 'setter'
                    ? `Evolución de citas agendadas por ${selectedPersonName}. Cada punto muestra las citas que generó en ese período.`
                    : 'Cada línea representa un setter distinto. Muestra cuántas citas agendó cada uno a lo largo del tiempo. Sirve para comparar productividad y consistencia.'}
                >
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data.setterEvolucion} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                      <XAxis dataKey="fecha" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <YAxis stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 11, color: TEXT_COLOR }} />
                      {data.setterNombres.map((name, i) => (
                        <Line key={name} type="monotone" dataKey={name} stroke={BAR_COLORS[i % BAR_COLORS.length]} strokeWidth={2} dot={{ r: 4, fill: BAR_COLORS[i % BAR_COLORS.length] }} name={name} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
                )}

                {data.closerEvolucion.length > 0 && (
                <ChartCard
                  title="Ventas cerradas por Closer"
                  description={selectedPersonName && selectedPersonRol === 'closer'
                    ? `Evolución de ventas cerradas por ${selectedPersonName}. Cada punto muestra las ventas que cerró en ese período.`
                    : 'Cada línea representa un closer distinto. Muestra cuántas ventas cerró cada uno a lo largo del tiempo. Sirve para identificar quién está rindiendo más y quién necesita apoyo.'}
                >
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data.closerEvolucion} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                      <XAxis dataKey="fecha" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <YAxis stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 11, color: TEXT_COLOR }} />
                      {data.closerNombres.map((name, i) => (
                        <Line key={name} type="monotone" dataKey={name} stroke={BAR_COLORS[i % BAR_COLORS.length]} strokeWidth={2} dot={{ r: 4, fill: BAR_COLORS[i % BAR_COLORS.length] }} name={name} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
                )}
              </div>
            </section>
            )}

            {/* ── Section 3: Por Proyecto ── */}
            {data.porProyecto.length > 0 && (
              <section>
                <SectionTitle icon={Target} title="Performance por proyecto" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartCard
                    title="Embudo por proyecto (Setter)"
                    description="Compara el volumen de leads, citas agendadas y shows entre proyectos. Sirve para identificar qué proyecto tiene mejor captación y cuál necesita más atención."
                  >
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={data.porProyecto} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                        <XAxis dataKey="nombre" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} angle={-20} textAnchor="end" />
                        <YAxis stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ fontSize: 11, color: TEXT_COLOR }} />
                        <Bar dataKey="leads" fill="#6366F1" name="Leads" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="citas" fill="#34D399" name="Citas" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="shows" fill="#FBBF24" name="Shows" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title="Resultados por proyecto (Closer)"
                    description="Ventas cerradas (eje izq.) y dinero cobrado (eje der.) por cada proyecto. Permite priorizar los proyectos más rentables."
                  >
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={data.porProyecto} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                        <XAxis dataKey="nombre" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} angle={-20} textAnchor="end" />
                        <YAxis yAxisId="left" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => name === 'Monto cobrado' ? [`$${Number(value).toLocaleString()}`, name] : [value, name]} />
                        <Legend wrapperStyle={{ fontSize: 11, color: TEXT_COLOR }} />
                        <Bar yAxisId="left" dataKey="ventas" fill="#818CF8" name="Ventas" radius={[3, 3, 0, 0]} />
                        <Bar yAxisId="right" dataKey="monto_cobrado" fill="#34D399" name="Monto cobrado" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </section>
            )}

            {/* ── Section 4: Comparativa / Detalle por persona ── */}
            {(data.porPersonaCloser.length > 0 || data.porPersonaSetter.length > 0) && (
            <section>
              <SectionTitle icon={BarChart2} title={selectedPersonName ? `Detalle de ${selectedPersonName}` : 'Comparativa entre personas'} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.porPersonaCloser.length > 0 && (
                <ChartCard
                  title={selectedPersonName && selectedPersonRol === 'closer' ? `Ventas & monto de ${selectedPersonName}` : 'Ventas & monto por Closer'}
                  description={selectedPersonName && selectedPersonRol === 'closer'
                    ? `Resumen de ventas cerradas y monto cobrado por ${selectedPersonName} en el período seleccionado.`
                    : 'Ranking de closers: barras moradas = cantidad de ventas cerradas, barras verdes = monto total cobrado en $. Compará rápidamente quién factura más.'}
                >
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.porPersonaCloser} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                      <XAxis dataKey="nombre" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <YAxis yAxisId="left" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => name === 'Monto cobrado' ? [`$${Number(value).toLocaleString()}`, name] : [value, name]} />
                      <Legend wrapperStyle={{ fontSize: 11, color: TEXT_COLOR }} />
                      <Bar yAxisId="left" dataKey="ventas" fill="#6366F1" name="Ventas" radius={[3, 3, 0, 0]} />
                      <Bar yAxisId="right" dataKey="monto_cobrado" fill="#34D399" name="Monto cobrado" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                )}

                {data.porPersonaSetter.length > 0 && (
                <ChartCard
                  title={selectedPersonName && selectedPersonRol === 'setter' ? `Embudo de ${selectedPersonName}` : 'Embudo completo por Setter'}
                  description={selectedPersonName && selectedPersonRol === 'setter'
                    ? `Embudo completo de ${selectedPersonName}: leads recibidos → contactados → citas agendadas → shows en el período seleccionado.`
                    : 'Cada barra apilada muestra el embudo de cada setter: leads recibidos → contactados → citas agendadas → shows. Compará el volumen y eficiencia de cada setter.'}
                >
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.porPersonaSetter} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                      <XAxis dataKey="nombre" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <YAxis stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 11, color: TEXT_COLOR }} />
                      <Bar dataKey="leads" fill="#6366F1" name="Leads" stackId="a" />
                      <Bar dataKey="contactados" fill="#818CF8" name="Contactados" stackId="a" />
                      <Bar dataKey="citas" fill="#34D399" name="Citas" stackId="a" />
                      <Bar dataKey="shows" fill="#FBBF24" name="Shows" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                )}
              </div>
            </section>
            )}

            {/* ── Section 5: Tasas de conversión ── */}
            {(setterRateData.length > 0 || closerRateData.length > 0) && (
            <section>
              <SectionTitle icon={Users} title={selectedPersonName ? `Tasa de conversión de ${selectedPersonName}` : 'Tasas de conversión individuales'} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {setterRateData.length > 0 && (
                <ChartCard
                  title={selectedPersonName && selectedPersonRol === 'setter' ? `Tasa de conversión de ${selectedPersonName}` : 'Tasa de conversión Setters'}
                  description={selectedPersonName && selectedPersonRol === 'setter'
                    ? `Porcentaje de leads que ${selectedPersonName} convirtió en citas agendadas en el período seleccionado. Objetivo ideal: > 30%.`
                    : 'Porcentaje de leads que cada setter convirtió en citas agendadas. El % se muestra arriba de cada barra. Objetivo ideal: > 30%.'}
                >
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={setterRateData} margin={{ top: 16, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                      <XAxis dataKey="nombre" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <YAxis stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} domain={[0, 100]} unit="%" />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Conversión']} />
                      <Bar dataKey="Tasa conv. %" radius={[4, 4, 0, 0]} label={renderCustomLabel}>
                        {setterRateData.map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                )}

                {closerRateData.length > 0 && (
                <ChartCard
                  title={selectedPersonName && selectedPersonRol === 'closer' ? `Tasa de cierre de ${selectedPersonName}` : 'Tasa de cierre Closers'}
                  description={selectedPersonName && selectedPersonRol === 'closer'
                    ? `Porcentaje de shows que ${selectedPersonName} convirtió en ventas en el período seleccionado. Objetivo ideal: > 40%.`
                    : 'Porcentaje de shows (citas atendidas) que cada closer convirtió en ventas. El % se muestra arriba de cada barra. Objetivo ideal: > 40%.'}
                >
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={closerRateData} margin={{ top: 16, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                      <XAxis dataKey="nombre" stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} />
                      <YAxis stroke={AXIS_COLOR} tick={{ fill: TEXT_COLOR, fontSize: 10 }} domain={[0, 100]} unit="%" />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Tasa cierre']} />
                      <Bar dataKey="Tasa cierre %" radius={[4, 4, 0, 0]} label={renderCustomLabel}>
                        {closerRateData.map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                )}
              </div>
            </section>
            )}

            {/* ── Section 6: Distribuciones (Pie Charts) ── */}
            {(data.distribucionPagos.some(d => d.value > 0) || data.motivosNoCierre.some(d => d.value > 0)) && (
            <section>
              <SectionTitle icon={BarChart2} title="Distribuciones" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.distribucionPagos.some(d => d.value > 0) && (
                <ChartCard
                  title="Distribución de pagos"
                  description="Proporción de ventas según estado de pago: completo (cobrado 100%), parcial (cobrado en cuotas) o sin pagar. Si hay mucho 'sin pagar', revisar seguimiento de cobros."
                >
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.distribucionPagos}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#1a2234' }}
                      >
                        {data.distribucionPagos.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
                )}

                {data.motivosNoCierre.some(d => d.value > 0) && (
                <ChartCard
                  title="Motivos de no cierre"
                  description="Razones por las que los prospectos no compraron: precio, necesita consultarlo, no es el momento, prefiere competencia u otro. Sirve para ajustar objeciones en el speech."
                >
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.motivosNoCierre}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#1a2234' }}
                      >
                        {data.motivosNoCierre.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
                )}
              </div>
            </section>
            )}

            {/* ── Section 7: KPI Trends Table ── */}
            {kpiTrends.length > 0 && (
              <section>
                <SectionTitle icon={TrendingUp} title="Tendencias período anterior vs actual" />
                <div style={{ background: '#0D1117', border: '1px solid #1a2234', borderRadius: 12, overflow: 'hidden' }}>
                  <p style={{ color: '#475569', fontSize: 11, padding: '12px 16px 0', lineHeight: 1.4 }}>
                    Se divide el rango de fechas en dos mitades y se comparan los totales. Un % positivo (verde) significa mejora, negativo (rojo) significa caída.
                  </p>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1a2234' }}>
                        <th style={{ textAlign: 'left', padding: '10px 16px', color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Métrica</th>
                        <th style={{ textAlign: 'right', padding: '10px 16px', color: '#64748B', fontSize: 11, fontWeight: 600 }}>1ra mitad</th>
                        <th style={{ textAlign: 'right', padding: '10px 16px', color: '#64748B', fontSize: 11, fontWeight: 600 }}>2da mitad</th>
                        <th style={{ textAlign: 'right', padding: '10px 16px', color: '#64748B', fontSize: 11, fontWeight: 600 }}>Cambio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpiTrends.map((row, i) => (
                        <tr key={row.label} style={{ borderBottom: i < kpiTrends.length - 1 ? '1px solid #1a2234' : 'none' }}>
                          <td style={{ padding: '10px 16px', color: '#94A3B8', fontSize: 13 }}>{row.label}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: '#475569', fontSize: 13 }}>{row.prev.toLocaleString()}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>{row.curr.toLocaleString()}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600,
                              color: row.pct > 0 ? '#34D399' : row.pct < 0 ? '#F87171' : '#64748B'
                            }}>
                              {row.pct > 0 ? <ArrowUp size={11} /> : row.pct < 0 ? <ArrowDown size={11} /> : null}
                              {Math.abs(row.pct)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
