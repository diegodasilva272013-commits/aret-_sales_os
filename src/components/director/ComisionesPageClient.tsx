'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, ChevronDown, ChevronUp, CreditCard, RefreshCw } from 'lucide-react'
import Filters from './Filters'

export default function ComisionesPageClient() {
  const today = new Date()
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  const [desde, setDesde] = useState(firstDay)
  const [hasta, setHasta] = useState(today.toISOString().split('T')[0])
  const [data, setData] = useState<{ setters: any[]; closers: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSetter, setExpandedSetter] = useState<string | null>(null)
  const [expandedCloser, setExpandedCloser] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ desde, hasta })
    const res = await fetch(`/api/director/comisiones?${params}`)
    setData(await res.json())
    setLoading(false)
  }, [desde, hasta])

  useEffect(() => { fetch_() }, [fetch_])

  const totalSetters = (data?.setters || []).reduce((s, d) => s + d.total_comision, 0)
  const totalClosers = (data?.closers || []).reduce((s, d) => s + d.total_comision, 0)
  const totalGeneral = totalSetters + totalClosers

  const cardStyle: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }

  const PersonCard = ({ person, type, expanded, onToggle }: { person: any; type: 'setter' | 'closer'; expanded: boolean; onToggle: () => void }) => (
    <div style={cardStyle}>
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', overflow: 'hidden' }}>
            {person.foto_url ? <img src={person.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : person.nombre?.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{person.nombre}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{type}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>${person.total_comision?.toLocaleString()}</span>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: 14 }}>
          {/* Desglose */}
          {person.desglose?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Desglose por Proyecto</span>
              {person.desglose.map((d: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{d.proyecto}</span>
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>${d.subtotal?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Sin desglose disponible</p>
          )}

          {/* Pagos */}
          {person.pagos?.length > 0 && (
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Métodos de Pago</span>
              {person.pagos.map((p: any) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <CreditCard size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ textTransform: 'capitalize' }}>{p.tipo}</span> - {p.datos} {p.principal && <span style={{ color: 'var(--accent)', fontSize: 10 }}>(principal)</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <DollarSign size={24} style={{ color: 'var(--accent)' }} /> Comisiones
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Cálculo de comisiones del equipo</p>
        </div>
        <button onClick={fetch_} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <Filters desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h) }} />

      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Setters', value: totalSetters },
          { label: 'Total Closers', value: totalClosers },
          { label: 'Total General', value: totalGeneral },
        ].map((t, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{t.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>${t.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>Calculando comisiones...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Setters</h3>
            {(data?.setters || []).map(s => (
              <PersonCard key={s.id} person={s} type="setter" expanded={expandedSetter === s.id} onToggle={() => setExpandedSetter(expandedSetter === s.id ? null : s.id)} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Closers</h3>
            {(data?.closers || []).map(c => (
              <PersonCard key={c.id} person={c} type="closer" expanded={expandedCloser === c.id} onToggle={() => setExpandedCloser(expandedCloser === c.id ? null : c.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
