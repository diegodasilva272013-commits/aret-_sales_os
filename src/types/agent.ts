// =====================================================
// Areté Sales OS — LinkedIn Agent Types
// =====================================================

export type AgentStatus =
  | "discovered"
  | "warming"
  | "commenting"
  | "connecting"
  | "connected"
  | "nurturing"
  | "messaged"
  | "responded"
  | "converted"
  | "paused"
  | "failed"
  | "skipped"

export type ActionType =
  | "profile_view"
  | "post_like"
  | "post_comment"
  | "connection_request"
  | "connection_accepted"
  | "direct_message"
  | "profile_discovered"
  | "stage_changed"
  | "error"

export type LinkedInAccountStatus =
  | "disconnected"
  | "active"
  | "warming"
  | "banned"
  | "paused"

export interface AgentConfig {
  id: string
  organization_id: string
  is_active: boolean
  icp_industries: string[]
  icp_roles: string[]
  icp_company_size: string
  icp_locations: string[]
  icp_keywords: string[]
  daily_connection_limit: number
  daily_comment_limit: number
  daily_like_limit: number
  delay_min_seconds: number
  delay_max_seconds: number
  active_hours_start: number
  active_hours_end: number
  active_days: number[]
  warming_days: number
  commenting_days: number
  nurturing_days: number
  created_at: string
  updated_at: string
}

export interface AgentQueueItem {
  id: string
  organization_id: string
  linkedin_account_id: string | null
  prospect_id: string | null
  linkedin_url: string
  full_name: string | null
  headline: string | null
  company: string | null
  location: string | null
  profile_data: Record<string, unknown> | null
  disc_type: string | null
  pain_points: string[] | null
  sales_angle: string | null
  fit_score: number | null
  status: AgentStatus
  started_at: string | null
  current_stage_started_at: string | null
  next_action_at: string | null
  messaged_at: string | null
  converted_at: string | null
  retry_count: number
  skip_reason: string | null
  created_at: string
  updated_at: string
}

export interface AgentLog {
  id: string
  organization_id: string
  queue_id: string
  linkedin_account_id: string | null
  action_type: ActionType
  action_detail: string | null
  generated_content: string | null
  success: boolean
  error_message: string | null
  executed_at: string
  duration_ms: number | null
}

export interface LinkedInAccount {
  id: string
  organization_id: string
  account_name: string
  linkedin_email: string
  session_cookie: string | null
  status: LinkedInAccountStatus
  daily_connections_used: number
  daily_comments_used: number
  last_action_at: string | null
  banned_until: string | null
  created_at: string
}

// Pipeline stage labels and colors for UI
export const AGENT_STAGES: { key: AgentStatus; label: string; color: string }[] = [
  { key: "discovered", label: "Descubierto", color: "#6b7280" },
  { key: "warming", label: "Calentando", color: "#f59e0b" },
  { key: "commenting", label: "Comentando", color: "#8b5cf6" },
  { key: "connecting", label: "Conectando", color: "#3b82f6" },
  { key: "connected", label: "Conectado", color: "#06b6d4" },
  { key: "nurturing", label: "Nurturing", color: "#10b981" },
  { key: "messaged", label: "Mensajeado", color: "#22c55e" },
]

export const ACTION_LABELS: Record<ActionType, string> = {
  profile_view: "Vio perfil",
  post_like: "Dio like",
  post_comment: "Comentó post",
  connection_request: "Solicitud conexión",
  connection_accepted: "Conexión aceptada",
  direct_message: "Mensaje directo",
  profile_discovered: "Perfil descubierto",
  stage_changed: "Cambio de etapa",
  error: "Error",
}
