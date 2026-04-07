'use client'

import { useState, useEffect, useCallback } from 'react'
import { Receipt, Target, AlertTriangle, TrendingUp, Users, Plus, X, Settings, ChevronDown, Download } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#6366F1', '#34D399', '#F59E0B', '#F87171', '#818CF8', '#3B82F6', '#EC4899']

export default function FacturacionClient() {
  const today = new Date()
  const [mes, setMes] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`)
  const [data, setData] = useState<any>(null)
  const [reglas, setReglas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showMeta, setShowMeta] = useState(false)
  const [metaForm, setMetaForm] = useState({ meta_objetivo: 0, costos_ads: 0, costos_operativos: 0 })
  const [showReglaModal, setShowReglaModal] = useState(false)
  const [reglaForm, setReglaForm] = useState({ nombre: '', rol: 'closer', tramos: [{ desde: 0, hasta: 10000, porcentaje: 8 }] })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [dRes, rRes] = await Promise.all([
      fetch(`/api/director/facturacion/dashboard?mes=${mes}`),
      fetch('/api/director/facturacion/reglas'),
    ])
    const d = await dRes.json()
    setData(d)
    setReglas(await rRes.json())
    setMetaForm({
      meta_objetivo: d.meta?.meta_objetivo || 0,
      costos_ads: d.meta?.costos_ads || 0,
      costos_operativos: d.meta?.costos_operativos || 0,
    })
    setLoading(false)
  }, [mes])

  useEffect(() => { fetchData() }, [fetchData])

  const saveMeta = async () => {
    await fetch('/api/director/facturacion/metas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mes, ...metaForm }),
    })
    setShowMeta(false)
    fetchData()
  }

  const saveRegla = async () => {
    await fetch('/api/director/facturacion/reglas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reglaForm),
    })
    setShowReglaModal(false)
    setReglaForm({ nombre: '', rol: 'closer', tramos: [{ desde: 0, hasta: 10000, porcentaje: 8 }] })
    fetchData()
  }

  const deleteRegla = async (id: string) => {
    await fetch(`/api/director/facturacion/reglas?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  const tt = {
    contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 },
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 13,
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16,
  }

  const meta = data?.meta || {}
  const pctRendimiento = meta.porcentaje_rendimiento || 0
  const circumference = 2 * Math.PI * 50
  const dashOffset = circumference - (pctRendimiento / 100) * circumference

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt size={24} style={{ color: 'var(--accent)' }} /> Facturación
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Dashboard financiero mensual</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="month"
            value={mes.slice(0, 7)}
            onChange={e => setMes(e.target.value + '-01')}
            style={{ ...fieldStyle, width: 'auto' }}
          />
          <button onClick={() => setShowMeta(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
            <Target size={14} /> Config Meta
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>Cargando dashboard...</div>
      ) : data && (
        <>
          {/* Hero - Progress Ring + KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
            {/* Progress Ring */}
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="130" height="130" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--surface-3)" strokeWidth="8" />
                <circle cx="60" cy="60" r="50" fill="none" stroke={pctRendimiento >= 100 ? 'var(--success)' : pctRendimiento >= 50 ? 'var(--accent)' : 'var(--danger)'} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                <text x="60" y="55" textAnchor="middle" fill="var(--text-primary)" fontSize="20" fontWeight="700">{pctRendimiento}%</text>
                <text x="60" y="72" textAnchor="middle" fill="var(--text-muted)" fontSize="10">de la meta</text>
              </svg>
            </div>

            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'Meta Objetivo', value: `$${(meta.meta_objetivo || 0).toLocaleString()}`, color: 'var(--accent)' },
                { label: 'Facturado', value: `$${(meta.facturacion_alcanzada || 0).toLocaleString()}`, color: 'var(--success)' },
                { label: 'Faltante', value: `$${(meta.faltante || 0).toLocaleString()}`, color: 'var(--warning)' },
                { label: 'Costos Ads', value: `$${(meta.costos_ads || 0).toLocaleString()}`, color: 'var(--info)' },
                { label: 'Costos Op.', value: `$${(meta.costos_operativos || 0).toLocaleString()}`, color: 'var(--text-secondary)' },
                { label: 'Ganancia Neta', value: `$${(meta.ganancia_neta || 0).toLocaleString()}`, color: meta.ganancia_neta >= 0 ? 'var(--success)' : 'var(--danger)' },
              ].map((kpi, i) => (
                <div key={i} style={{ ...cardStyle, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas */}
          {data.alertas?.length > 0 && (
            <div style={cardStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Alertas</h3>
              {data.alertas.map((a: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', color: a.nivel === 'critico' ? 'var(--danger)' : 'var(--warning)', fontSize: 13 }}>
                  <AlertTriangle size={14} /> {a.mensaje}
                </div>
              ))}
            </div>
          )}

          {/* Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            {/* Timeline */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Facturación vs Meta</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="fecha" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip {...tt} />
                  <Legend />
                  <Area type="monotone" dataKey="acumulado" stroke="var(--accent)" fill="var(--accent-glow)" name="Acumulado" />
                  <Area type="monotone" dataKey="meta" stroke="var(--text-muted)" fill="none" strokeDasharray="5 5" name="Meta" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Distribution */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Cartera</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.distribucionCartera} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label>
                    {(data.distribucionCartera || []).map((entry: any, i: number) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tt} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rankings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Closer ranking */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Ranking Closers</h3>
              {(data.rankingClosers || []).map((r: any, i: number) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: i === 0 ? 'var(--accent)' : 'var(--surface-2)', color: i === 0 ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{r.nombre}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>${r.facturado.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Setter ranking */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Ranking Setters</h3>
              {(data.rankingSetters || []).map((r: any, i: number) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: i === 0 ? 'var(--accent)' : 'var(--surface-2)', color: i === 0 ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{r.nombre}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{r.ventas} citas</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tendencia metas */}
          {data.tendenciaMetas?.length > 0 && (
            <div style={cardStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Tendencia Metas (últimos 6 meses)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.tendenciaMetas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip {...tt} />
                  <Legend />
                  <Bar dataKey="meta" fill="var(--surface-3)" radius={[4, 4, 0, 0]} name="Meta" />
                  <Bar dataKey="alcanzado" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Alcanzado" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Reglas de Comisión */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                <Settings size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Reglas de Comisión
              </h3>
              <button onClick={() => setShowReglaModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 11 }}>
                <Plus size={12} /> Nueva Regla
              </button>
            </div>
            {reglas.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin reglas configuradas</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {reglas.map(r => (
                  <div key={r.id} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.nombre}</span>
                      <button onClick={() => deleteRegla(r.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11 }}>Eliminar</button>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>Rol: {r.rol}</span>
                    <div style={{ marginTop: 6 }}>
                      {(r.tramos || []).map((t: any, i: number) => (
                        <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>${t.desde} - ${t.hasta}: {t.porcentaje}%</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Últimas Transacciones */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Últimas Transacciones</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Fecha', 'Tipo', 'Monto', 'Descripción', 'Cliente'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.ultimasTransacciones || []).slice(0, 10).map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(t.fecha).toLocaleDateString()}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: 'capitalize', background: t.tipo === 'ingreso' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: t.tipo === 'ingreso' ? 'var(--success)' : 'var(--danger)' }}>{t.tipo}</span>
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600, color: t.tipo === 'ingreso' ? 'var(--success)' : 'var(--danger)' }}>{t.tipo === 'ingreso' ? '+' : '-'}${t.monto.toLocaleString()}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>{t.descripcion || '-'}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>{t.cliente_nombre || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Config Meta Modal */}
      {showMeta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowMeta(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 400, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Configurar Meta Mensual</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Meta Objetivo ($)</label>
                <input type="number" value={metaForm.meta_objetivo} onChange={e => setMetaForm({ ...metaForm, meta_objetivo: Number(e.target.value) })} style={fieldStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Costos Ads ($)</label>
                <input type="number" value={metaForm.costos_ads} onChange={e => setMetaForm({ ...metaForm, costos_ads: Number(e.target.value) })} style={fieldStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Costos Operativos ($)</label>
                <input type="number" value={metaForm.costos_operativos} onChange={e => setMetaForm({ ...metaForm, costos_operativos: Number(e.target.value) })} style={fieldStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowMeta(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={saveMeta} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* New Rule Modal */}
      {showReglaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowReglaModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 420, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Nueva Regla de Comisión</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Nombre de la regla" value={reglaForm.nombre} onChange={e => setReglaForm({ ...reglaForm, nombre: e.target.value })} style={fieldStyle} />
              <select value={reglaForm.rol} onChange={e => setReglaForm({ ...reglaForm, rol: e.target.value })} style={fieldStyle}>
                <option value="closer">Closer</option>
                <option value="setter">Setter</option>
              </select>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tramos</span>
                {reglaForm.tramos.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                    <input type="number" placeholder="Desde" value={t.desde} onChange={e => { const tr = [...reglaForm.tramos]; tr[i].desde = Number(e.target.value); setReglaForm({ ...reglaForm, tramos: tr }) }} style={{ ...fieldStyle, width: 80 }} />
                    <input type="number" placeholder="Hasta" value={t.hasta} onChange={e => { const tr = [...reglaForm.tramos]; tr[i].hasta = Number(e.target.value); setReglaForm({ ...reglaForm, tramos: tr }) }} style={{ ...fieldStyle, width: 80 }} />
                    <input type="number" placeholder="%" value={t.porcentaje} onChange={e => { const tr = [...reglaForm.tramos]; tr[i].porcentaje = Number(e.target.value); setReglaForm({ ...reglaForm, tramos: tr }) }} style={{ ...fieldStyle, width: 60 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>%</span>
                  </div>
                ))}
                <button
                  onClick={() => setReglaForm({ ...reglaForm, tramos: [...reglaForm.tramos, { desde: 0, hasta: 0, porcentaje: 0 }] })}
                  style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11 }}
                >+ Agregar tramo</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowReglaModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={saveRegla} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Crear Regla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
