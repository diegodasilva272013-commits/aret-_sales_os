import { AlertTriangle, AlertCircle, Info, CheckCircle, ShieldCheck } from 'lucide-react'

interface SetterRow {
  id: string
  nombre: string
  leads_recibidos: number
  citas_agendadas: number
  citas_show: number
  citas_noshow: number
  citas_calificadas: number
}

interface CloserRow {
  id: string
  nombre: string
  citas_show: number
  ventas_cerradas: number
  monto_total_cerrado: number
  monto_cobrado: number
  pagos_nulo: number
}

interface ReportesHoy {
  setters: Array<{ id: string; nombre: string; enviado: boolean }>
  closers: Array<{ id: string; nombre: string; enviado: boolean }>
}

interface Props {
  setterTable: SetterRow[]
  closerTable: CloserRow[]
  reportesHoy: ReportesHoy
}

interface Alerta {
  nivel: 'critico' | 'warning' | 'info' | 'ok'
  mensaje: string
  detalle?: string
}

const levelOrder: Record<Alerta['nivel'], number> = { critico: 0, warning: 1, info: 2, ok: 3 }

export default function AlertasPanel({ setterTable, closerTable, reportesHoy }: Props) {
  const alertas: Alerta[] = []

  const settersPendientes = reportesHoy.setters.filter(s => !s.enviado)
  const closersPendientes = reportesHoy.closers.filter(c => !c.enviado)

  if (settersPendientes.length > 0) {
    alertas.push({
      nivel: 'warning',
      mensaje: `${settersPendientes.length} setter(s) sin reporte hoy`,
      detalle: settersPendientes.map(s => s.nombre).join(', '),
    })
  }

  if (closersPendientes.length > 0) {
    alertas.push({
      nivel: 'warning',
      mensaje: `${closersPendientes.length} closer(s) sin reporte hoy`,
      detalle: closersPendientes.map(c => c.nombre).join(', '),
    })
  }

  for (const s of setterTable) {
    const showRate = s.citas_agendadas > 0 ? s.citas_show / s.citas_agendadas : 0
    if (s.citas_agendadas >= 3 && showRate < 0.3) {
      alertas.push({
        nivel: 'critico',
        mensaje: `${s.nombre}: Tasa de show muy baja (${Math.round(showRate * 100)}%)`,
        detalle: 'Requiere coaching urgente en calificación de citas',
      })
    }
  }

  for (const c of closerTable) {
    const cierre = c.citas_show > 0 ? c.ventas_cerradas / c.citas_show : 0
    if (c.citas_show >= 3 && cierre < 0.2) {
      alertas.push({
        nivel: 'critico',
        mensaje: `${c.nombre}: Tasa de cierre crítica (${Math.round(cierre * 100)}%)`,
        detalle: 'Por debajo del mínimo esperado (20%)',
      })
    }
    if (c.pagos_nulo > 2) {
      alertas.push({
        nivel: 'warning',
        mensaje: `${c.nombre}: ${c.pagos_nulo} ventas sin cobro`,
        detalle: 'Revisar seguimiento de pagos pendientes',
      })
    }
  }

  const allGoodSetters = setterTable.every(s => {
    const rate = s.citas_agendadas > 0 ? s.citas_show / s.citas_agendadas : 1
    return rate >= 0.5
  })

  if (allGoodSetters && setterTable.length > 0 && alertas.length === 0) {
    alertas.push({ nivel: 'ok', mensaje: 'Todo el equipo está performando correctamente' })
  }

  if (alertas.length === 0) {
    alertas.push({ nivel: 'info', mensaje: 'Sin alertas activas en el período seleccionado' })
  }

  const sorted = [...alertas].sort((a, b) => levelOrder[a.nivel] - levelOrder[b.nivel])

  if (sorted.length === 1 && (sorted[0].nivel === 'ok' || sorted[0].nivel === 'info')) {
    return (
      <div className="flex flex-col items-center justify-center py-10 rounded-xl" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(16,185,129,0.12)' }}>
          <ShieldCheck size={22} style={{ color: '#10B981' }} />
        </div>
        <p className="font-semibold" style={{ color: '#34D399' }}>Todo en orden</p>
        <p className="text-sm mt-1" style={{ color: '#334155' }}>{sorted[0].mensaje}</p>
      </div>
    )
  }

  const config = {
    critico: {
      border: '#EF4444',
      bg: 'rgba(239,68,68,0.06)',
      icon: <AlertCircle size={15} style={{ color: '#F87171' }} className="shrink-0 mt-0.5" />,
      badge: { bg: 'rgba(239,68,68,0.15)', color: '#F87171', label: 'Crítico' },
      pulse: true,
    },
    warning: {
      border: '#F59E0B',
      bg: 'rgba(245,158,11,0.06)',
      icon: <AlertTriangle size={15} style={{ color: '#FBBF24' }} className="shrink-0 mt-0.5" />,
      badge: { bg: 'rgba(245,158,11,0.15)', color: '#FBBF24', label: 'Alerta' },
      pulse: false,
    },
    info: {
      border: '#6366F1',
      bg: 'rgba(99,102,241,0.06)',
      icon: <Info size={15} style={{ color: '#818CF8' }} className="shrink-0 mt-0.5" />,
      badge: { bg: 'rgba(99,102,241,0.15)', color: '#818CF8', label: 'Info' },
      pulse: false,
    },
    ok: {
      border: '#10B981',
      bg: 'rgba(16,185,129,0.06)',
      icon: <CheckCircle size={15} style={{ color: '#34D399' }} className="shrink-0 mt-0.5" />,
      badge: { bg: 'rgba(16,185,129,0.15)', color: '#34D399', label: 'OK' },
      pulse: false,
    },
  }

  return (
    <div className="space-y-2">
      {sorted.map((alerta, i) => {
        const c = config[alerta.nivel]
        return (
          <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: c.bg, borderLeft: `3px solid ${c.border}`, border: `1px solid rgba(${alerta.nivel === 'critico' ? '239,68,68' : alerta.nivel === 'warning' ? '245,158,11' : alerta.nivel === 'info' ? '99,102,241' : '16,185,129'},0.18)`, borderLeftWidth: '3px', borderLeftColor: c.border }}>
            <div className="flex items-center gap-2 mt-0.5">
              {c.pulse && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#EF4444' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#EF4444' }} />
                </span>
              )}
              {c.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{alerta.mensaje}</p>
              {alerta.detalle && (
                <p className="text-xs mt-0.5 truncate" style={{ color: '#475569' }}>{alerta.detalle}</p>
              )}
            </div>
            <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: c.badge.bg, color: c.badge.color }}>{c.badge.label}</span>
          </div>
        )
      })}
    </div>
  )
}
