'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

interface EditReportModalProps {
  tipo: 'setter' | 'closer'
  reporteId: string
  onClose: () => void
  onSaved: () => void
}

export default function EditReportModal({ tipo, reporteId, onClose, onSaved }: EditReportModalProps) {
  const [data, setData] = useState<Record<string, any> | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/director/reportes/${tipo}/${reporteId}`).then(r => r.json()).then(setData)
  }, [tipo, reporteId])

  const handleSave = async () => {
    if (!data) return
    setSaving(true)
    await fetch(`/api/director/reportes/${tipo}/${reporteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  const setField = (key: string, val: any) => setData(prev => prev ? { ...prev, [key]: val } : prev)

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 13,
  }

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }

  if (!data) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 32, color: 'var(--text-muted)' }}>Cargando...</div>
    </div>
  )

  const setterFields = ['leads_nuevos', 'citas_agendadas', 'citas_show', 'citas_calificadas', 'followups_realizados']
  const closerFields = ['shows', 'ventas_cerradas', 'monto_cobrado', 'efectivo', 'transferencia', 'tarjeta']
  const fields = tipo === 'setter' ? setterFields : closerFields

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 420, maxHeight: '80vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            Editar Reporte {tipo === 'setter' ? 'Setter' : 'Closer'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {fields.map(key => (
            <div key={key}>
              <div style={labelStyle}>{key.replace(/_/g, ' ')}</div>
              <input
                type="number"
                value={data[key] || 0}
                onChange={e => setField(key, Number(e.target.value))}
                style={fieldStyle}
              />
            </div>
          ))}

          {tipo === 'closer' && (
            <div>
              <div style={labelStyle}>Motivos no cierre</div>
              <textarea
                value={data.motivos_no_cierre || ''}
                onChange={e => setField('motivos_no_cierre', e.target.value)}
                rows={3}
                style={{ ...fieldStyle, resize: 'vertical' }}
              />
            </div>
          )}

          <div>
            <div style={labelStyle}>Notas</div>
            <textarea
              value={data.notas || ''}
              onChange={e => setField('notas', e.target.value)}
              rows={3}
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
            <Save size={14} />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
