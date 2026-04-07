'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  User, Mail, Phone, Camera, Lock, Save, CheckCircle2, AlertCircle,
  ArrowLeft, Clock, Calendar, StickyNote
} from 'lucide-react'

const C = {
  bg: '#080B14', surface: '#0D1117', card: '#111827',
  border: '#1a2234', borderLight: '#1F2937',
  text: '#F1F5F9', textMuted: '#94A3B8', textDim: '#475569',
  accent: '#6366F1', accentLight: '#818CF8',
  green: '#34D399', red: '#F87171',
}

const DIAS_OPTIONS = [
  { value: 'lunes', label: 'Lun' },
  { value: 'martes', label: 'Mar' },
  { value: 'miercoles', label: 'Mié' },
  { value: 'jueves', label: 'Jue' },
  { value: 'viernes', label: 'Vie' },
  { value: 'sabado', label: 'Sáb' },
  { value: 'domingo', label: 'Dom' },
]

// DB-ADAPT: field names adapted to CRM schema
// original: nombre, apellido, telefono, foto_url, rol
// CRM: full_name, phone, avatar_url, role
interface Profile {
  id: string
  full_name: string
  email: string
  phone: string
  avatar_url: string | null
  role: string
  horario_inicio: string
  horario_fin: string
  dias_trabajo: string[]
  notas_perfil: string
  created_at: string
}

export default function PerfilPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password form
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    // DB-ADAPT: fetch directly, adapted field names
    const res = await fetch('/api/director/perfil')
    if (!res.ok) {
      router.push('/login')
      return
    }
    const { profile } = await res.json()
    setProfile(profile)
    setLoading(false)
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setMessage(null)

    // DB-ADAPT: send CRM field names
    const res = await fetch('/api/director/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: profile.full_name,
        phone: profile.phone,
        horario_inicio: profile.horario_inicio,
        horario_fin: profile.horario_fin,
        dias_trabajo: profile.dias_trabajo,
        notas_perfil: profile.notas_perfil,
      }),
    })

    if (!res.ok) {
      const { error } = await res.json()
      setMessage({ type: 'error', text: error || 'Error al guardar' })
    } else {
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente' })
    }
    setSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('avatar', file)

    const res = await fetch('/api/director/perfil/avatar', { method: 'POST', body: formData })
    const json = await res.json()

    if (!res.ok) {
      setMessage({ type: 'error', text: json.error || 'Error al subir la imagen' })
    } else {
      setProfile(p => p ? { ...p, avatar_url: json.url } : p)
      setMessage({ type: 'success', text: 'Foto actualizada' })
    }
    setUploadingAvatar(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setTimeout(() => setMessage(null), 3000)
  }

  async function handlePasswordChange() {
    setPasswordMessage(null)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Mínimo 6 caracteres' })
      return
    }

    setSavingPassword(true)

    const res = await fetch('/api/director/perfil/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      }),
    })

    if (!res.ok) {
      const { error } = await res.json()
      setPasswordMessage({ type: 'error', text: error || 'Error al cambiar contraseña' })
    } else {
      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada' })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setShowPasswordForm(false), 2000)
    }
    setSavingPassword(false)
    setTimeout(() => setPasswordMessage(null), 3000)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: C.bg }}>
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  // DB-ADAPT: use full_name instead of nombre+apellido
  const nameParts = (profile.full_name || '').split(' ')
  const initials = nameParts.map(n => (n[0] || '').toUpperCase()).slice(0, 2).join('')

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: C.bg }}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/director')}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: C.textMuted }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: C.text }}>Mi Perfil</h1>
            <p className="text-sm" style={{ color: C.textDim }}>Configurá tu cuenta y datos personales</p>
          </div>
        </div>

        {/* Global message */}
        {message && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{
              background: message.type === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${message.type === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
              color: message.type === 'success' ? C.green : C.red,
            }}
          >
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}

        {/* Avatar + Info Card */}
        <div className="rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar */}
            <div className="relative group">
              <div
                className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-bold"
                style={{
                  background: profile.avatar_url ? 'transparent' : `linear-gradient(135deg, ${C.accent}, #8B5CF6)`,
                  color: 'white',
                }}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.6)' }}
              >
                {uploadingAvatar ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Camera size={20} className="text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* Basic info */}
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-lg font-bold" style={{ color: C.text }}>
                {profile.full_name}
              </h2>
              <p className="text-sm" style={{ color: C.textMuted }}>{profile.email}</p>
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                  style={{ background: `${C.accent}20`, color: C.accentLight }}
                >
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </span>
                <span className="text-xs" style={{ color: C.textDim }}>
                  Desde {new Date(profile.created_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="rounded-2xl p-6 space-y-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: C.textDim }}>
            Datos Personales
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre Completo */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: C.textMuted }}>Nombre Completo</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textDim }} />
                <input
                  value={profile.full_name || ''}
                  onChange={e => setProfile(p => p ? { ...p, full_name: e.target.value } : p)}
                  className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ background: C.card, border: `1px solid ${C.borderLight}`, color: C.text, '--tw-ring-color': C.accent } as React.CSSProperties}
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: C.textMuted }}>Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textDim }} />
                <input
                  value={profile.email}
                  disabled
                  className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm opacity-60 cursor-not-allowed"
                  style={{ background: C.card, border: `1px solid ${C.borderLight}`, color: C.textMuted }}
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: C.textMuted }}>Teléfono</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textDim }} />
                <input
                  value={profile.phone || ''}
                  onChange={e => setProfile(p => p ? { ...p, phone: e.target.value } : p)}
                  placeholder="+54 11 1234-5678"
                  className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ background: C.card, border: `1px solid ${C.borderLight}`, color: C.text, '--tw-ring-color': C.accent } as React.CSSProperties}
                />
              </div>
            </div>
          </div>

          {/* Horario */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: C.textDim }}>
              <Clock size={14} className="inline mr-1.5 -mt-0.5" />
              Horario de Trabajo
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.textMuted }}>Inicio</label>
                <input
                  type="time"
                  value={profile.horario_inicio || '09:00'}
                  onChange={e => setProfile(p => p ? { ...p, horario_inicio: e.target.value } : p)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ background: C.card, border: `1px solid ${C.borderLight}`, color: C.text, '--tw-ring-color': C.accent } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.textMuted }}>Fin</label>
                <input
                  type="time"
                  value={profile.horario_fin || '18:00'}
                  onChange={e => setProfile(p => p ? { ...p, horario_fin: e.target.value } : p)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ background: C.card, border: `1px solid ${C.borderLight}`, color: C.text, '--tw-ring-color': C.accent } as React.CSSProperties}
                />
              </div>
            </div>

            {/* Days */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: C.textMuted }}>
                <Calendar size={12} className="inline mr-1 -mt-0.5" />
                Días de trabajo
              </label>
              <div className="flex flex-wrap gap-2">
                {DIAS_OPTIONS.map(d => {
                  const active = (profile.dias_trabajo || []).includes(d.value)
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => {
                        setProfile(p => {
                          if (!p) return p
                          const dias = p.dias_trabajo || []
                          return {
                            ...p,
                            dias_trabajo: active
                              ? dias.filter(x => x !== d.value)
                              : [...dias, d.value],
                          }
                        })
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: active ? `${C.accent}20` : C.card,
                        border: `1px solid ${active ? C.accent : C.borderLight}`,
                        color: active ? C.accentLight : C.textDim,
                      }}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: C.textMuted }}>
              <StickyNote size={12} className="inline mr-1 -mt-0.5" />
              Notas personales
            </label>
            <textarea
              value={profile.notas_perfil || ''}
              onChange={e => setProfile(p => p ? { ...p, notas_perfil: e.target.value } : p)}
              rows={3}
              placeholder="Notas internas, recordatorios..."
              className="w-full rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 transition-all"
              style={{ background: C.card, border: `1px solid ${C.borderLight}`, color: C.text, '--tw-ring-color': C.accent } as React.CSSProperties}
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${C.accent}, #8B5CF6)` }}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        {/* Password Section */}
        <div className="rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: C.text }}>
                <Lock size={14} className="inline mr-1.5 -mt-0.5" />
                Contraseña
              </h3>
              <p className="text-xs mt-0.5" style={{ color: C.textDim }}>Cambiá tu contraseña de acceso</p>
            </div>
            {!showPasswordForm && (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="px-4 py-2 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
                style={{ border: `1px solid ${C.borderLight}`, color: C.textMuted }}
              >
                Cambiar
              </button>
            )}
          </div>

          {showPasswordForm && (
            <div className="mt-4 space-y-3">
              {passwordMessage && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{
                    background: passwordMessage.type === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                    border: `1px solid ${passwordMessage.type === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
                    color: passwordMessage.type === 'success' ? C.green : C.red,
                  }}
                >
                  {passwordMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {passwordMessage.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.textMuted }}>Contraseña actual</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={e => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))}
                  className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ background: C.card, border: `1px solid ${C.borderLight}`, color: C.text, '--tw-ring-color': C.accent } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.textMuted }}>Nueva contraseña</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={e => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ background: C.card, border: `1px solid ${C.borderLight}`, color: C.text, '--tw-ring-color': C.accent } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.textMuted }}>Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={e => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                  className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ background: C.card, border: `1px solid ${C.borderLight}`, color: C.text, '--tw-ring-color': C.accent } as React.CSSProperties}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handlePasswordChange}
                  disabled={savingPassword}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${C.accent}, #8B5CF6)` }}
                >
                  {savingPassword ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Actualizar contraseña'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false)
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    setPasswordMessage(null)
                  }}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
                  style={{ color: C.textMuted, border: `1px solid ${C.borderLight}` }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all hover:bg-red-500/10"
          style={{ border: `1px solid rgba(248,113,113,0.3)`, color: C.red }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
