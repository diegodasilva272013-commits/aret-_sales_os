import OpenAI from "openai"

const ARETE_CONTEXT = `
Eres un agente de ventas experto de Arete Soluciones.
Arete Soluciones ofrece: soluciones integrales con orquestación de tecnología e IA para empresas.
Implementamos automatizaciones, flujos de trabajo inteligentes, IA aplicada a procesos,
desarrollo a medida de software, ERP, landing pages, páginas web, integraciones entre sistemas.
El objetivo es que las empresas dejen de depender de personas para tareas repetitivas,
ganando tiempo y dinero. Web: https://aretesoluciones.shop

Los prospectos son dueños, CEOs, directores y gerentes de empresas.
Mensajes CORTOS, DIRECTOS, al pain point. El objetivo es conseguir una llamada de 20-30 min.
`

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY no configurada")
  return new OpenAI({ apiKey })
}

type BusinessData = {
  name: string
  category: string
  address: string
  city: string
  country: string
  phone: string
  website: string
  google_rating: number | null
}

// ─── AGENT 1: Enriquecer datos de la empresa via web ───────────────────────
async function enrichBusinessData(openai: OpenAI, business: BusinessData) {
  const response = await openai.responses.create({
    model: "gpt-4o",
    tools: [{ type: "web_search_preview" as "web_search_preview" }],
    input: `Buscá información sobre esta empresa para prospección de ventas B2B:

Empresa: ${business.name}
Rubro: ${business.category}
Ubicación: ${business.city}, ${business.country}
Web: ${business.website || "no disponible"}
Teléfono: ${business.phone || "no disponible"}

Necesito encontrar:
1. Nombre del dueño, CEO o director (decisor principal)
2. Email de contacto de la empresa o del decisor
3. Instagram de la empresa (@handle)
4. LinkedIn de la empresa o del dueño
5. WhatsApp de contacto si está público
6. A qué se dedica exactamente la empresa, cuántos empleados aproximados, mercado que atiende
7. Cualquier noticia, logro o dato reciente relevante

Buscá en su web, redes sociales, Google, directorios de empresas, etc.
Devuelve todo lo que encuentres de forma organizada.`,
  })
  return response.output_text || ""
}

// ─── AGENT 2: Análisis de empresa + perfil del decisor ────────────────────
async function analyzeBusinessAndDecisionMaker(openai: OpenAI, businessData: BusinessData, enrichedData: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `${ARETE_CONTEXT}
Eres un analista B2B experto. Analizás empresas y a sus decisores para identificar oportunidades de venta.`,
      },
      {
        role: "user",
        content: `Analizá esta empresa y su decisor principal para prospección B2B:

EMPRESA: ${businessData.name} - ${businessData.category} - ${businessData.city}, ${businessData.country}
DATOS ENRIQUECIDOS:
${enrichedData}

Devuelve un JSON con:
{
  "contact_name": "nombre del dueño/CEO/director encontrado o vacío",
  "contact_email": "email encontrado o vacío",
  "whatsapp": "número con código de país o vacío",
  "instagram": "@handle o vacío",
  "linkedin_url": "URL o vacío",
  "company_analysis": "qué hace la empresa, tamaño, mercado, oportunidad para Arete",
  "psychological_profile": "perfil del decisor: cómo es, qué lo motiva, cómo toma decisiones",
  "communication_style": "cómo habla esta persona, qué tono usar",
  "pain_points": ["problema 1 que resuelve Arete para esta empresa", "problema 2", "problema 3"],
  "sales_angle": "ángulo de venta específico para esta empresa",
  "key_words": ["palabra que usa el decisor", "término de su industria", "concepto clave"]
}`,
      },
    ],
    response_format: { type: "json_object" },
  })
  return response.choices[0].message.content || "{}"
}

// ─── AGENT 3: Generar mensajes por canal ──────────────────────────────────
async function generateBusinessMessages(openai: OpenAI, businessData: BusinessData, analysis: string) {
  let parsed: Record<string, unknown> = {}
  try { parsed = JSON.parse(analysis) } catch { parsed = {} }
  const contactName = (parsed.contact_name as string) || "el/la responsable"

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `${ARETE_CONTEXT}
Eres el mejor copywriter de mensajes de ventas B2B en español latinoamericano.
Escribís como una persona real. Cada mensaje es diferente según el canal.

REGLAS:
- WhatsApp: corto, informal pero profesional, máx 300 chars, con emoji si aplica
- Email: asunto atractivo + cuerpo de 3-4 líneas, formal pero cercano
- Instagram DM: muy corto, casual, máx 200 chars
- Siempre mencionar algo específico de la empresa que demuestre que la conocemos
- Ir directo al pain point, luego qué hacemos, luego CTA a llamada`,
      },
      {
        role: "user",
        content: `Generá mensajes de prospección para esta empresa:

EMPRESA: ${businessData.name} - ${businessData.category} - ${businessData.city}
CONTACTO: ${contactName}
ANÁLISIS:
${analysis}

Generá un JSON con:
{
  "whatsapp": {
    "inicial": "mensaje WhatsApp inicial (máx 300 chars, menciona algo específico de la empresa)",
    "seguimiento_1": "si no contestó (diferente ángulo, máx 200 chars)",
    "seguimiento_2": "si contestó, avanzar a llamada"
  },
  "email": {
    "asunto_inicial": "asunto del email inicial (corto, llama la atención)",
    "inicial": "cuerpo del email inicial (3-4 líneas, personalizado para esta empresa)",
    "asunto_seguimiento": "asunto del 2do email",
    "seguimiento_1": "2do email si no contestó",
    "seguimiento_2": "email cuando contestó, proponer llamada"
  },
  "instagram": {
    "inicial": "DM de Instagram (muy corto, casual, máx 200 chars)",
    "seguimiento_1": "2do DM si no contestó"
  },
  "general": {
    "seguimiento_breakup": "mensaje final de breakup para cualquier canal (elegante, sin presión)",
    "agendar_llamada": "mensaje para agendar la llamada cuando hay interés"
  },
  "notas_clave": "tips para hablar con el decisor de esta empresa"
}`,
      },
    ],
    response_format: { type: "json_object" },
  })
  return response.choices[0].message.content || "{}"
}

// ─── PIPELINE PRINCIPAL ───────────────────────────────────────────────────
export type BusinessAnalysisResult = {
  enrichedData: string
  contactInfo: {
    contact_name: string
    contact_email: string
    whatsapp: string
    instagram: string
    linkedin_url: string
  }
  analysis: {
    company_analysis: string
    psychological_profile: string
    communication_style: string
    pain_points: string[]
    sales_angle: string
    key_words: string[]
  }
  messages: {
    whatsapp: { inicial: string; seguimiento_1: string; seguimiento_2: string }
    email: { asunto_inicial: string; inicial: string; asunto_seguimiento: string; seguimiento_1: string; seguimiento_2: string }
    instagram: { inicial: string; seguimiento_1: string }
    general: { seguimiento_breakup: string; agendar_llamada: string }
    notas_clave: string
  }
}

export async function runBusinessAnalysisPipeline(business: BusinessData): Promise<BusinessAnalysisResult> {
  const openai = getOpenAI()

  const enrichedData = await enrichBusinessData(openai, business)
  const analysisRaw = await analyzeBusinessAndDecisionMaker(openai, business, enrichedData)
  const messagesRaw = await generateBusinessMessages(openai, business, analysisRaw)

  let analysis: Record<string, unknown> = {}
  let messages: Record<string, unknown> = {}
  try { analysis = JSON.parse(analysisRaw) } catch { analysis = {} }
  try { messages = JSON.parse(messagesRaw) } catch { messages = {} }

  return {
    enrichedData,
    contactInfo: {
      contact_name: (analysis.contact_name as string) || "",
      contact_email: (analysis.contact_email as string) || "",
      whatsapp: (analysis.whatsapp as string) || "",
      instagram: (analysis.instagram as string) || "",
      linkedin_url: (analysis.linkedin_url as string) || "",
    },
    analysis: {
      company_analysis: analysis.company_analysis || "",
      psychological_profile: analysis.psychological_profile || "",
      communication_style: analysis.communication_style || "",
      pain_points: analysis.pain_points || [],
      sales_angle: analysis.sales_angle || "",
      key_words: analysis.key_words || [],
    },
    messages,
  }
}
