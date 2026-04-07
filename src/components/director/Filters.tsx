'use client'

interface FiltersProps {
  desde: string
  hasta: string
  onDesdChange: (v: string) => void
  onHastaChange: (v: string) => void
  onApply: () => void
}

export default function Filters({ desde, hasta, onDesdChange, onHastaChange, onApply }: FiltersProps) {
  function setQuick(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days + 1)
    onDesdChange(start.toISOString().split('T')[0])
    onHastaChange(end.toISOString().split('T')[0])
  }

  const quickOptions = [
    { label: 'Hoy', days: 1 },
    { label: '7D', days: 7 },
    { label: '30D', days: 30 },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Quick pills */}
      <div className="flex items-center gap-1">
        {quickOptions.map(({ label, days }) => (
          <button
            key={label}
            onClick={() => { setQuick(days); setTimeout(onApply, 50) }}
            className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all duration-150"
            style={{
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              color: '#818CF8',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.18)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.08)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-4" style={{ background: '#1a2234' }} />

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={desde}
          onChange={e => onDesdChange(e.target.value)}
          className="rounded-lg px-2.5 py-1 text-xs transition-colors focus:outline-none"
          style={{ background: '#0D1117', border: '1px solid #1a2234', color: '#94A3B8' }}
        />
        <span style={{ color: '#334155', fontSize: '0.8rem' }}>—</span>
        <input
          type="date"
          value={hasta}
          onChange={e => onHastaChange(e.target.value)}
          className="rounded-lg px-2.5 py-1 text-xs transition-colors focus:outline-none"
          style={{ background: '#0D1117', border: '1px solid #1a2234', color: '#94A3B8' }}
        />
        <button
          onClick={onApply}
          className="px-3 py-1.5 text-xs rounded-lg font-semibold transition-all duration-150"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818CF8' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.25)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.15)' }}
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}
