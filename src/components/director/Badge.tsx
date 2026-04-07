'use client'

const VARIANT_COLORS: Record<string, { bg: string; text: string }> = {
  top: { bg: 'rgba(16,185,129,0.15)', text: '#34D399' },
  bueno: { bg: 'rgba(99,102,241,0.15)', text: '#818CF8' },
  revisar: { bg: 'rgba(245,158,11,0.15)', text: '#FBBF24' },
  coaching: { bg: 'rgba(239,68,68,0.15)', text: '#F87171' },
  critico: { bg: 'rgba(239,68,68,0.15)', text: '#F87171' },
  warning: { bg: 'rgba(245,158,11,0.15)', text: '#FBBF24' },
  info: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' },
  ok: { bg: 'rgba(16,185,129,0.15)', text: '#34D399' },
}

export default function Badge({ variant, children }: { variant: string; children: React.ReactNode }) {
  const style = VARIANT_COLORS[variant] || VARIANT_COLORS.info
  return (
    <span
      style={{
        background: style.bg,
        color: style.text,
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
