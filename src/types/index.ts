export type SetterProfile = {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: "admin" | "setter" | "closer"
  created_at: string
}

export type ProspectStatus = "nuevo" | "activo" | "pausado" | "llamada_agendada" | "cerrado_ganado" | "cerrado_perdido"
export type FollowUpPhase = "contacto" | "venta" | "cierre"
export type FollowUpStatus = "pendiente" | "enviado" | "respondido" | "sin_respuesta"

export type Prospect = {
  id: string
  linkedin_url: string
  full_name: string
  headline: string
  company: string
  location: string
  profile_image?: string
  status: ProspectStatus
  phase: FollowUpPhase
  follow_up_count: number
  last_contact_at?: string
  assigned_to: string
  assigned_to_profile?: SetterProfile
  created_at: string
  created_by: string
}

export type ProspectAnalysis = {
  id: string
  prospect_id: string
  psychological_profile: string
  disc_type: string
  communication_style: string
  key_words: string[]
  pain_points: string[]
  sales_angle: string
  company_analysis: string
  raw_linkedin_data: string
  created_at: string
}

export type GeneratedMessage = {
  id: string
  prospect_id: string
  follow_up_number: number
  phase: FollowUpPhase
  message_type: "inicial" | "sin_respuesta" | "con_respuesta"
  content: string
  created_at: string
}

// ==========================================
// Closer Metrics
// ==========================================

export type CloserMetric = {
  id: string
  organization_id: string
  closer_id: string
  fecha: string // date string YYYY-MM-DD
  leads_asignados: number
  leads_contactados: number
  respuestas_obtenidas: number
  llamadas_realizadas: number
  conversaciones_efectivas: number
  reuniones_agendadas: number
  reuniones_realizadas: number
  ofertas_enviadas: number
  ventas_cerradas: number
  monto_vendido: number
  cobrado: number
  seguimientos_pendientes: number
  objeciones_principales: string
  motivo_no_cierre: string
  observaciones: string
  created_at: string
  updated_at: string
  // Joined
  closer_name?: string
  closer_email?: string
  profiles?: { full_name: string; email: string }
}

export type CloserMetricInput = Omit<CloserMetric, "id" | "organization_id" | "closer_id" | "created_at" | "updated_at" | "closer_name" | "closer_email" | "profiles">

export type MetricKPI = {
  label: string
  value: number | string
  change?: number
  prefix?: string
  suffix?: string
  color?: string
}

export type FollowUp = {
  id: string
  prospect_id: string
  follow_up_number: number
  phase: FollowUpPhase
  status: FollowUpStatus
  prospect_responded: boolean
  response_content?: string
  notes?: string
  sent_at?: string
  setter_id: string
  setter_profile?: SetterProfile
  created_at: string
}
