'use client'

import { formatCurrency, formatPercent } from '@/lib/utils'
import { TrendingUp, Users, Calendar, CheckCircle, DollarSign, AlertTriangle, BarChart2, Target } from 'lucide-react'

interface StatsData {
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

interface ReunionStats {
  setters_asistieron: number
  setters_total: number
  closers_asistieron: number
  closers_total: number
}

export default function StatsCards({ stats, reunionStats }: { stats: StatsData; reunionStats?: ReunionStats }) {
  const totalReunionAsistieron = (reunionStats?.setters_asistieron ?? 0) + (reunionStats?.closers_asistieron ?? 0)
  const totalReunionTotal = (reunionStats?.setters_total ?? 0) + (reunionStats?.closers_total ?? 0)
  const reunionPct = totalReunionTotal > 0 ? totalReunionAsistieron / totalReunionTotal : -1

  const cards = [
    { title: 'Total Leads', value: String(stats.totalLeads), icon: Users, accentColor: '#6366F1', valueColor: '#818CF8', bgColor: 'rgba(99,102,241,0.08)', gradient: 'linear-gradient(90deg, #6366F1 60%, transparent)' },
    { title: 'Citas Agendadas', value: String(stats.totalCitas), icon: Calendar, accentColor: '#8B5CF6', valueColor: '#A78BFA', bgColor: 'rgba(139,92,246,0.08)', gradient: 'linear-gradient(90deg, #8B5CF6 60%, transparent)' },
    { title: 'Shows', value: String(stats.totalShows), icon: CheckCircle, accentColor: '#10B981', valueColor: '#34D399', bgColor: 'rgba(16,185,129,0.08)', gradient: 'linear-gradient(90deg, #10B981 60%, transparent)' },
    { title: 'Ventas Cerradas', value: String(stats.totalVentas), icon: Target, accentColor: '#10B981', valueColor: '#34D399', bgColor: 'rgba(16,185,129,0.08)', gradient: 'linear-gradient(90deg, #10B981 60%, transparent)' },
    { title: 'Monto Cerrado', value: formatCurrency(stats.totalMontoCerrado), icon: TrendingUp, accentColor: '#6366F1', valueColor: '#818CF8', bgColor: 'rgba(99,102,241,0.08)', gradient: 'linear-gradient(90deg, #6366F1 60%, transparent)' },
    { title: 'Monto Cobrado', value: formatCurrency(stats.totalMontoCobrado), icon: DollarSign, accentColor: '#10B981', valueColor: '#34D399', bgColor: 'rgba(16,185,129,0.08)', gradient: 'linear-gradient(90deg, #10B981 60%, transparent)' },
    { title: 'Pendiente de Cobro', value: formatCurrency(stats.totalMontoPendiente), icon: AlertTriangle, accentColor: '#F59E0B', valueColor: '#FBBF24', bgColor: 'rgba(245,158,11,0.08)', gradient: 'linear-gradient(90deg, #F59E0B 60%, transparent)' },
    { title: 'Tasa de Cierre', value: formatPercent(stats.tasaCierre), icon: BarChart2, accentColor: stats.tasaCierre >= 0.4 ? '#10B981' : '#F59E0B', valueColor: stats.tasaCierre >= 0.4 ? '#34D399' : '#FBBF24', bgColor: stats.tasaCierre >= 0.4 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', gradient: stats.tasaCierre >= 0.4 ? 'linear-gradient(90deg, #10B981 60%, transparent)' : 'linear-gradient(90deg, #F59E0B 60%, transparent)' },
    ...(totalReunionTotal > 0 ? [{
      title: 'Asistencia Reunión', value: `${totalReunionAsistieron}/${totalReunionTotal}`, icon: Users,
      accentColor: reunionPct === 1 ? '#10B981' : reunionPct > 0.5 ? '#F59E0B' : '#EF4444',
      valueColor: reunionPct === 1 ? '#34D399' : reunionPct > 0.5 ? '#FBBF24' : '#F87171',
      bgColor: reunionPct === 1 ? 'rgba(16,185,129,0.08)' : reunionPct > 0.5 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
      gradient: reunionPct === 1 ? 'linear-gradient(90deg, #10B981 60%, transparent)' : reunionPct > 0.5 ? 'linear-gradient(90deg, #F59E0B 60%, transparent)' : 'linear-gradient(90deg, #EF4444 60%, transparent)',
    }] : []),
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div key={card.title} style={{ background: '#0D1117', border: '1px solid #1a2234', borderLeft: `3px solid ${card.accentColor}` }} className="rounded-xl p-5 transition-all duration-200 group cursor-default">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg" style={{ background: card.bgColor }}><Icon size={15} style={{ color: card.accentColor }} /></div>
              <span className="text-xs font-medium tracking-wide" style={{ color: '#475569' }}>{card.title}</span>
            </div>
            <p className="text-2xl font-black tracking-tight mb-1" style={{ color: card.valueColor }}>{card.value}</p>
            <div className="h-0.5 rounded-full mt-3" style={{ background: card.gradient, opacity: 0.6 }} />
          </div>
        )
      })}
    </div>
  )
}
