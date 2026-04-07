'use client'

import { Pencil } from 'lucide-react'

interface ReportesHoyData {
  setters: Array<{ id: string; nombre: string; enviado: boolean; asistio_reunion?: boolean | null; reporte_id?: string | null }>
  closers: Array<{ id: string; nombre: string; enviado: boolean; asistio_reunion?: boolean | null; reporte_id?: string | null }>
}

interface Props {
  data: ReportesHoyData
  onEditReport?: (id: string, tipo: 'setter' | 'closer') => void
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function ReportesHoy({ data, onEditReport }: Props) {
  const totalSetters = data.setters.length
  const enviadosSetters = data.setters.filter(s => s.enviado).length
  const totalClosers = data.closers.length
  const enviadosClosers = data.closers.filter(c => c.enviado).length
  const total = totalSetters + totalClosers
  const enviados = enviadosSetters + enviadosClosers
  const pct = total > 0 ? Math.round((enviados / total) * 100) : 0

  return (
    <div>
      {/* Progress */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold" style={{ color: '#94A3B8' }}>{enviados}/{total} reportes</span>
          <span className="text-xs font-mono font-bold" style={{ color: pct === 100 ? '#34D399' : '#FBBF24' }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2234' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct === 100 ? '#34D399' : pct >= 50 ? '#FBBF24' : '#F87171' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Setters column */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#818CF8' }}>Setters ({enviadosSetters}/{totalSetters})</p>
          <div className="space-y-1.5">
            {data.setters.map(s => (
              <div key={s.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: s.enviado ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)', border: `1px solid ${s.enviado ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'}` }}>
                <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0" style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>{getInitials(s.nombre)}</div>
                <span className="flex-1 text-sm truncate" style={{ color: '#E2E8F0' }}>{s.nombre}</span>
                {s.enviado ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-base" title="Enviado">✓</span>
                    {onEditReport && s.reporte_id && (
                      <button onClick={() => onEditReport(s.reporte_id!, 'setter')} className="p-1 rounded hover:bg-white/5 transition-colors" title="Editar reporte">
                        <Pencil size={11} style={{ color: '#475569' }} />
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-medium" style={{ color: '#F87171' }}>Pendiente</span>
                )}
              </div>
            ))}
            {data.setters.length === 0 && <p className="text-xs" style={{ color: '#334155' }}>Sin setters</p>}
          </div>
        </div>

        {/* Closers column */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#34D399' }}>Closers ({enviadosClosers}/{totalClosers})</p>
          <div className="space-y-1.5">
            {data.closers.map(c => (
              <div key={c.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: c.enviado ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)', border: `1px solid ${c.enviado ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'}` }}>
                <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0" style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399' }}>{getInitials(c.nombre)}</div>
                <span className="flex-1 text-sm truncate" style={{ color: '#E2E8F0' }}>{c.nombre}</span>
                {c.enviado ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-base" title="Enviado">✓</span>
                    {onEditReport && c.reporte_id && (
                      <button onClick={() => onEditReport(c.reporte_id!, 'closer')} className="p-1 rounded hover:bg-white/5 transition-colors" title="Editar reporte">
                        <Pencil size={11} style={{ color: '#475569' }} />
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-medium" style={{ color: '#F87171' }}>Pendiente</span>
                )}
              </div>
            ))}
            {data.closers.length === 0 && <p className="text-xs" style={{ color: '#334155' }}>Sin closers</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
