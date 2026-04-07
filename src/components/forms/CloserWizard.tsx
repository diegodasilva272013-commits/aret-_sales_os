'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, ChevronLeft, ChevronRight, DollarSign, LogOut, Upload, Link2, X, FileCheck } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface SaleDetail {
  cliente: string
  monto: number
  cobrado: number
  pendiente: number
  medio_pago: string
  comprobante_url: string
  comprobante_tipo: 'archivo' | 'drive' | ''
}

interface CloserData {
  citas_recibidas: number
  citas_show: number
  citas_noshow: number
  ventas_cerradas: number
  ventas_no_cerradas: number
  pagos_completos: number
  pagos_parciales: number
  pagos_nulo: number
  monto_total_cerrado: number
  monto_cobrado: number
  monto_pendiente: number
  detalle_ventas: SaleDetail[]
  motivo_precio: number
  motivo_consultar: number
  motivo_momento: number
  motivo_competencia: number
  motivo_otro: number
  comentario: string
  // Lanzamiento fields
  propuestas_enviadas: number
  seguimientos_realizados: number
  conversaciones_cerradas: number
  tiempo_respuesta_avg: number
  objeciones_resueltas: number
  // Common
  asistio_reunion: boolean | null
  nota_reunion: string
  tipo_proyecto: string
}

const initialData: CloserData = {
  citas_recibidas: 0,
  citas_show: 0,
  citas_noshow: 0,
  ventas_cerradas: 0,
  ventas_no_cerradas: 0,
  pagos_completos: 0,
  pagos_parciales: 0,
  pagos_nulo: 0,
  monto_total_cerrado: 0,
  monto_cobrado: 0,
  monto_pendiente: 0,
  detalle_ventas: [],
  motivo_precio: 0,
  motivo_consultar: 0,
  motivo_momento: 0,
  motivo_competencia: 0,
  motivo_otro: 0,
  comentario: '',
  propuestas_enviadas: 0,
  seguimientos_realizados: 0,
  conversaciones_cerradas: 0,
  tiempo_respuesta_avg: 0,
  objeciones_resueltas: 0,
  asistio_reunion: null,
  nota_reunion: '',
  tipo_proyecto: 'evergreen',
}

interface ProyectoOption {
  id: string
  nombre: string
}

function BigNumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-6">
      <input type="number" min="0" value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        className="w-full text-4xl font-bold text-center bg-[#0D1117] border-2 border-gray-700 rounded-2xl px-6 py-8 text-white focus:outline-none focus:border-indigo-500 transition-colors"
        autoFocus />
    </div>
  )
}

function StepWrapper({ title, question, hint, children }: { title: string; question: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2">
        <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">{title}</span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">{question}</h2>
      {hint && <p className="text-gray-500 text-sm">{hint}</p>}
      {children}
    </div>
  )
}

function ReunionStep({
  value, nota, onValue, onNota, onNoMeeting,
}: {
  value: boolean | null; nota: string; onValue: (v: boolean) => void; onNota: (v: string) => void; onNoMeeting: () => void
}) {
  const isNoMeeting = value === null && nota === 'sin_reunion'
  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <button type="button" onClick={() => onValue(true)}
          className="w-full py-6 rounded-2xl font-bold text-xl transition-all"
          style={{ background: value === true ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.06)', border: `2px solid ${value === true ? '#10B981' : 'rgba(16,185,129,0.2)'}`, color: value === true ? '#34D399' : '#475569' }}>
          ✅ Sí
        </button>
        <button type="button" onClick={() => onValue(false)}
          className="w-full py-6 rounded-2xl font-bold text-xl transition-all"
          style={{ background: value === false ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.04)', border: `2px solid ${value === false ? '#EF4444' : 'rgba(239,68,68,0.15)'}`, color: value === false ? '#F87171' : '#475569' }}>
          ❌ No
        </button>
      </div>
      <button type="button" onClick={onNoMeeting}
        className="w-full py-4 rounded-2xl font-bold text-base transition-all"
        style={{ background: isNoMeeting ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.04)', border: `2px solid ${isNoMeeting ? '#6366F1' : 'rgba(99,102,241,0.15)'}`, color: isNoMeeting ? '#818CF8' : '#475569' }}>
        📅 Hoy no había reunión
      </button>
      {value === false && (
        <div>
          <label className="text-sm text-gray-400 mb-2 block">¿Por qué no pudiste asistir?</label>
          <textarea value={nota} onChange={e => onNota(e.target.value)} rows={3} placeholder="Explicá brevemente el motivo..."
            className="w-full bg-[#0D1117] border-2 border-gray-700 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none text-base" />
        </div>
      )}
    </div>
  )
}

export default function CloserWizard() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [orgId, setOrgId] = useState('')
  const [nombre, setNombre] = useState('')
  const [step, setStep] = useState(0)
  const [data, setData] = useState<CloserData>(initialData)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([])
  const [proyectoId, setProyectoId] = useState<string | null>(null)
  const [showProyectoSelector, setShowProyectoSelector] = useState(false)
  const [proyectoTipo, setProyectoTipo] = useState<'evergreen' | 'lanzamiento'>('evergreen')
  const [uploading, setUploading] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('full_name, role, organization_id').eq('id', user.id).single()
      if (!profile || profile.role !== 'closer') { router.push('/login'); return }
      setNombre(profile.full_name || 'Closer')
      setOrgId(profile.organization_id || '')
      const today = new Date().toISOString().split('T')[0]
      const { data: rep } = await supabase.from('reportes_closer').select('*').eq('user_id', user.id).eq('fecha', today).maybeSingle()
      if (rep) {
        setData({
          ...initialData,
          citas_recibidas: rep.citas_tomadas || 0,
          citas_show: rep.citas_show || rep.shows || 0,
          citas_noshow: rep.citas_noshow || 0,
          ventas_cerradas: rep.ventas_cerradas || 0,
          ventas_no_cerradas: rep.ventas_no_cerradas || 0,
          pagos_completos: rep.pagos_completos || 0,
          pagos_parciales: rep.pagos_parciales || 0,
          pagos_nulo: rep.pagos_nulo || 0,
          monto_total_cerrado: Number(rep.monto_cerrado || 0),
          monto_cobrado: Number(rep.monto_cobrado || 0),
          monto_pendiente: Number(rep.monto_pendiente || 0),
          detalle_ventas: rep.detalle_ventas || [],
          motivo_precio: rep.motivo_precio || 0,
          motivo_consultar: rep.motivo_consultar || 0,
          motivo_momento: rep.motivo_momento || 0,
          motivo_competencia: rep.motivo_competencia || 0,
          motivo_otro: rep.motivo_otro || 0,
          comentario: rep.notas || '',
          propuestas_enviadas: rep.propuestas_enviadas || 0,
          seguimientos_realizados: rep.seguimientos_realizados || 0,
          conversaciones_cerradas: rep.conversaciones_cerradas || 0,
          tiempo_respuesta_avg: rep.tiempo_respuesta_avg || 0,
          objeciones_resueltas: rep.objeciones_resueltas || 0,
          asistio_reunion: rep.asistio_reunion,
          nota_reunion: rep.nota_reunion || '',
          tipo_proyecto: rep.tipo_proyecto || 'evergreen',
        })
        setSubmitted(true)
      }

      // Load user's projects
      const { data: miembros } = await supabase
        .from('director_proyecto_miembros')
        .select('proyecto_id, director_proyectos(id, nombre)')
        .eq('user_id', user.id)
      const userProyectos: ProyectoOption[] = (miembros || [])
        .map((m: { proyecto_id: string; director_proyectos: unknown }) => {
          const p = m.director_proyectos as { id: string; nombre: string } | null
          return p ? { id: p.id, nombre: p.nombre } : null
        })
        .filter(Boolean) as ProyectoOption[]
      setProyectos(userProyectos)
      if (userProyectos.length === 1) {
        setProyectoId(userProyectos[0].id)
      } else if (userProyectos.length > 1) {
        setShowProyectoSelector(true)
      }

      setAuthLoading(false)
    })
  }, [router])

  useEffect(() => {
    if (!proyectoId) return
    const supabase = createClient()
    supabase.from('director_proyectos').select('tipo, nombre').eq('id', proyectoId).single().then(({ data: proyecto }) => {
      const tipo = (proyecto?.tipo as 'evergreen' | 'lanzamiento') || 'evergreen'
      setProyectoTipo(tipo)
      setData(prev => ({ ...prev, tipo_proyecto: tipo }))
    })
  }, [proyectoId])

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080B14' }}>
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (showProyectoSelector) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#080B14' }}>
      <div className="w-full max-w-sm">
        <div className="mb-2"><span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Paso 0 — Proyecto</span></div>
        <h2 className="text-2xl font-bold text-white mb-2 leading-tight">¿Para qué proyecto vas a reportar hoy?</h2>
        <p className="text-gray-500 text-sm mb-6">Seleccioná el proyecto al que corresponde este reporte</p>
        <div className="space-y-3">
          {proyectos.map(p => (
            <button key={p.id} onClick={() => { setProyectoId(p.id); setShowProyectoSelector(false) }}
              className="w-full text-left px-5 py-4 rounded-xl border-2 border-gray-700 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all text-white font-medium">
              {p.nombre}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const EVERGREEN_TOTAL = 8
  const LANZAMIENTO_TOTAL = 10
  const TOTAL_STEPS = proyectoTipo === 'lanzamiento' ? LANZAMIENTO_TOTAL : EVERGREEN_TOTAL

  function update(field: keyof CloserData, value: unknown) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  function updateSale(index: number, field: keyof SaleDetail, value: string | number) {
    setData(prev => {
      const updated = [...prev.detalle_ventas]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'monto' || field === 'cobrado') {
        const monto = field === 'monto' ? Number(value) : updated[index].monto
        const cobrado = field === 'cobrado' ? Number(value) : updated[index].cobrado
        updated[index].pendiente = Math.max(0, monto - cobrado)
      }
      return { ...prev, detalle_ventas: updated }
    })
  }

  async function handleFileUpload(index: number, file: File) {
    setUploading(prev => ({ ...prev, [index]: true }))
    try {
      const supabase = createClient()
      const fecha = new Date().toISOString().split('T')[0]
      const ext = file.name.split('.').pop() || 'bin'
      const safeName = `${fecha}/${userId}/${index}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(safeName, file, { upsert: true })
      if (upErr) { setError(`Error al subir archivo: ${upErr.message}`); return }
      const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(safeName)
      setData(prev => {
        const updated = [...prev.detalle_ventas]
        updated[index] = { ...updated[index], comprobante_url: urlData.publicUrl, comprobante_tipo: 'archivo' }
        return { ...prev, detalle_ventas: updated }
      })
      setError('')
    } catch {
      setError('Error al subir el archivo. Intentá de nuevo.')
    } finally {
      setUploading(prev => ({ ...prev, [index]: false }))
    }
  }

  function setDriveLink(index: number, url: string) {
    setData(prev => {
      const updated = [...prev.detalle_ventas]
      updated[index] = { ...updated[index], comprobante_url: url, comprobante_tipo: url.trim() ? 'drive' : '' }
      return { ...prev, detalle_ventas: updated }
    })
  }

  function clearComprobante(index: number) {
    setData(prev => {
      const updated = [...prev.detalle_ventas]
      updated[index] = { ...updated[index], comprobante_url: '', comprobante_tipo: '' }
      return { ...prev, detalle_ventas: updated }
    })
  }

  function handleNext() {
    let nextStep = step + 1
    const saleDetailIdx = 3

    if (nextStep === saleDetailIdx && data.ventas_cerradas === 0) {
      nextStep = saleDetailIdx + 1
    }

    if (nextStep === saleDetailIdx && data.ventas_cerradas > 0) {
      setData(prev => {
        const target = prev.ventas_cerradas
        const current = prev.detalle_ventas
        if (current.length === target) return prev
        if (current.length < target) {
          const newEntries = Array.from({ length: target - current.length }, () => ({
            cliente: '', monto: 0, cobrado: 0, pendiente: 0, medio_pago: 'transferencia', comprobante_url: '', comprobante_tipo: '' as const
          }))
          return { ...prev, detalle_ventas: [...current, ...newEntries] }
        }
        return { ...prev, detalle_ventas: current.slice(0, target) }
      })
    }

    if (step === saleDetailIdx && data.ventas_cerradas > 0) {
      const incomplete = data.detalle_ventas.some(s => !s.cliente.trim() || s.monto <= 0)
      if (incomplete) { setError('Completá el nombre del cliente y monto de cada venta antes de continuar.'); return }
      const sinComprobante = data.detalle_ventas.some(s => !s.comprobante_url.trim())
      if (sinComprobante) { setError('Cada venta necesita un comprobante. Subí un archivo o pegá un link de Google Drive.'); return }
      setError('')
    }

    setStep(nextStep)
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const validSales = data.detalle_ventas.filter(s => s.monto > 0)
    const totalCerrado = validSales.reduce((sum, s) => sum + s.monto, 0)
    const totalCobrado = validSales.reduce((sum, s) => sum + s.cobrado, 0)
    const totalPendiente = validSales.reduce((sum, s) => sum + s.pendiente, 0)
    const ticketProm = validSales.length > 0 ? totalCerrado / validSales.length : 0
    const pagosCompletos = validSales.filter(s => s.cobrado >= s.monto).length
    const pagosParciales = validSales.filter(s => s.cobrado > 0 && s.cobrado < s.monto).length
    const pagosNulo = validSales.filter(s => s.cobrado === 0).length

    // Map wizard field names → DB column names
    const payload = {
      user_id: userId,
      organization_id: orgId,
      fecha: new Date().toISOString().split('T')[0],
      citas_tomadas: data.citas_recibidas,
      shows: data.citas_show,
      citas_show: data.citas_show,
      citas_noshow: data.citas_noshow,
      ventas_cerradas: data.ventas_cerradas,
      ventas_no_cerradas: data.ventas_no_cerradas,
      monto_cerrado: totalCerrado,
      monto_cobrado: totalCobrado,
      monto_pendiente: totalPendiente,
      pagos_completos: pagosCompletos,
      pagos_parciales: pagosParciales,
      pagos_nulo: pagosNulo,
      detalle_ventas: validSales.length > 0 ? validSales : null,
      motivo_precio: data.motivo_precio,
      motivo_consultar: data.motivo_consultar,
      motivo_momento: data.motivo_momento,
      motivo_competencia: data.motivo_competencia,
      motivo_otro: data.motivo_otro,
      propuestas_enviadas: data.propuestas_enviadas,
      seguimientos_realizados: data.seguimientos_realizados,
      conversaciones_cerradas: data.conversaciones_cerradas,
      tiempo_respuesta_avg: data.tiempo_respuesta_avg,
      objeciones_resueltas: data.objeciones_resueltas,
      notas: data.comentario || null,
      asistio_reunion: data.nota_reunion === 'sin_reunion' ? null : (data.asistio_reunion ?? false),
      nota_reunion: data.nota_reunion || null,
      tipo_proyecto: data.tipo_proyecto,
      ticket_promedio: ticketProm,
      ...(proyectoId ? { proyecto_id: proyectoId } : {}),
    }

    const { error: err } = await supabase.from('reportes_closer').upsert(payload, {
      onConflict: 'organization_id,user_id,fecha,proyecto_id',
    })

    if (err) {
      setError('Error al enviar el reporte. Intentá de nuevo.')
      setLoading(false)
      return
    }
    setSubmitted(true)
    setLoading(false)
  }

  const saleDetailStep = (
    <StepWrapper title="Detalle de Ventas" question="Cargá el detalle de cada venta cerrada"
      hint={`Tenés ${data.ventas_cerradas} venta${data.ventas_cerradas > 1 ? 's' : ''} para completar. Cada venta requiere un comprobante.`}>
      <div className="mt-4 space-y-3">
        {data.detalle_ventas.map((sale, i) => (
          <div key={i} className="bg-[#111827] border border-gray-700 rounded-xl p-4">
            <div className="mb-3">
              <span className="text-xs text-indigo-400 font-medium">Venta #{i + 1}</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <input placeholder="Nombre del cliente" value={sale.cliente}
                onChange={e => updateSale(i, 'cliente', e.target.value)}
                className="bg-[#0D1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Monto vendido</label>
                  <input type="number" min="0" placeholder="0" value={sale.monto || ''}
                    onChange={e => updateSale(i, 'monto', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0D1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Monto cobrado</label>
                  <input type="number" min="0" placeholder="0" value={sale.cobrado || ''}
                    onChange={e => updateSale(i, 'cobrado', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0D1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Medio de pago</label>
                <select value={sale.medio_pago || 'transferencia'}
                  onChange={e => updateSale(i, 'medio_pago', e.target.value)}
                  className="w-full bg-[#0D1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors appearance-none">
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta_credito">Tarjeta crédito</option>
                  <option value="tarjeta_debito">Tarjeta débito</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="paypal">PayPal</option>
                  <option value="crypto">Crypto</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="flex justify-between items-center bg-[#0D1117] rounded-lg px-3 py-2">
                <span className="text-xs text-gray-500">Pendiente:</span>
                <span className="text-amber-400 text-sm font-bold">{formatCurrency(sale.pendiente)}</span>
              </div>

              {/* Comprobante section */}
              <div className="mt-2 border-t border-gray-700 pt-3">
                <label className="text-xs text-gray-400 mb-2 block font-medium">
                  📎 Comprobante de pago <span className="text-red-400">*</span>
                </label>
                {sale.comprobante_url ? (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                    <FileCheck size={16} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-emerald-400 text-xs truncate flex-1">
                      {sale.comprobante_tipo === 'archivo' ? 'Archivo subido' : 'Link de Drive'}
                    </span>
                    <button type="button" onClick={() => clearComprobante(i)}
                      className="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="relative cursor-pointer">
                        <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden"
                          onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(i, file); e.target.value = '' }}
                          disabled={uploading[i]} />
                        <div className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                          uploading[i] ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300' : 'border-gray-600 hover:border-indigo-500 hover:bg-indigo-500/5 text-gray-300'
                        }`}>
                          {uploading[i] ? (
                            <><div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" /> Subiendo...</>
                          ) : (
                            <><Upload size={14} /> Subir archivo</>
                          )}
                        </div>
                      </label>
                      <button type="button"
                        onClick={() => { const url = prompt('Pegá el link de Google Drive:'); if (url && url.trim()) setDriveLink(i, url.trim()) }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-600 hover:border-indigo-500 hover:bg-indigo-500/5 text-gray-300 text-xs font-medium transition-all">
                        <Link2 size={14} /> Link de Drive
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-600">Subí una imagen/PDF o pegá un link de Google Drive</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </StepWrapper>
  )

  const renderEvergreenStep = () => {
    switch (step) {
      case 0:
        return (
          <StepWrapper title="Citas Recibidas" question="¿Cuántas citas recibiste hoy?" hint="Total de citas asignadas por los setters">
            <BigNumberInput value={data.citas_recibidas} onChange={v => update('citas_recibidas', v)} />
          </StepWrapper>
        )
      case 1:
        return (
          <StepWrapper title="Show / No Show" question="¿Cuántas citas fueron show y no show?">
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Show (Asistieron)</label>
                <input type="number" min="0" value={data.citas_show}
                  onChange={e => update('citas_show', parseInt(e.target.value) || 0)}
                  className="w-full text-2xl font-bold text-center bg-[#0D1117] border-2 border-gray-700 rounded-xl px-4 py-5 text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">No Show</label>
                <input type="number" min="0" value={data.citas_noshow}
                  onChange={e => update('citas_noshow', parseInt(e.target.value) || 0)}
                  className="w-full text-2xl font-bold text-center bg-[#0D1117] border-2 border-gray-700 rounded-xl px-4 py-5 text-red-400 focus:outline-none focus:border-red-500 transition-colors" />
              </div>
            </div>
          </StepWrapper>
        )
      case 2:
        return (
          <StepWrapper title="Resultados de Ventas" question="¿Cuántas ventas cerraste y cuántas no cerraste?">
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Cerradas</label>
                <input type="number" min="0" value={data.ventas_cerradas}
                  onChange={e => update('ventas_cerradas', parseInt(e.target.value) || 0)}
                  className="w-full text-2xl font-bold text-center bg-[#0D1117] border-2 border-gray-700 rounded-xl px-4 py-5 text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">No Cerradas</label>
                <input type="number" min="0" value={data.ventas_no_cerradas}
                  onChange={e => update('ventas_no_cerradas', parseInt(e.target.value) || 0)}
                  className="w-full text-2xl font-bold text-center bg-[#0D1117] border-2 border-gray-700 rounded-xl px-4 py-5 text-red-400 focus:outline-none focus:border-red-500 transition-colors" />
              </div>
            </div>
          </StepWrapper>
        )
      case 3: return saleDetailStep
      case 4:
        return (
          <StepWrapper title="Motivos de No Cierre" question="¿Cuántas objeciones tuviste por cada motivo?">
            <div className="space-y-3 mt-6">
              {[
                { label: 'Precio / no tiene presupuesto', field: 'motivo_precio' as keyof CloserData },
                { label: 'Necesita consultarlo', field: 'motivo_consultar' as keyof CloserData },
                { label: 'No es el momento', field: 'motivo_momento' as keyof CloserData },
                { label: 'Prefiere la competencia', field: 'motivo_competencia' as keyof CloserData },
                { label: 'Otro motivo', field: 'motivo_otro' as keyof CloserData },
              ].map(({ label, field }) => (
                <div key={field} className="flex items-center justify-between bg-[#111827] border border-gray-800 rounded-xl px-4 py-3">
                  <span className="text-gray-300 text-sm">{label}</span>
                  <input type="number" min="0" value={data[field] as number}
                    onChange={e => update(field, parseInt(e.target.value) || 0)}
                    className="w-16 text-center bg-[#0D1117] border border-gray-700 rounded-lg px-2 py-1.5 text-white font-bold focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              ))}
            </div>
          </StepWrapper>
        )
      case 5:
        return (
          <StepWrapper title="Reunión de Equipo" question="¿Asististe a la reunión del equipo hoy?">
            <ReunionStep value={data.asistio_reunion} nota={data.nota_reunion}
              onValue={v => { update('asistio_reunion', v); if (v === true) update('nota_reunion', '') }}
              onNota={v => update('nota_reunion', v)}
              onNoMeeting={() => { update('asistio_reunion', null); update('nota_reunion', 'sin_reunion') }} />
          </StepWrapper>
        )
      case 6:
        return (
          <StepWrapper title="Comentario General" question="¿Algún comentario o novedad del día?">
            <div className="mt-6">
              <textarea value={data.comentario} onChange={e => update('comentario', e.target.value)} rows={4} placeholder="Escribí aquí..."
                className="w-full bg-[#0D1117] border-2 border-gray-700 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none text-lg" autoFocus />
            </div>
          </StepWrapper>
        )
      case 7: {
        const validSales = data.detalle_ventas.filter(s => s.monto > 0)
        const totalCerrado = validSales.reduce((sum, s) => sum + s.monto, 0)
        const totalCobrado = validSales.reduce((sum, s) => sum + s.cobrado, 0)
        const pagosComp = validSales.filter(s => s.cobrado >= s.monto).length
        const pagosParc = validSales.filter(s => s.cobrado > 0 && s.cobrado < s.monto).length
        const pagosNul = validSales.filter(s => s.cobrado === 0).length
        return (
          <StepWrapper title="Resumen Final" question="Revisá tu reporte antes de enviar">
            <div className="space-y-2 mt-4">
              {[
                { label: 'Citas recibidas', value: data.citas_recibidas },
                { label: 'Show / No Show', value: `${data.citas_show} / ${data.citas_noshow}` },
                { label: 'Ventas cerradas / no cerradas', value: `${data.ventas_cerradas} / ${data.ventas_no_cerradas}` },
                { label: 'Pagos (completo/parcial/sin pago)', value: `${pagosComp} / ${pagosParc} / ${pagosNul}` },
                { label: 'Monto total cerrado', value: formatCurrency(totalCerrado) },
                { label: 'Monto cobrado', value: formatCurrency(totalCobrado), highlight: 'green' },
                { label: 'Monto pendiente', value: formatCurrency(Math.max(0, totalCerrado - totalCobrado)), highlight: 'red' },
                { label: 'Reunión', value: data.nota_reunion === 'sin_reunion' ? 'No había reunión' : data.asistio_reunion === null ? 'No reportado' : data.asistio_reunion ? 'Sí' : 'No' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center bg-[#111827] border border-gray-800 rounded-xl px-4 py-3">
                  <span className="text-gray-400 text-sm">{item.label}</span>
                  <span className={`font-bold text-sm ${item.highlight === 'green' ? 'text-emerald-400' : item.highlight === 'red' ? 'text-red-400' : 'text-white'}`}>
                    {String(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </StepWrapper>
        )
      }
      default: return null
    }
  }

  const renderLanzamientoStep = () => {
    switch (step) {
      case 0:
        return (
          <StepWrapper title="Propuestas" question="¿Cuántas propuestas enviaste hoy por chat/DM?" hint="Propuestas formales enviadas por mensaje">
            <BigNumberInput value={data.propuestas_enviadas} onChange={v => update('propuestas_enviadas', v)} />
          </StepWrapper>
        )
      case 1:
        return (
          <StepWrapper title="Seguimientos" question="¿Cuántos seguimientos realizaste a propuestas anteriores?" hint="Follow-ups a propuestas enviadas en días anteriores">
            <BigNumberInput value={data.seguimientos_realizados} onChange={v => update('seguimientos_realizados', v)} />
          </StepWrapper>
        )
      case 2:
        return (
          <StepWrapper title="Ventas" question="¿Cuántas ventas cerraste hoy?">
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Cerradas</label>
                <input type="number" min="0" value={data.ventas_cerradas}
                  onChange={e => update('ventas_cerradas', parseInt(e.target.value) || 0)}
                  className="w-full text-2xl font-bold text-center bg-[#0D1117] border-2 border-gray-700 rounded-xl px-4 py-5 text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">No Cerradas</label>
                <input type="number" min="0" value={data.ventas_no_cerradas}
                  onChange={e => update('ventas_no_cerradas', parseInt(e.target.value) || 0)}
                  className="w-full text-2xl font-bold text-center bg-[#0D1117] border-2 border-gray-700 rounded-xl px-4 py-5 text-red-400 focus:outline-none focus:border-red-500 transition-colors" />
              </div>
            </div>
          </StepWrapper>
        )
      case 3: return saleDetailStep
      case 4:
        return (
          <StepWrapper title="Objeciones" question="¿Cuántas objeciones lograste resolver hoy?">
            <BigNumberInput value={data.objeciones_resueltas} onChange={v => update('objeciones_resueltas', v)} />
            <div className="mt-6 space-y-3">
              <p className="text-sm text-gray-500 mb-2">Motivos de no cierre:</p>
              {[
                { label: 'Precio / no tiene presupuesto', field: 'motivo_precio' as keyof CloserData },
                { label: 'Necesita consultarlo', field: 'motivo_consultar' as keyof CloserData },
                { label: 'No es el momento', field: 'motivo_momento' as keyof CloserData },
                { label: 'Prefiere la competencia', field: 'motivo_competencia' as keyof CloserData },
                { label: 'Otro motivo', field: 'motivo_otro' as keyof CloserData },
              ].map(({ label, field }) => (
                <div key={field} className="flex items-center justify-between bg-[#111827] border border-gray-800 rounded-xl px-4 py-3">
                  <span className="text-gray-300 text-sm">{label}</span>
                  <input type="number" min="0" value={data[field] as number}
                    onChange={e => update(field, parseInt(e.target.value) || 0)}
                    className="w-16 text-center bg-[#0D1117] border border-gray-700 rounded-lg px-2 py-1.5 text-white font-bold focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              ))}
            </div>
          </StepWrapper>
        )
      case 5:
        return (
          <StepWrapper title="Conversaciones Activas" question="¿Cuántas conversaciones activas tenés pendientes de respuesta?">
            <BigNumberInput value={data.conversaciones_cerradas} onChange={v => update('conversaciones_cerradas', v)} />
          </StepWrapper>
        )
      case 6:
        return (
          <StepWrapper title="Tiempo de Respuesta" question="¿Cuál fue tu tiempo promedio de respuesta hoy?" hint="En horas (ej: 2 = 2 horas promedio)">
            <BigNumberInput value={data.tiempo_respuesta_avg} onChange={v => update('tiempo_respuesta_avg', v)} />
          </StepWrapper>
        )
      case 7:
        return (
          <StepWrapper title="Reunión de Equipo" question="¿Asististe a la reunión del equipo hoy?">
            <ReunionStep value={data.asistio_reunion} nota={data.nota_reunion}
              onValue={v => { update('asistio_reunion', v); if (v === true) update('nota_reunion', '') }}
              onNota={v => update('nota_reunion', v)}
              onNoMeeting={() => { update('asistio_reunion', null); update('nota_reunion', 'sin_reunion') }} />
          </StepWrapper>
        )
      case 8:
        return (
          <StepWrapper title="Comentario del Día" question="¿Algún comentario o novedad del día?">
            <div className="mt-6">
              <textarea value={data.comentario} onChange={e => update('comentario', e.target.value)} rows={4} placeholder="Escribí aquí..."
                className="w-full bg-[#0D1117] border-2 border-gray-700 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none text-lg" autoFocus />
            </div>
          </StepWrapper>
        )
      case 9: {
        const validSales = data.detalle_ventas.filter(s => s.monto > 0)
        const totalCerrado = validSales.reduce((sum, s) => sum + s.monto, 0)
        const totalCobrado = validSales.reduce((sum, s) => sum + s.cobrado, 0)
        const pagosComp = validSales.filter(s => s.cobrado >= s.monto).length
        const pagosParc = validSales.filter(s => s.cobrado > 0 && s.cobrado < s.monto).length
        const pagosNul = validSales.filter(s => s.cobrado === 0).length
        return (
          <StepWrapper title="Resumen Final" question="Revisá tu reporte antes de enviar">
            <div className="space-y-2 mt-4">
              {[
                { label: 'Propuestas enviadas', value: data.propuestas_enviadas },
                { label: 'Seguimientos realizados', value: data.seguimientos_realizados },
                { label: 'Ventas cerradas / no cerradas', value: `${data.ventas_cerradas} / ${data.ventas_no_cerradas}` },
                { label: 'Pagos (completo/parcial/sin pago)', value: `${pagosComp} / ${pagosParc} / ${pagosNul}` },
                { label: 'Objeciones resueltas', value: data.objeciones_resueltas },
                { label: 'Conversaciones activas pendientes', value: data.conversaciones_cerradas },
                { label: 'Tiempo respuesta promedio', value: `${data.tiempo_respuesta_avg}h` },
                { label: 'Monto total cerrado', value: formatCurrency(totalCerrado) },
                { label: 'Monto cobrado', value: formatCurrency(totalCobrado), highlight: 'green' },
                { label: 'Monto pendiente', value: formatCurrency(Math.max(0, totalCerrado - totalCobrado)), highlight: 'red' },
                { label: 'Reunión', value: data.nota_reunion === 'sin_reunion' ? 'No había reunión' : data.asistio_reunion === null ? 'No reportado' : data.asistio_reunion ? 'Sí' : 'No' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center bg-[#111827] border border-gray-800 rounded-xl px-4 py-3">
                  <span className="text-gray-400 text-sm">{item.label}</span>
                  <span className={`font-bold text-sm ${item.highlight === 'green' ? 'text-emerald-400' : item.highlight === 'red' ? 'text-red-400' : 'text-white'}`}>
                    {String(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </StepWrapper>
        )
      }
      default: return null
    }
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100

  if (submitted) {
    const totalCerrado = data.detalle_ventas.reduce((sum, s) => sum + s.monto, 0)
    const handleLogout = async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#080B14' }}>
        <div className="rounded-2xl p-8 max-w-md w-full text-center" style={{ background: '#0D1117', border: '1px solid #1a2234' }}>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-4">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Reporte enviado</h2>
          <p className="text-gray-400 mb-4">Excelente trabajo hoy, {nombre}!</p>
          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              { label: 'Citas Recibidas', value: data.citas_recibidas },
              { label: 'Shows', value: data.citas_show },
              { label: 'Ventas Cerradas', value: data.ventas_cerradas },
              { label: 'Monto Cerrado', value: formatCurrency(totalCerrado) },
            ].map(item => (
              <div key={item.label} className="bg-[#1a2235] rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">{item.label}</p>
                <p className="text-white font-bold text-lg">{String(item.value)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <DollarSign size={16} className="text-emerald-400 inline mr-1" />
            <span className="text-emerald-400 font-semibold">{formatCurrency(totalCerrado)} en ventas hoy</span>
          </div>
          <p className="text-gray-500 text-xs mt-4 mb-4">Si cometiste un error, contactá al director para que lo corrija.</p>
          <button onClick={handleLogout}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080B14' }}>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-400">
              Areté Sales OS — Reporte Closer
              {proyectoTipo === 'lanzamiento' && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(139,92,246,0.2)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.3)' }}>
                  🚀 Lanzamiento
                </span>
              )}
            </span>
          </div>
          <span className="text-sm text-gray-500">{step + 1} / {TOTAL_STEPS}</span>
        </div>
        <div className="max-w-lg mx-auto h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: proyectoTipo === 'lanzamiento' ? 'linear-gradient(90deg, #8B5CF6, #A78BFA)' : 'linear-gradient(90deg, #6366F1, #8B5CF6)' }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="w-full max-w-lg mx-auto" key={step}>
          {proyectoTipo === 'lanzamiento' ? renderLanzamientoStep() : renderEvergreenStep()}
          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-8">
        <div className="flex gap-3 max-w-lg mx-auto">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors">
              <ChevronLeft size={18} /> Atrás
            </button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <button onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold transition-all shadow-lg">
              Siguiente <ChevronRight size={18} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold transition-all shadow-lg disabled:opacity-60">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando...</>
              ) : (
                <><CheckCircle size={18} /> Enviar Reporte</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
