'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, ChevronLeft, ChevronRight, LogOut } from 'lucide-react'

interface CitaDetail {
  nombre_lead: string
  horario: string
  comentario: string
}

interface SetterData {
  leads_recibidos: number
  intentos_contacto: number
  contactados: number
  citas_agendadas: number
  citas_show: number
  citas_noshow: number
  citas_reprogramadas: number
  citas_calificadas: number
  motivos_noshow: string
  comentario: string
  detalle_citas: CitaDetail[]
  // Lanzamiento fields
  mensajes_enviados: number
  respuestas_obtenidas: number
  conversaciones_activas: number
  leads_calificados_chat: number
  llamadas_agendadas_dm: number
  // Common
  asistio_reunion: boolean | null
  nota_reunion: string
  tipo_proyecto: string
}

const initialData: SetterData = {
  leads_recibidos: 0,
  intentos_contacto: 0,
  contactados: 0,
  citas_agendadas: 0,
  citas_show: 0,
  citas_noshow: 0,
  citas_reprogramadas: 0,
  citas_calificadas: 0,
  motivos_noshow: '',
  comentario: '',
  detalle_citas: [],
  mensajes_enviados: 0,
  respuestas_obtenidas: 0,
  conversaciones_activas: 0,
  leads_calificados_chat: 0,
  llamadas_agendadas_dm: 0,
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
      <input
        type="number"
        min="0"
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        className="w-full text-4xl font-bold text-center bg-[#0D1117] border-2 border-gray-700 rounded-2xl px-6 py-8 text-white focus:outline-none focus:border-indigo-500 transition-colors"
        autoFocus
      />
    </div>
  )
}

function StepContent({ title, question, hint, children }: { title: string; question: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2">
        <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">{title}</span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">{question}</h2>
      {hint && <p className="text-gray-500 text-sm mb-2">{hint}</p>}
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

export default function SetterWizard() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [orgId, setOrgId] = useState('')
  const [nombre, setNombre] = useState('')
  const [step, setStep] = useState(0)
  const [data, setData] = useState<SetterData>(initialData)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([])
  const [proyectoId, setProyectoId] = useState<string | null>(null)
  const [showProyectoSelector, setShowProyectoSelector] = useState(false)
  const [proyectoTipo, setProyectoTipo] = useState<'evergreen' | 'lanzamiento'>('evergreen')
  const [proyectoNombre, setProyectoNombre] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('full_name, role, organization_id').eq('id', user.id).single()
      if (!profile || profile.role !== 'setter') { router.push('/login'); return }
      setNombre(profile.full_name || 'Setter')
      setOrgId(profile.organization_id || '')
      const today = new Date().toISOString().split('T')[0]
      const { data: rep } = await supabase.from('reportes_setter').select('*').eq('user_id', user.id).eq('fecha', today).maybeSingle()
      if (rep) {
        setData({
          ...initialData,
          leads_recibidos: rep.leads_nuevos || 0,
          intentos_contacto: rep.intentos_contacto || 0,
          contactados: rep.contactos_efectivos || 0,
          citas_agendadas: rep.citas_agendadas || 0,
          citas_show: rep.citas_show || 0,
          citas_noshow: rep.citas_no_show || 0,
          citas_reprogramadas: rep.citas_reprogramadas || 0,
          citas_calificadas: rep.citas_calificadas || 0,
          motivos_noshow: rep.motivos_noshow || '',
          comentario: rep.notas || '',
          detalle_citas: rep.detalle_citas || [],
          mensajes_enviados: rep.mensajes_enviados || 0,
          respuestas_obtenidas: rep.respuestas_recibidas || 0,
          conversaciones_activas: rep.conversaciones_activas || 0,
          leads_calificados_chat: rep.leads_calificados_chat || 0,
          llamadas_agendadas_dm: rep.llamadas_agendadas_dm || 0,
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

  // Fetch project tipo when proyectoId is set
  useEffect(() => {
    if (!proyectoId) return
    const supabase = createClient()
    supabase.from('director_proyectos').select('tipo, nombre').eq('id', proyectoId).single().then(({ data: proyecto }) => {
      const tipo = (proyecto?.tipo as 'evergreen' | 'lanzamiento') || 'evergreen'
      setProyectoTipo(tipo)
      setProyectoNombre(proyecto?.nombre || '')
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

  // EVERGREEN: 12 steps, LANZAMIENTO: 8 steps
  const EVERGREEN_TOTAL = 12
  const LANZAMIENTO_TOTAL = 8
  const totalSteps = proyectoTipo === 'lanzamiento' ? LANZAMIENTO_TOTAL : EVERGREEN_TOTAL
  const progress = ((step + 1) / totalSteps) * 100

  function updateField<K extends keyof SetterData>(field: K, value: SetterData[K]) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  function updateCita(index: number, field: keyof CitaDetail, value: string) {
    setData(prev => {
      const updated = [...prev.detalle_citas]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, detalle_citas: updated }
    })
  }

  function handleNext() {
    if (proyectoTipo === 'evergreen') {
      if (step === 3 && data.citas_agendadas === 0) { setStep(5); return }
      if (step === 3 && data.citas_agendadas > 0) {
        const count = data.citas_agendadas
        setData(prev => {
          const arr = [...prev.detalle_citas]
          while (arr.length < count) arr.push({ nombre_lead: '', horario: '', comentario: '' })
          return { ...prev, detalle_citas: arr.slice(0, count) }
        })
      }
    }
    setStep(s => s + 1)
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const validCitas = data.detalle_citas.filter(c => c.nombre_lead.trim())

    // Map wizard field names → DB column names
    const payload = {
      user_id: userId,
      organization_id: orgId,
      fecha: new Date().toISOString().split('T')[0],
      leads_nuevos: data.leads_recibidos,
      intentos_contacto: data.intentos_contacto,
      contactos_efectivos: data.contactados,
      citas_agendadas: data.citas_agendadas,
      citas_show: data.citas_show,
      citas_no_show: data.citas_noshow,
      citas_reprogramadas: data.citas_reprogramadas,
      citas_calificadas: data.citas_calificadas,
      motivos_noshow: data.motivos_noshow || null,
      notas: data.comentario || null,
      detalle_citas: validCitas.length > 0 ? validCitas : null,
      mensajes_enviados: data.mensajes_enviados,
      respuestas_recibidas: data.respuestas_obtenidas,
      conversaciones_activas: data.conversaciones_activas,
      leads_calificados_chat: data.leads_calificados_chat,
      llamadas_agendadas_dm: data.llamadas_agendadas_dm,
      asistio_reunion: data.nota_reunion === 'sin_reunion' ? null : (data.asistio_reunion ?? false),
      nota_reunion: data.nota_reunion || null,
      tipo_proyecto: data.tipo_proyecto,
      ...(proyectoId ? { proyecto_id: proyectoId } : {}),
    }

    const { error: err } = await supabase.from('reportes_setter').upsert(payload, {
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

  const renderEvergreenStep = () => {
    switch (step) {
      case 0:
        return <StepContent title="Leads Recibidos" question="¿Cuántos leads recibiste hoy?" hint="Total de contactos nuevos asignados">
          <BigNumberInput value={data.leads_recibidos} onChange={v => updateField('leads_recibidos', v)} />
        </StepContent>
      case 1:
        return <StepContent title="Intentos de Contacto" question="¿Cuántos intentos de contacto realizaste?" hint="Llamadas, mensajes, emails enviados">
          <BigNumberInput value={data.intentos_contacto} onChange={v => updateField('intentos_contacto', v)} />
        </StepContent>
      case 2:
        return <StepContent title="Contactados" question="¿A cuántos leads lograste contactar?" hint="Leads que respondieron efectivamente">
          <BigNumberInput value={data.contactados} onChange={v => updateField('contactados', v)} />
        </StepContent>
      case 3:
        return <StepContent title="Citas Agendadas" question="¿Cuántas citas agendaste hoy?" hint="Citas confirmadas para los closers">
          <BigNumberInput value={data.citas_agendadas} onChange={v => updateField('citas_agendadas', v)} />
        </StepContent>
      case 4:
        return <StepContent title="Detalle de Citas" question="Completá los datos de cada cita agendada" hint="Nombre del lead, horario y un breve comentario">
          <div className="mt-6 space-y-4">
            {data.detalle_citas.map((cita, i) => (
              <div key={i} className="bg-[#0D1117] border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">Cita {i + 1}</span>
                </div>
                <input type="text" value={cita.nombre_lead} onChange={e => updateCita(i, 'nombre_lead', e.target.value)} placeholder="Nombre del lead"
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm" />
                <input type="text" value={cita.horario} onChange={e => updateCita(i, 'horario', e.target.value)} placeholder="Horario (ej: 10:00)"
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm" />
                <input type="text" value={cita.comentario} onChange={e => updateCita(i, 'comentario', e.target.value)} placeholder="Comentario breve (opcional)"
                  className="w-full bg-[#111827] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm" />
              </div>
            ))}
          </div>
        </StepContent>
      case 5:
        return <StepContent title="Show / No Show" question="¿Cuántas citas fueron show y no show?">
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Show (Asistieron)</label>
              <input type="number" min="0" value={data.citas_show}
                onChange={e => updateField('citas_show', parseInt(e.target.value) || 0)}
                className="w-full text-2xl font-bold text-center bg-[#0D1117] border-2 border-gray-700 rounded-xl px-4 py-5 text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">No Show</label>
              <input type="number" min="0" value={data.citas_noshow}
                onChange={e => updateField('citas_noshow', parseInt(e.target.value) || 0)}
                className="w-full text-2xl font-bold text-center bg-[#0D1117] border-2 border-gray-700 rounded-xl px-4 py-5 text-red-400 focus:outline-none focus:border-red-500 transition-colors" />
            </div>
          </div>
        </StepContent>
      case 6:
        return <StepContent title="Citas Reprogramadas" question="¿Cuántas citas fueron reprogramadas?" hint="Citas que se movieron a otro horario">
          <BigNumberInput value={data.citas_reprogramadas} onChange={v => updateField('citas_reprogramadas', v)} />
        </StepContent>
      case 7:
        return <StepContent title="Citas Calificadas" question="¿Cuántas citas fueron calificadas?" hint="Prospectos listos para el proceso de venta">
          <BigNumberInput value={data.citas_calificadas} onChange={v => updateField('citas_calificadas', v)} />
        </StepContent>
      case 8:
        return <StepContent title="Motivos No Show" question="¿Cuáles fueron los motivos de no show?" hint="Describe brevemente los motivos principales">
          <div className="mt-6">
            <textarea value={data.motivos_noshow} onChange={e => updateField('motivos_noshow', e.target.value)} rows={4} placeholder="Escribí aquí..."
              className="w-full bg-[#0D1117] border-2 border-gray-700 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none text-lg" autoFocus />
          </div>
        </StepContent>
      case 9:
        return <StepContent title="Reunión de Equipo" question="¿Asististe a la reunión del equipo hoy?">
          <ReunionStep value={data.asistio_reunion} nota={data.nota_reunion}
            onValue={v => { updateField('asistio_reunion', v); if (v !== false) updateField('nota_reunion', '') }}
            onNota={v => updateField('nota_reunion', v)}
            onNoMeeting={() => { updateField('asistio_reunion', null); updateField('nota_reunion', 'sin_reunion') }} />
        </StepContent>
      case 10:
        return <StepContent title="Comentario General" question="¿Algún comentario o novedad del día?" hint="Observaciones importantes, contexto, etc.">
          <div className="mt-6">
            <textarea value={data.comentario} onChange={e => updateField('comentario', e.target.value)} rows={4} placeholder="Escribí aquí..."
              className="w-full bg-[#0D1117] border-2 border-gray-700 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none text-lg" autoFocus />
          </div>
        </StepContent>
      case 11:
        return <StepContent title="Resumen" question="Revisá tu reporte antes de enviar">
          <div className="mt-6 space-y-3">
            {[
              { label: 'Leads recibidos', value: data.leads_recibidos },
              { label: 'Intentos de contacto', value: data.intentos_contacto },
              { label: 'Contactados', value: data.contactados },
              { label: 'Citas agendadas', value: data.citas_agendadas },
              { label: 'Citas show', value: data.citas_show },
              { label: 'Citas no show', value: data.citas_noshow },
              { label: 'Citas reprogramadas', value: data.citas_reprogramadas },
              { label: 'Citas calificadas', value: data.citas_calificadas },
              { label: 'Reunión', value: data.nota_reunion === 'sin_reunion' ? 'No había reunión' : data.asistio_reunion === null ? 'No reportado' : data.asistio_reunion ? 'Sí' : 'No' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center bg-[#111827] border border-gray-800 rounded-xl px-4 py-3">
                <span className="text-gray-400 text-sm">{item.label}</span>
                <span className="text-white font-bold text-lg">{String(item.value)}</span>
              </div>
            ))}
            {data.detalle_citas.filter(c => c.nombre_lead).length > 0 && (
              <div className="bg-[#111827] border border-gray-800 rounded-xl px-4 py-3">
                <p className="text-gray-400 text-xs mb-2">Detalle de citas</p>
                {data.detalle_citas.filter(c => c.nombre_lead).map((c, i) => (
                  <p key={i} className="text-white text-sm">• {c.nombre_lead}{c.horario ? ` — ${c.horario}` : ''}{c.comentario ? ` (${c.comentario})` : ''}</p>
                ))}
              </div>
            )}
            {data.comentario && (
              <div className="bg-[#111827] border border-gray-800 rounded-xl px-4 py-3">
                <p className="text-gray-400 text-xs mb-1">Comentario</p>
                <p className="text-white text-sm">{data.comentario}</p>
              </div>
            )}
          </div>
        </StepContent>
      default:
        return null
    }
  }

  const renderLanzamientoStep = () => {
    switch (step) {
      case 0:
        return <StepContent title="Bienvenida / Mensajes" question={`Hola ${nombre}, registremos tu día${proyectoNombre ? ` en ${proyectoNombre}` : ''}`} hint="¿Cuántos mensajes/DMs enviaste hoy en la campaña?">
          <BigNumberInput value={data.mensajes_enviados} onChange={v => updateField('mensajes_enviados', v)} />
        </StepContent>
      case 1:
        return <StepContent title="Respuestas y Conversaciones" question="¿Cuántas respuestas obtuviste?">
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Respuestas obtenidas</label>
              <input type="number" min="0" value={data.respuestas_obtenidas}
                onChange={e => updateField('respuestas_obtenidas', parseInt(e.target.value) || 0)}
                className="w-full text-2xl font-bold text-center bg-[#0D1117] border-2 border-gray-700 rounded-xl px-4 py-5 text-indigo-400 focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Conversaciones activas</label>
              <input type="number" min="0" value={data.conversaciones_activas}
                onChange={e => updateField('conversaciones_activas', parseInt(e.target.value) || 0)}
                className="w-full text-2xl font-bold text-center bg-[#0D1117] border-2 border-gray-700 rounded-xl px-4 py-5 text-violet-400 focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
          </div>
        </StepContent>
      case 2:
        return <StepContent title="Calificación" question="¿Cuántos leads calificaste hoy por chat?" hint="Leads que cumplen el perfil ideal según conversación">
          <BigNumberInput value={data.leads_calificados_chat} onChange={v => updateField('leads_calificados_chat', v)} />
        </StepContent>
      case 3:
        return <StepContent title="Llamadas Agendadas" question="¿Cuántas llamadas/demos agendaste desde DMs?" hint="Citas agendadas directamente por mensajes">
          <BigNumberInput value={data.llamadas_agendadas_dm} onChange={v => updateField('llamadas_agendadas_dm', v)} />
        </StepContent>
      case 4:
        return <StepContent title="Show / No Show" question="¿Cuántas citas agendadas fueron show y no show?">
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Show (Asistieron)</label>
              <input type="number" min="0" value={data.citas_show}
                onChange={e => updateField('citas_show', parseInt(e.target.value) || 0)}
                className="w-full text-2xl font-bold text-center bg-[#0D1117] border-2 border-gray-700 rounded-xl px-4 py-5 text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">No Show</label>
              <input type="number" min="0" value={data.citas_noshow}
                onChange={e => updateField('citas_noshow', parseInt(e.target.value) || 0)}
                className="w-full text-2xl font-bold text-center bg-[#0D1117] border-2 border-gray-700 rounded-xl px-4 py-5 text-red-400 focus:outline-none focus:border-red-500 transition-colors" />
            </div>
          </div>
        </StepContent>
      case 5:
        return <StepContent title="Reunión de Equipo" question="¿Asististe a la reunión del equipo hoy?">
          <ReunionStep value={data.asistio_reunion} nota={data.nota_reunion}
            onValue={v => { updateField('asistio_reunion', v); if (v !== false) updateField('nota_reunion', '') }}
            onNota={v => updateField('nota_reunion', v)}
            onNoMeeting={() => { updateField('asistio_reunion', null); updateField('nota_reunion', 'sin_reunion') }} />
        </StepContent>
      case 6:
        return <StepContent title="Comentario del Día" question="¿Algún comentario o novedad del día?" hint="Observaciones importantes, contexto, etc.">
          <div className="mt-6">
            <textarea value={data.comentario} onChange={e => updateField('comentario', e.target.value)} rows={4} placeholder="Escribí aquí..."
              className="w-full bg-[#0D1117] border-2 border-gray-700 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none text-lg" autoFocus />
          </div>
        </StepContent>
      case 7:
        return <StepContent title="Resumen" question="Revisá tu reporte antes de enviar">
          <div className="mt-6 space-y-3">
            {[
              { label: 'Mensajes enviados', value: data.mensajes_enviados },
              { label: 'Respuestas obtenidas', value: data.respuestas_obtenidas },
              { label: 'Conversaciones activas', value: data.conversaciones_activas },
              { label: 'Leads calificados (chat)', value: data.leads_calificados_chat },
              { label: 'Llamadas agendadas (DM)', value: data.llamadas_agendadas_dm },
              { label: 'Show / No Show', value: `${data.citas_show} / ${data.citas_noshow}` },
              { label: 'Reunión', value: data.nota_reunion === 'sin_reunion' ? 'No había reunión' : data.asistio_reunion === null ? 'No reportado' : data.asistio_reunion ? 'Sí' : 'No' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center bg-[#111827] border border-gray-800 rounded-xl px-4 py-3">
                <span className="text-gray-400 text-sm">{item.label}</span>
                <span className="text-white font-bold text-lg">{String(item.value)}</span>
              </div>
            ))}
            {data.comentario && (
              <div className="bg-[#111827] border border-gray-800 rounded-xl px-4 py-3">
                <p className="text-gray-400 text-xs mb-1">Comentario</p>
                <p className="text-white text-sm">{data.comentario}</p>
              </div>
            )}
          </div>
        </StepContent>
      default:
        return null
    }
  }

  if (submitted) {
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
          <p className="text-gray-400 mb-4">Tu reporte de hoy fue registrado exitosamente.</p>
          <p className="text-gray-500 text-xs mb-6">Si cometiste un error, contactá al director para que lo corrija.</p>
          <button onClick={handleLogout}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors">
            <LogOut size={16} /> Cerrar sesión
          </button>
          <p className="text-gray-600 text-xs mt-6">Hasta mañana, {nombre}!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080B14' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-400">
              Areté Sales OS — Reporte Setter
              {proyectoTipo === 'lanzamiento' && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(139,92,246,0.2)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.3)' }}>
                  🚀 Lanzamiento
                </span>
              )}
            </span>
          </div>
          <span className="text-sm text-gray-500">{step + 1} / {totalSteps}</span>
        </div>
        <div className="max-w-lg mx-auto h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: proyectoTipo === 'lanzamiento' ? 'linear-gradient(90deg, #8B5CF6, #A78BFA)' : 'linear-gradient(90deg, #6366F1, #8B5CF6)' }} />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg" key={step}>
          {proyectoTipo === 'lanzamiento' ? renderLanzamientoStep() : renderEvergreenStep()}
          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-4 pb-8">
        <div className="flex gap-3 max-w-lg mx-auto">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors">
              <ChevronLeft size={18} /> Atrás
            </button>
          )}
          {step < totalSteps - 1 ? (
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
