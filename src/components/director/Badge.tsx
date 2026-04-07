'use client'

interface BadgeProps {
  tipo: 'top' | 'bueno' | 'revisar' | 'coaching' | 'critico' | 'warning' | 'info' | 'ok'
  label?: string
}

const badgeStyles: Record<string, { bg: string; text: string; label: string }> = {
  top: { bg: 'rgba(34,197,94,0.15)', text: 'var(--success)', label: 'Top' },
  bueno: { bg: 'rgba(59,130,246,0.15)', text: 'var(--info)', label: 'Bueno' },
  revisar: { bg: 'rgba(245,158,11,0.15)', text: 'var(--warning)', label: 'Revisar' },
  coaching: { bg: 'rgba(239,68,68,0.15)', text: 'var(--danger)', label: 'Coaching' },
  critico: { bg: 'rgba(239,68,68,0.15)', text: 'var(--danger)', label: 'Crítico' },
  warning: { bg: 'rgba(245,158,11,0.15)', text: 'var(--warning)', label: 'Atención' },
  info: { bg: 'rgba(59,130,246,0.15)', text: 'var(--info)', label: 'Info' },
  ok: { bg: 'rgba(34,197,94,0.15)', text: 'var(--success)', label: 'OK' },
}

export default function Badge({ tipo, label }: BadgeProps) {
  const style = badgeStyles[tipo] || badgeStyles.info
  return (
    <span
      style={{ background: style.bg, color: style.text, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}
    >
      {label || style.label}
    </span>
  )
}
