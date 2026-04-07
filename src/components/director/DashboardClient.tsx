'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Users, Bell, DollarSign, BarChart2, AlertTriangle, GitFork, UserCheck, Award, ChevronRight, Activity, PieChart as PieChartIcon, Receipt, Target, Percent, CreditCard } from 'lucide-react'
import StatsCards from '@/components/director/StatsCards'
import SettersTable from '@/components/director/SettersTable'
import ClosersTable from '@/components/director/ClosersTable'
import CashTable from '@/components/director/CashTable'
import MotivosTable from '@/components/director/MotivosTable'
import ComisionesTable from '@/components/director/ComisionesTable'
import AlertasPanel from '@/components/director/AlertasPanel'
import EmbudoTable from '@/components/director/EmbudoTable'
import ReportesHoy from '@/components/director/ReportesHoy'
import EditReportModal from '@/components/director/EditReportModal'
import Filters from '@/components/director/Filters'
import Link from 'next/link'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'

interface DashboardData {
  stats: {
    totalLeads: number
    totalCitas: number
    totalShows: number
    totalVentas: number
    totalMontoCerrado: number
    totalMontoCobrado: number
    totalMontoPendiente: number
    tasaCierre: number
    tasaShow: number
  }
  setterTable: Array<{
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
  }>
  closerTable: Array<{
    id: string
    nombre: string
    citas_recibidas: number
    citas_show: number
    citas_noshow: number
    ventas_cerradas: number
    ventas_no_cerradas: number
    monto_total_cerrado: number
    monto_cobrado: number
    monto_pendiente: number
    pagos_completos: number
    pagos_parciales: number
    pagos_nulo: number
    motivo_precio: number
    motivo_consultar: number
    motivo_momento: number
    motivo_competencia: number
    motivo_otro: number
  }>
  reportesHoy: {
    setters: Array<{ id: string; nombre: string; enviado: boolean; asistio_reunion?: boolean | null; reporte_id?: string | null }>
    closers: Array<{ id: string; nombre: string; enviado: boolean; asistio_reunion?: boolean | null; reporte_id?: string | null }>
  }
  reunionStats?: {
    setters_asistieron: number
    setters_total: number
    closers_asistieron: number
    closers_total: number
  }
}

interface AnalyticsData {
  timeline: Array<{ fecha: string; leads: number; citas: number; shows: number; ventas: number; monto_cobrado: number }>
  porPersonaSetter: Array<{ id: string; nombre: string; leads: number; contactados: number; citas: number; shows: number; citas_calificadas: number; tasa_conversion: number }>
  porPersonaCloser: Array<{ id: string; nombre: string; ventas: number; monto_cobrado: number; shows: number; tasa_cierre: number }>
  porProyecto: Array<{ nombre: string; leads: number; citas: number; shows: number; ventas: number; monto_cobrado: number }>
  distribucionPagos: Array<{ name: string; value: number }>
  motivosNoCierre: Array<{ name: string; value: number }>
}

const CHART_GRID = '#1a2234'
const CHART_AXIS = '#334155'
const CHART_TEXT = '#64748B'
const CHART_TOOLTIP: React.CSSProperties = {
  backgroundColor: '#0D1117',
  border: '1px solid #1a2234',
  borderRadius: 8,
  color: '#F1F5F9',
  fontSize: 12,
}
const PIE_COLORS = ['#6366F1', '#34D399', '#FBBF24', '#F87171', '#A78BFA']
const BAR_COLORS = ['#6366F1', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#38BDF8']

function formatCurrencyShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

export default function DashboardClient() {
  const today = new Date().toISOString().split('T')[0]
  const [desde, setDesde] = useState(today)
  const [hasta, setHasta] = useState(today)
  const [proyectoId, setProyectoId] = useState('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingReport, setEditingReport] = useState<{ id: string; tipo: 'setter' | 'closer' } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ desde, hasta })
    if (proyectoId) params.set('proyecto_id', proyectoId)

    const analyticsParams = new URLSearchParams({ desde, hasta, group_by: 'day' })
    if (proyectoId) analyticsParams.set('proyecto_id', proyectoId)

    const [statsRes, analyticsRes] = await Promise.all([
      fetch(`/api/director/stats?${params.toString()}`),
      fetch(`/api/director/analytics?${analyticsParams.toString()}`),
    ])

    if (statsRes.ok) {
      const json = await statsRes.json()
      setData(json)
    }
    if (analyticsRes.ok) {
      const json = await analyticsRes.json()
      setAnalytics(json)
    }
    setLoading(false)
  }, [desde, hasta, proyectoId])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="min-h-screen" style={{ background: '#080B14' }}>

      {/* Sticky Header */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(8,11,20,0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid #1a2234',
        }}
      >
        <div className="max-w-7xl mx-auto px-5 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight" style={{ color: '#F1F5F9' }}>
                Dashboard Operaciones
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Filters + Project dropdown */}
        <div className="max-w-7xl mx-auto px-5 h-10 flex items-center justify-center gap-3" style={{ borderTop: '1px solid rgba(26,34,52,0.5)' }}>
          <Filters
            desde={desde}
            hasta={hasta}
            onDesdChange={setDesde}
            onHastaChange={setHasta}
            onApply={fetchData}
          />
          <div className="w-px h-4" style={{ background: '#1a2234' }} />
          <ProjectDropdown proyectoId={proyectoId} onProyectoChange={id => { setProyectoId(id); setTimeout(fetchData, 50) }} />
        </div>
      </header>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <p className="text-xs uppercase tracking-widest" style={{ color: '#334155' }}>Cargando datos</p>
          </div>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Hero stat bar */}
          <div style={{ background: 'linear-gradient(135deg, #0D1117 0%, #0a0f1a 100%)', borderBottom: '1px solid #1a2234' }}>
            <div className="max-w-7xl mx-auto px-5 py-7 grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#475569' }}>Cash Cobrado</p>
                <p className="text-3xl font-black tracking-tight" style={{ color: '#34D399' }}>{formatCurrencyShort(data.stats.totalMontoCobrado)}</p>
                <p className="text-xs mt-1" style={{ color: '#334155' }}>del período</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#475569' }}>Revenue Prometido</p>
                <p className="text-3xl font-black tracking-tight" style={{ color: '#818CF8' }}>{formatCurrencyShort(data.stats.totalMontoCerrado)}</p>
                <p className="text-xs mt-1" style={{ color: '#334155' }}>contratos firmados</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#475569' }}>Ventas Cerradas</p>
                <p className="text-3xl font-black tracking-tight" style={{ color: '#F1F5F9' }}>{data.stats.totalVentas}</p>
                <p className="text-xs mt-1" style={{ color: '#334155' }}>en el período</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#475569' }}>Tasa de Cierre</p>
                <p className="text-3xl font-black tracking-tight" style={{ color: data.stats.tasaCierre >= 0.4 ? '#34D399' : '#FBBF24' }}>{Math.round(data.stats.tasaCierre * 100)}%</p>
                <p className="text-xs mt-1" style={{ color: '#334155' }}>show → venta</p>
              </div>
            </div>

            {/* Secondary financial metrics */}
            <div className="max-w-7xl mx-auto px-5 pb-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Pendiente Cobro', value: formatCurrencyShort(data.stats.totalMontoPendiente), color: data.stats.totalMontoPendiente > 0 ? '#FBBF24' : '#34D399', icon: CreditCard },
                { label: 'Ticket Promedio', value: data.stats.totalVentas > 0 ? formatCurrencyShort(Math.round(data.stats.totalMontoCerrado / data.stats.totalVentas)) : '$0', color: '#A78BFA', icon: Receipt },
                { label: '% Cobrado', value: data.stats.totalMontoCerrado > 0 ? `${Math.round((data.stats.totalMontoCobrado / data.stats.totalMontoCerrado) * 100)}%` : '0%', color: data.stats.totalMontoCerrado > 0 && (data.stats.totalMontoCobrado / data.stats.totalMontoCerrado) >= 0.7 ? '#34D399' : '#F87171', icon: Percent },
                { label: 'Tasa Show', value: `${Math.round(data.stats.tasaShow * 100)}%`, color: data.stats.tasaShow >= 0.7 ? '#34D399' : '#FBBF24', icon: Target },
                { label: 'Leads → Venta', value: data.stats.totalLeads > 0 ? `${((data.stats.totalVentas / data.stats.totalLeads) * 100).toFixed(1)}%` : '0%', color: '#38BDF8', icon: TrendingUp },
              ].map((m) => (
                <div key={m.label} style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid #1a2234', borderRadius: 10, padding: '10px 14px' }} className="flex items-center gap-3">
                  <div style={{ background: `${m.color}12`, borderRadius: 8, padding: 6 }}>
                    <m.icon size={14} style={{ color: m.color }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#475569' }}>{m.label}</p>
                    <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <main className="max-w-7xl mx-auto px-5 py-7 space-y-8">

            {/* Stats cards */}
            <section>
              <SectionHeader icon={BarChart2} title="Resumen General" />
              <StatsCards stats={data.stats} reunionStats={data.reunionStats} />
            </section>

            {/* Performance Charts */}
            {analytics && (
              <section>
                <SectionHeader icon={TrendingUp} title="Tendencias de Performance" />
                {analytics.timeline.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartCard title="Setter: Leads → Citas → Shows">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={analytics.timeline} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <defs>
                          <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradCitas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34D399" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradShows" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                        <XAxis dataKey="fecha" stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                        <YAxis stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                        <Tooltip contentStyle={CHART_TOOLTIP as object} />
                        <Legend wrapperStyle={{ fontSize: 11, color: CHART_TEXT }} />
                        <Area type="monotone" dataKey="leads" stroke="#6366F1" fill="url(#gradLeads)" strokeWidth={2} name="Leads" />
                        <Area type="monotone" dataKey="citas" stroke="#34D399" fill="url(#gradCitas)" strokeWidth={2} name="Citas" />
                        <Area type="monotone" dataKey="shows" stroke="#FBBF24" fill="url(#gradShows)" strokeWidth={2} name="Shows" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Closer: Ventas & Revenue">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={analytics.timeline} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                        <XAxis dataKey="fecha" stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                        <YAxis yAxisId="left" stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                        <Tooltip contentStyle={CHART_TOOLTIP as object} formatter={(value, name) => name === 'Cobrado' ? [`$${Number(value).toLocaleString()}`, name] : [value, name]} />
                        <Legend wrapperStyle={{ fontSize: 11, color: CHART_TEXT }} />
                        <Line yAxisId="left" type="monotone" dataKey="ventas" stroke="#818CF8" strokeWidth={2} dot={{ r: 3 }} name="Ventas" />
                        <Line yAxisId="right" type="monotone" dataKey="monto_cobrado" stroke="#34D399" strokeWidth={2} dot={{ r: 3 }} name="Cobrado" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
                ) : (
                  <EmptyState message="No hay datos de timeline para el período seleccionado" />
                )}
              </section>
            )}

            {/* Team Comparison */}
            {analytics && (analytics.porPersonaSetter.length > 0 || analytics.porPersonaCloser.length > 0) && (
              <section>
                <SectionHeader icon={Users} title="Comparativa del Equipo" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {analytics.porPersonaSetter.length > 0 && (
                    <ChartCard title="Setters: Rendimiento por persona">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={analytics.porPersonaSetter.map(s => ({ ...s, nombre: s.nombre.split(' ')[0] }))} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis dataKey="nombre" stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                          <YAxis stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                          <Tooltip contentStyle={CHART_TOOLTIP as object} />
                          <Legend wrapperStyle={{ fontSize: 11, color: CHART_TEXT }} />
                          <Bar dataKey="leads" fill="#6366F1" name="Leads" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="citas" fill="#34D399" name="Citas" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="shows" fill="#FBBF24" name="Shows" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  {analytics.porPersonaCloser.length > 0 && (
                    <ChartCard title="Closers: Ventas & Monto por persona">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={analytics.porPersonaCloser.map(c => ({ ...c, nombre: c.nombre.split(' ')[0] }))} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis dataKey="nombre" stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                          <YAxis yAxisId="left" stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                          <YAxis yAxisId="right" orientation="right" stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                          <Tooltip contentStyle={CHART_TOOLTIP as object} formatter={(value, name) => name === 'Cobrado' ? [`$${Number(value).toLocaleString()}`, name] : [value, name]} />
                          <Legend wrapperStyle={{ fontSize: 11, color: CHART_TEXT }} />
                          <Bar yAxisId="left" dataKey="ventas" fill="#818CF8" name="Ventas" radius={[3, 3, 0, 0]} />
                          <Bar yAxisId="right" dataKey="monto_cobrado" fill="#34D399" name="Cobrado" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                  {analytics.porPersonaSetter.length > 0 && (
                    <ChartCard title="Tasa conversión Setters (leads → citas %)">
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={analytics.porPersonaSetter.map(s => ({ nombre: s.nombre.split(' ')[0], tasa: s.tasa_conversion }))} margin={{ top: 16, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis dataKey="nombre" stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                          <YAxis stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} domain={[0, 100]} unit="%" />
                          <Tooltip contentStyle={CHART_TOOLTIP as object} formatter={(v) => [`${v}%`, 'Conversión']} />
                          <Bar dataKey="tasa" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: CHART_TEXT, fontSize: 9, formatter: ((v: number) => v ? `${v}%` : '') as never }}>
                            {analytics.porPersonaSetter.map((_, i) => (
                              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  {analytics.porPersonaCloser.length > 0 && (
                    <ChartCard title="Tasa cierre Closers (shows → ventas %)">
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={analytics.porPersonaCloser.map(c => ({ nombre: c.nombre.split(' ')[0], tasa: c.tasa_cierre }))} margin={{ top: 16, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis dataKey="nombre" stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                          <YAxis stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} domain={[0, 100]} unit="%" />
                          <Tooltip contentStyle={CHART_TOOLTIP as object} formatter={(v) => [`${v}%`, 'Cierre']} />
                          <Bar dataKey="tasa" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: CHART_TEXT, fontSize: 9, formatter: ((v: number) => v ? `${v}%` : '') as never }}>
                            {analytics.porPersonaCloser.map((_, i) => (
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

            {/* Project Performance + Distributions */}
            {analytics && (
              <section>
                <SectionHeader icon={PieChartIcon} title="Por Proyecto & Distribuciones" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {analytics.porProyecto.length > 0 && (
                    <div className="lg:col-span-1">
                      <ChartCard title="Ventas por proyecto">
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={analytics.porProyecto} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                            <XAxis type="number" stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} />
                            <YAxis type="category" dataKey="nombre" stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 10 }} width={80} />
                            <Tooltip contentStyle={CHART_TOOLTIP as object} />
                            <Bar dataKey="ventas" fill="#818CF8" name="Ventas" radius={[0, 3, 3, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    </div>
                  )}

                  {analytics.distribucionPagos.some(d => d.value > 0) && (
                    <ChartCard title="Distribución de cobros">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={analytics.distribucionPagos.filter(d => d.value > 0)}
                            cx="50%" cy="50%"
                            innerRadius={45} outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                            labelLine={{ stroke: '#1a2234' }}
                          >
                            {analytics.distribucionPagos.filter(d => d.value > 0).map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={CHART_TOOLTIP as object} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  {analytics.motivosNoCierre.some(d => d.value > 0) && (
                    <ChartCard title="Motivos de no cierre">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={analytics.motivosNoCierre.filter(d => d.value > 0)}
                            cx="50%" cy="50%"
                            innerRadius={45} outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                            labelLine={{ stroke: '#1a2234' }}
                          >
                            {analytics.motivosNoCierre.filter(d => d.value > 0).map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={CHART_TOOLTIP as object} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}
                </div>
              </section>
            )}

            {/* Reportes + Alertas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <SectionCard title="Reportes de Hoy" icon={UserCheck}>
                <ReportesHoy data={data.reportesHoy} onEditReport={(id, tipo) => setEditingReport({ id, tipo })} />
              </SectionCard>
              <div className="lg:col-span-2">
                <SectionCard title="Alertas del Sistema" icon={Bell}>
                  <AlertasPanel setterTable={data.setterTable} closerTable={data.closerTable} reportesHoy={data.reportesHoy} />
                </SectionCard>
              </div>
            </div>

            {/* Embudo + Motivos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <SectionCard title="Embudo de Ventas" icon={GitFork}>
                <EmbudoTable stats={data.stats} />
              </SectionCard>
              <SectionCard title="Motivos de No Cierre" icon={AlertTriangle}>
                <MotivosTable data={data.closerTable} />
              </SectionCard>
            </div>

            {/* Setters */}
            <section>
              <SectionHeader icon={Users} title="Performance Setters" />
              <div className="rounded-xl overflow-hidden" style={{ background: '#0D1117', border: '1px solid #1a2234' }}>
                <SettersTable data={data.setterTable} />
              </div>
            </section>

            {/* Closers */}
            <section>
              <SectionHeader icon={UserCheck} title="Performance Closers" />
              <div className="rounded-xl overflow-hidden" style={{ background: '#0D1117', border: '1px solid #1a2234' }}>
                <ClosersTable data={data.closerTable} />
              </div>
            </section>

            {/* Cash */}
            <section>
              <SectionHeader icon={DollarSign} title="Estado de Cobros" />
              <div className="rounded-xl overflow-hidden" style={{ background: '#0D1117', border: '1px solid #1a2234' }}>
                <CashTable data={data.closerTable} />
              </div>
            </section>

            {/* Comisiones */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <SectionHeaderInline icon={Award} title="Comisiones" />
                <Link href="/director/comisiones" className="flex items-center gap-1 text-xs font-medium transition-colors" style={{ color: '#6366F1' }}>
                  Ver detalle <ChevronRight size={13} />
                </Link>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ background: '#0D1117', border: '1px solid #1a2234', padding: '1.25rem' }}>
                <ComisionesTable setters={data.setterTable} closers={data.closerTable} />
              </div>
            </section>

          </main>
        </>
      )}

      {editingReport && (
        <EditReportModal
          reporteId={editingReport.id}
          tipo={editingReport.tipo}
          onClose={() => setEditingReport(null)}
          onSaved={() => fetchData()}
        />
      )}
    </div>
  )
}

function ProjectDropdown({ proyectoId, onProyectoChange }: { proyectoId: string; onProyectoChange: (id: string) => void }) {
  const [proyectos, setProyectos] = React.useState<Array<{ id: string; nombre: string; activo: boolean }>>([])
  React.useEffect(() => {
    fetch('/api/director/proyectos').then(r => r.ok ? r.json() : []).then(d => setProyectos(Array.isArray(d) ? d : []))
  }, [])
  if (proyectos.length === 0) return null
  return (
    <div className="relative shrink-0">
      <select
        value={proyectoId}
        onChange={e => onProyectoChange(e.target.value)}
        className="appearance-none rounded-lg pl-3 pr-7 py-1 text-xs font-medium focus:outline-none cursor-pointer"
        style={{ background: '#0D1117', border: '1px solid #1a2234', color: '#64748B' }}
      >
        <option value="">Todos los proyectos</option>
        {proyectos.filter(p => p.activo).map(p => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: '#475569' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-0.5 h-4 rounded-full" style={{ background: '#6366F1' }} />
      <Icon size={14} style={{ color: '#6366F1' }} />
      <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748B' }}>{title}</h2>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectionHeaderInline({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-0.5 h-4 rounded-full" style={{ background: '#6366F1' }} />
      <Icon size={14} style={{ color: '#6366F1' }} />
      <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748B' }}>{title}</h2>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#0D1117', border: '1px solid #1a2234' }}>
      <div className="flex items-center gap-2 mb-5">
        <div className="w-0.5 h-3.5 rounded-full" style={{ background: '#6366F1' }} />
        <Icon size={13} style={{ color: '#6366F1' }} />
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748B' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#0D1117', border: '1px solid #1a2234', borderRadius: 12, padding: '1.25rem' }}>
      <p style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 16 }}>{title}</p>
      {children}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ background: '#0D1117', border: '1px solid #1a2234', borderRadius: 12, padding: '2.5rem 1.5rem', textAlign: 'center' }}>
      <BarChart2 size={28} style={{ color: '#1e293b', margin: '0 auto 12px' }} />
      <p style={{ color: '#334155', fontSize: 13 }}>{message}</p>
    </div>
  )
}
