'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, TrendingUp, Activity } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import Filters from './Filters'
import StatsCards from './StatsCards'
import SettersTable from './SettersTable'
import ClosersTable from './ClosersTable'
import CashTable from './CashTable'
import ReportesHoy from './ReportesHoy'
import MotivosTable from './MotivosTable'
import EmbudoTable from './EmbudoTable'
import AlertasPanel from './AlertasPanel'
import ComisionesTable from './ComisionesTable'
import EditReportModal from './EditReportModal'

interface DashboardData {
  periodo: { desde: string; hasta: string }
  stats: Record<string, any>
  setters: any[]
  closers: any[]
  cash: any[]
  motivos: any[]
  embudo: { leads: number; citas: number; shows: number; ventas: number; leadToVenta: number; citaToShow: number; showToCierre: number }
  reportesHoy: { setters: any[]; closers: any[] }
  reunionStats: any
}

export default function DashboardClient() {
  const today = new Date()
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  const [desde, setDesde] = useState(firstDay)
  const [hasta, setHasta] = useState(today.toISOString().split('T')[0])
  const [proyectoId, setProyectoId] = useState('')
  const [proyectos, setProyectos] = useState<{ id: string; nombre: string }[]>([])
  const [data, setData] = useState<DashboardData | null>(null)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<{ tipo: 'setter' | 'closer'; reporteId: string } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ desde, hasta })
    if (proyectoId) params.set('proyecto_id', proyectoId)

    const [statsRes, analyticsRes, proyectosRes] = await Promise.all([
      fetch(`/api/director/stats?${params}`),
      fetch(`/api/director/analytics?${params}`),
      fetch('/api/director/proyectos'),
    ])

    const statsData = await statsRes.json()
    const anData = await analyticsRes.json()
    const projData = await proyectosRes.json()

    setData(statsData)
    setAnalyticsData(anData)
    setProyectos(projData)
    setLoading(false)
  }, [desde, hasta, proyectoId])

  useEffect(() => { fetchData() }, [fetchData])

  const comisionesData = [
    ...(data?.setters || []).map((s: any) => ({ miembro: s.nombre, rol: 'setter', total: (s.calificadas || 0) * 25, desglose: [] })),
    ...(data?.closers || []).map((c: any) => ({ miembro: c.nombre, rol: 'closer', total: Number(c.cobrado || 0) * 0.08, desglose: [] })),
  ]

  const chartTooltipStyle = {
    contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 },
    itemStyle: { color: 'var(--text-secondary)' },
    labelStyle: { color: 'var(--text-primary)', fontWeight: 600 },
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={24} style={{ color: 'var(--accent)' }} />
            Director Dashboard
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Monitoreo en tiempo real de tu equipo de ventas
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)',
            cursor: 'pointer', fontSize: 13,
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Filters */}
      <Filters
        desde={desde}
        hasta={hasta}
        onChange={(d, h) => { setDesde(d); setHasta(h) }}
        proyectos={proyectos}
        proyectoId={proyectoId}
        onProyectoChange={setProyectoId}
      />

      {/* Alertas */}
      {data?.stats?.alertas?.length > 0 && <AlertasPanel alertas={data.stats.alertas} />}

      {/* Stats Cards */}
      {data && <StatsCards stats={data.stats} />}

      {/* Charts Row */}
      {analyticsData?.timeline && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              <TrendingUp size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Tendencia
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analyticsData.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fecha" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <Tooltip {...chartTooltipStyle} />
                <Area type="monotone" dataKey="citas_agendadas" stackId="1" stroke="var(--accent)" fill="var(--accent-glow)" name="Agendadas" />
                <Area type="monotone" dataKey="ventas_cerradas" stackId="2" stroke="var(--success)" fill="rgba(34,197,94,0.15)" name="Ventas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Cobrado por Día</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analyticsData.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fecha" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="monto_cobrado" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Cobrado" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Embudo */}
      {data && <EmbudoTable data={[
        { etapa: 'Leads Nuevos', valor: data.embudo?.leads || 0, color: 'var(--info)' },
        { etapa: 'Citas Agendadas', valor: data.embudo?.citas || 0, color: 'var(--accent)' },
        { etapa: 'Citas Show', valor: data.embudo?.shows || 0, color: '#818CF8' },
        { etapa: 'Ventas', valor: data.embudo?.ventas || 0, color: 'var(--success)' },
      ]} />}

      {/* Tables Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SettersTable
          setters={(data?.setters || []).map(s => ({
            id: s.id, nombre: s.nombre,
            leads_nuevos: s.leads || 0, citas_agendadas: s.agendadas || 0,
            citas_show: s.show || 0, citas_calificadas: s.calificadas || 0,
            tasa_show: s.agendadas > 0 ? Math.round((s.show / s.agendadas) * 100) : 0,
          }))}
        />
        <ClosersTable
          closers={(data?.closers || []).map(c => ({
            id: c.id, nombre: c.nombre,
            shows: c.show || 0, ventas_cerradas: c.ventas || 0,
            tasa_cierre: c.tasaCierre || 0, monto_cobrado: c.cobrado || 0,
          }))}
        />
      </div>

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <CashTable data={data?.cash || []} />
        <MotivosTable data={data?.motivos || []} />
        <ReportesHoy data={[
          ...(data?.reportesHoy?.setters || []).map((s: any) => ({ nombre: s.nombre, rol: 'setter', envio: s.enviado })),
          ...(data?.reportesHoy?.closers || []).map((c: any) => ({ nombre: c.nombre, rol: 'closer', envio: c.enviado })),
        ]} />
      </div>

      {/* Comisiones */}
      <ComisionesTable data={comisionesData} />

      {/* Edit Modal */}
      {editModal && (
        <EditReportModal
          tipo={editModal.tipo}
          reporteId={editModal.reporteId}
          onClose={() => setEditModal(null)}
          onSaved={fetchData}
        />
      )}
    </div>
  )
}
