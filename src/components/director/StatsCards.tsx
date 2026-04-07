'use client'

import { TrendingUp, TrendingDown, Users, Phone, Calendar, DollarSign, Target, BarChart2, Clock } from 'lucide-react'

interface StatsCardsProps {
  stats: {
    leads_nuevos?: number
    citas_agendadas?: number
    citas_show?: number
    citas_calificadas?: number
    tasa_show?: number
    shows_totales?: number
    ventas_cerradas?: number
    tasa_cierre?: number
    monto_cobrado?: number
    [key: string]: any
  }
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    { label: 'Leads Nuevos', value: stats.leads_nuevos || 0, icon: Users, color: 'var(--info)' },
    { label: 'Citas Agendadas', value: stats.citas_agendadas || 0, icon: Calendar, color: 'var(--accent)' },
    { label: 'Citas Show', value: stats.citas_show || 0, icon: Phone, color: 'var(--success)' },
    { label: 'Citas Calificadas', value: stats.citas_calificadas || 0, icon: Target, color: '#34D399' },
    { label: 'Tasa Show', value: `${stats.tasa_show || 0}%`, icon: BarChart2, color: 'var(--warning)' },
    { label: 'Shows Totales', value: stats.shows_totales || 0, icon: Users, color: '#818CF8' },
    { label: 'Ventas Cerradas', value: stats.ventas_cerradas || 0, icon: TrendingUp, color: 'var(--success)' },
    { label: 'Tasa Cierre', value: `${stats.tasa_cierre || 0}%`, icon: Target, color: stats.tasa_cierre >= 30 ? 'var(--success)' : 'var(--danger)' },
    { label: 'Cobrado', value: `$${(stats.monto_cobrado || 0).toLocaleString()}`, icon: DollarSign, color: '#34D399' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <div
            key={i}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {card.label}
              </span>
              <Icon size={16} style={{ color: card.color, opacity: 0.7 }} />
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
              {card.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
