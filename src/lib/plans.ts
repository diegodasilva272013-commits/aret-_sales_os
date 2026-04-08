// =====================================================
// Areté Sales OS — Plan Configuration (Single Source of Truth)
// =====================================================

export type PlanKey = "free" | "starter" | "pro" | "agency"

export type PlanConfig = {
  key: PlanKey
  name: string
  price: number          // USD/mes
  priceLabel: string     // Display label
  // Usuarios y prospectos
  seats: number          // 0 = unlimited
  analysesPerMonth: number
  activeProspects: number // 0 = unlimited
  // Agente autónomo LinkedIn
  agentProspections: number // 0 = no access
  warmupSequence: boolean
  warmupCustom: boolean
  aiComments: boolean
  linkedinAccounts: number
  // Comunicaciones
  whatsappMessages: number // 0 = no access
  voipMinutes: number      // 0 = no access
  videoCalls: boolean
  // Inteligencia comercial
  dashboardFull: boolean
  coachAI: boolean
  directorModule: boolean
  discFull: boolean
  // Excedente
  excessPerAnalysis: number // 0 = no excess allowed
  // Búsquedas (legacy compat)
  searchLimit: number
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  free: {
    key: "free",
    name: "Free",
    price: 0,
    priceLabel: "$0",
    seats: 1,
    analysesPerMonth: 10,
    activeProspects: 20,
    agentProspections: 0,
    warmupSequence: false,
    warmupCustom: false,
    aiComments: false,
    linkedinAccounts: 0,
    whatsappMessages: 0,
    voipMinutes: 0,
    videoCalls: false,
    dashboardFull: false,
    coachAI: false,
    directorModule: false,
    discFull: false,
    excessPerAnalysis: 0,
    searchLimit: 20,
  },
  starter: {
    key: "starter",
    name: "Starter",
    price: 397,
    priceLabel: "$397",
    seats: 3,
    analysesPerMonth: 300,
    activeProspects: 500,
    agentProspections: 200,
    warmupSequence: true,
    warmupCustom: false,
    aiComments: true,
    linkedinAccounts: 1,
    whatsappMessages: 500,
    voipMinutes: 60,
    videoCalls: true,
    dashboardFull: true,
    coachAI: true,
    directorModule: false,
    discFull: true,
    excessPerAnalysis: 0.15,
    searchLimit: 500,
  },
  pro: {
    key: "pro",
    name: "Pro",
    price: 797,
    priceLabel: "$797",
    seats: 10,
    analysesPerMonth: 1000,
    activeProspects: 2000,
    agentProspections: 800,
    warmupSequence: true,
    warmupCustom: false,
    aiComments: true,
    linkedinAccounts: 3,
    whatsappMessages: 5000,
    voipMinutes: 300,
    videoCalls: true,
    dashboardFull: true,
    coachAI: true,
    directorModule: true,
    discFull: true,
    excessPerAnalysis: 0.10,
    searchLimit: 2000,
  },
  agency: {
    key: "agency",
    name: "Agency",
    price: 1497,
    priceLabel: "$1.497",
    seats: 0, // unlimited
    analysesPerMonth: 5000,
    activeProspects: 0, // unlimited
    agentProspections: 3000,
    warmupSequence: true,
    warmupCustom: true,
    aiComments: true,
    linkedinAccounts: 10,
    whatsappMessages: 0, // unlimited
    voipMinutes: 1500,
    videoCalls: true,
    dashboardFull: true,
    coachAI: true,
    directorModule: true,
    discFull: true,
    excessPerAnalysis: 0.08,
    searchLimit: 99999,
  },
}

export const PLAN_ORDER: PlanKey[] = ["free", "starter", "pro", "agency"]

export function getPlanConfig(plan: string): PlanConfig {
  return PLANS[plan as PlanKey] || PLANS.free
}

export function getNextPlan(current: string): PlanKey | null {
  const idx = PLAN_ORDER.indexOf(current as PlanKey)
  if (idx === -1 || idx >= PLAN_ORDER.length - 1) return null
  return PLAN_ORDER[idx + 1]
}

export function formatLimit(value: number, unlimitedLabel = "Ilimitado"): string {
  if (value === 0 || value >= 99999) return unlimitedLabel
  return value.toLocaleString("es-AR")
}
