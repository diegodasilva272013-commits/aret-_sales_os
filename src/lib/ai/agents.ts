import OpenAI from "openai"

const ARETE_CONTEXT = `
Eres un agente de ventas experto de Arete Soluciones.
Arete Soluciones ofrece: soluciones integrales con orquestación de tecnología e IA para empresas.
Implementamos automatizaciones, flujos de trabajo inteligentes, IA aplicada a procesos,
desarrollo a medida de software, ERP, landing pages, páginas web, integraciones entre sistemas.
El objetivo es que las empresas dejen de depender de personas para tareas repetitivas,
ganando tiempo y dinero. Web: https://aretesoluciones.shop

Los prospectos son CEOs, directores, gerentes generales, jefes y empresarios.
Estos perfiles NO quieren perder tiempo. Los mensajes deben ser cortos, directos, con gancho real.
El objetivo final es llevarlos a una llamada de 20-30 minutos.
`

export type OrgContext = {
  name: string
  company_description: string
  product_service: string
  value_proposition: string
  target_audience: string
  website: string
  message_tone?: string
  message_style?: string
  custom_instructions?: string
}

function buildOrgContext(org?: OrgContext | null): string {
  if (!org || !org.name) return ARETE_CONTEXT
  return `
Eres un agente de ventas experto de ${org.name}.
${org.company_description ? `${org.name}: ${org.company_description}` : ""}
${org.product_service ? `Productos/Servicios: ${org.product_service}` : ""}
${org.value_proposition ? `Propuesta de valor: ${org.value_proposition}` : ""}
${org.website ? `Web: ${org.website}` : ""}

Los prospectos ideales son: ${org.target_audience || "CEOs, directores y gerentes de empresas"}.
Estos perfiles NO quieren perder tiempo. Los mensajes deben ser cortos, directos, con gancho real.
El objetivo final es llevarlos a una llamada de 20-30 minutos.
${org.message_tone ? `\nTono de los mensajes: ${org.message_tone}.` : ""}
${org.message_style ? `Estilo de redacción: ${org.message_style}.` : ""}
${org.custom_instructions ? `\nInstrucciones específicas del equipo:\n${org.custom_instructions}` : ""}
`
}

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY no configurada")
  return new OpenAI({ apiKey })
}

// ─── AGENT 1: Profile Extractor (LinkedIn o Instagram) ─────────────────────
async function extractProfile(openai: OpenAI, profileUrl: string, profileText: string, sourceType: "linkedin" | "instagram" = "linkedin") {
  // Si hay texto pegado manualmente, usarlo directamente
  if (profileText && profileText.trim().length > 50) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: `Organizá esta información del perfil ${sourceType === "instagram" ? "Instagram" : "LinkedIn"} (${profileUrl}) en español:\n\n${profileText}`,
      }],
    })
    return response.choices[0].message.content || ""
  }

  if (sourceType === "instagram") {
    // Instagram: buscar por handle
    const handle = profileUrl.replace(/https?:\/\/(www\.)?instagram\.com\/?/, "").replace(/\//g, "").replace("@", "")
    const response = await openai.responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" as "web_search_preview" }],
      input: `Buscá información sobre esta persona o marca de Instagram: @${handle} (${profileUrl})

Necesito saber:
1. Nombre real o nombre de la cuenta
2. A qué se dedica (persona, marca, empresa)
3. Empresa donde trabaja o qué tipo de negocio tiene
4. Cargo o rol
5. Ubicación si está disponible
6. Cantidad de seguidores aproximada
7. Temática de su contenido (qué postea, sobre qué habla)
8. Cualquier logro, proyecto o dato relevante
9. Si tiene sitio web, LinkedIn u otras redes mencionadas

Buscá en Google, sitios de noticias, su web, etc. Organizá todo en español.`,
    })
    return response.output_text || ""
  }

  // LinkedIn: buscar por URL
  const username = profileUrl.split("/in/")[1]?.replace(/\//g, "") || profileUrl
  const response = await openai.responses.create({
    model: "gpt-4o",
    tools: [{ type: "web_search_preview" as "web_search_preview" }],
    input: `Buscá información sobre esta persona de LinkedIn: ${profileUrl}

Buscá su nombre, empresa, cargo, trayectoria profesional y cualquier información pública disponible sobre "${username}".
Podés buscar en Google, sitios de noticias, su empresa, etc.
Organizá todo lo que encuentres sobre esta persona en español.`,
  })
  return response.output_text || ""
}

// ─── AGENT 2: Psychological Profiler ───────────────────────────────────────
async function buildPsychologicalProfile(openai: OpenAI, profileData: string, ctx: string = ARETE_CONTEXT) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `${ctx}

Eres un psicólogo y analista de comportamiento experto en ventas B2B.
Analiza perfiles de LinkedIn de tomadores de decisión y construye perfiles psicológicos profundos.`,
      },
      {
        role: "user",
        content: `Analiza este perfil de LinkedIn y construye un perfil psicológico completo:

${profileData}

Devuelve un JSON con esta estructura exacta:
{
  "disc_type": "D/I/S/C o combinación (ej: D-I)",
  "disc_description": "descripción del tipo en 2 líneas",
  "communication_style": "cómo habla esta persona, qué palabras usa, cómo se expresa",
  "motivations": ["motivación 1", "motivación 2", "motivación 3"],
  "fears": ["miedo 1", "miedo 2"],
  "key_words": ["palabra clave 1", "palabra que usa", "término que repite"],
  "how_to_approach": "cómo abordar a esta persona específicamente",
  "what_to_avoid": "qué NO decirle o hacer con esta persona",
  "psychological_profile": "párrafo completo del perfil psicológico"
}`,
      },
    ],
    response_format: { type: "json_object" },
  })

  return response.choices[0].message.content || "{}"
}

// ─── AGENT 3: Sales Strategist ─────────────────────────────────────────────
async function buildSalesStrategy(openai: OpenAI, profileData: string, psychProfile: string, ctx: string = ARETE_CONTEXT) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `${ctx}

Eres el mejor estratega de ventas B2B. Tu especialidad es encontrar el ángulo perfecto
para conectar una solución de tecnología e IA con el pain point específico de cada prospecto.`,
      },
      {
        role: "user",
        content: `Basándote en este perfil de LinkedIn y análisis psicológico, construye una estrategia de venta:

PERFIL LINKEDIN:
${profileData}

PERFIL PSICOLÓGICO:
${psychProfile}

Devuelve un JSON con esta estructura:
{
  "company_analysis": "análisis de la empresa del prospecto: sector, tamaño estimado, procesos que probablemente tiene",
  "pain_points": ["pain point principal", "pain point 2", "pain point 3"],
  "sales_angle": "el ángulo de venta principal: qué problema específico de Arete Soluciones resuelve para ESTA persona",
  "hook": "el gancho de apertura más poderoso para este prospecto en 1 línea",
  "value_proposition": "propuesta de valor personalizada para esta persona en 2-3 líneas",
  "objections": ["objeción probable 1 y cómo manejarla", "objeción 2 y respuesta"]
}`,
      },
    ],
    response_format: { type: "json_object" },
  })

  return response.choices[0].message.content || "{}"
}

// ─── AGENT 4: Message Generator ───────────────────────────────────────────
async function generateMessages(
  openai: OpenAI,
  profileData: string,
  psychProfile: string,
  salesStrategy: string,
  prospectName: string,
  sourceType: "linkedin" | "instagram" = "linkedin",
  ctx: string = ARETE_CONTEXT
) {
  const isInstagram = sourceType === "instagram"

  const channelName = isInstagram ? "Instagram DM" : "LinkedIn"
  const charLimit = isInstagram ? "200 caracteres máximo (es un DM, debe ser corto y casual pero profesional)" : "300 caracteres máximo"
  const toneNote = isInstagram
    ? "Tono: casual, cercano, como si siguieras su cuenta hace tiempo. Mencionar algo de su contenido reciente o temática."
    : "Tono: profesional pero humano. Mencionar algo de su empresa o rol."

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `${ctx}

Eres el mejor copywriter de mensajes de prospección en ${channelName} en español latinoamericano.
Escribís como una persona real, no como un vendedor genérico.

REGLAS DE ORO para el mensaje inicial:
1. Mencioná algo MUY ESPECÍFICO del perfil/contenido de la persona
2. Conectá ese dato específico con un problema concreto que probablemente tienen
3. Mencioná brevemente qué hacemos en Arete Soluciones de forma relevante para ELLOS
4. CTA simple: preguntar si le interesa o proponer 15 min
5. ${charLimit}
6. NO empezar con "Hola [nombre]," genérico — arrancá con el hook
7. ${toneNote}

Para los seguimientos: cada uno debe ser diferente, con un ángulo nuevo, nunca repetir lo mismo.`,
      },
      {
        role: "user",
        content: `Generá una secuencia de mensajes para ${channelName} para ${prospectName}.

PERFIL COMPLETO:
${profileData}

ANÁLISIS PSICOLÓGICO:
${psychProfile}

ESTRATEGIA DE VENTA:
${salesStrategy}

IMPORTANTE: El mensaje inicial DEBE mencionar algo específico de su perfil/contenido que demuestre que realmente lo vimos. Usá el hook y el ángulo de venta de la estrategia.

Generá un JSON con esta estructura:
{
  "mensaje_inicial": "mensaje inicial que menciona algo específico de su perfil/empresa + pain point + qué hace Arete + CTA (máx 300 chars)",

  "fase_contacto": {
    "seguimiento_1_sin_respuesta": "diferente ángulo, mencionar un caso de uso o resultado concreto (máx 200 chars)",
    "seguimiento_2_con_respuesta": "si contestó positivamente: avanzar hacia agendar la llamada"
  },

  "fase_venta": {
    "seguimiento_3_sin_respuesta": "aportar valor real: dato, insight o pregunta que les haga pensar (máx 250 chars)",
    "seguimiento_4_sin_respuesta": "caso de uso específico para su industria/rol",
    "seguimiento_5_con_respuesta": "si contestó en cualquier momento: proponer fecha y hora concreta para llamada de 20 min"
  },

  "fase_cierre": {
    "seguimiento_6_breakup": "último mensaje 'breakup', cierra el ciclo con elegancia y sin presión",
    "seguimiento_6_agendar": "si mostró interés, mensaje directo para agendar la llamada"
  },

  "notas_clave": "tips específicos para hablar con esta persona"
}

IMPORTANTE: Los mensajes deben sonar naturales, usar las palabras que usa el prospecto,
no mencionar Arete Soluciones directamente al inicio. Ir al pain point primero.`,
      },
    ],
    response_format: { type: "json_object" },
  })

  return response.choices[0].message.content || "{}"
}

// ─── AGENT 5: Refiner (Quality Loop) ──────────────────────────────────────
async function refineAndValidate(
  openai: OpenAI,
  messages: string,
  psychProfile: string,
  prospectName: string,
  ctx: string = ARETE_CONTEXT
) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `${ctx}

Eres un revisor experto de mensajes de ventas. Tu trabajo es mejorar mensajes
para que sean más efectivos, más naturales y más personalizados.`,
      },
      {
        role: "user",
        content: `Revisa y mejora estos mensajes de prospección para ${prospectName}.

MENSAJES ACTUALES:
${messages}

PERFIL PSICOLÓGICO (para validar tono):
${psychProfile}

Criterios de mejora:
1. ¿El mensaje inicial menciona algo ESPECÍFICO de la empresa o rol del prospecto? Si no, agregarlo. Es lo más importante.
2. ¿El mensaje inicial engancha en las primeras 5 palabras con algo relevante para ellos?
3. ¿Usa el vocabulario y estilo de comunicación del prospecto?
4. ¿Es demasiado largo? Reducir si pasa de 300 chars el inicial.
5. ¿Se siente como spam genérico? Reescribir para que suene humano y personalizado.
6. ¿Hay CTA claro y simple en cada mensaje?
7. ¿El breakup message es elegante, sin presión y deja la puerta abierta?

Devuelve el JSON de mensajes mejorado con la misma estructura, solo cambia lo necesario.
Si algo ya está bien, déjalo igual.`,
      },
    ],
    response_format: { type: "json_object" },
  })

  return response.choices[0].message.content || messages
}

// ─── MAIN PIPELINE ─────────────────────────────────────────────────────────
export type AnalysisResult = {
  rawProfileData: string
  psychologicalProfile: {
    disc_type: string
    disc_description: string
    communication_style: string
    motivations: string[]
    fears: string[]
    key_words: string[]
    how_to_approach: string
    what_to_avoid: string
    psychological_profile: string
  }
  salesStrategy: {
    company_analysis: string
    pain_points: string[]
    sales_angle: string
    hook: string
    value_proposition: string
    objections: string[]
  }
  messages: {
    mensaje_inicial: string
    fase_contacto: {
      seguimiento_1_sin_respuesta: string
      seguimiento_2_con_respuesta: string
    }
    fase_venta: {
      seguimiento_3_sin_respuesta: string
      seguimiento_4_sin_respuesta: string
      seguimiento_5_con_respuesta: string
    }
    fase_cierre: {
      seguimiento_6_breakup: string
      seguimiento_6_agendar: string
    }
    notas_clave: string
  }
  prospectInfo: {
    full_name: string
    headline: string
    company: string
    location: string
  }
}

// Exportar buildOrgContext para usarlo en regenerate
export { buildOrgContext }

// Regenerar solo los mensajes (sin re-analizar el perfil)
export async function regenerateMessagesOnly(
  rawProfileData: string,
  psychProfileRaw: string,
  salesStrategyRaw: string,
  prospectName: string,
  sourceType: "linkedin" | "instagram" = "linkedin",
  orgContext?: OrgContext | null
): Promise<ReturnType<typeof JSON.parse>> {
  const openai = getOpenAI()
  const ctx = buildOrgContext(orgContext)
  const messagesRaw = await generateMessages(openai, rawProfileData, psychProfileRaw, salesStrategyRaw, prospectName, sourceType, ctx)
  const refined = await refineAndValidate(openai, messagesRaw, psychProfileRaw, prospectName, ctx)
  return JSON.parse(refined)
}

export async function runProspectAnalysisPipeline(
  profileUrl: string,
  profileText: string,
  onProgress?: (step: string, pct: number) => void,
  sourceType: "linkedin" | "instagram" = "linkedin",
  orgContext?: OrgContext | null,
  language: string = "es"
): Promise<AnalysisResult> {
  const openai = getOpenAI()
  const channelLabel = sourceType === "instagram" ? "Instagram" : "LinkedIn"
  const langNames: Record<string, string> = { es: "español latinoamericano", en: "English", pt: "português brasileiro" }
  const langInstruction = language !== "es" ? `\n\nIMPORTANTE: Generá todos los mensajes en ${langNames[language] || language}. El análisis psicológico puede estar en español pero los mensajes de prospección deben estar en ${langNames[language] || language}.` : ""
  const ctx = buildOrgContext(orgContext) + langInstruction

  onProgress?.(`Procesando perfil de ${channelLabel}...`, 10)
  const rawProfileData = await extractProfile(openai, profileUrl, profileText, sourceType)

  onProgress?.("Construyendo perfil psicológico...", 35)
  const psychProfileRaw = await buildPsychologicalProfile(openai, rawProfileData, ctx)

  onProgress?.("Desarrollando estrategia de venta...", 55)
  const salesStrategyRaw = await buildSalesStrategy(openai, rawProfileData, psychProfileRaw, ctx)

  // Extract name for messages
  let prospectName = "el prospecto"
  try {
    const nameMatch = rawProfileData.match(/nombre[:\s]+([^\n]+)/i)
    if (nameMatch) prospectName = nameMatch[1].trim().split(" ")[0]
  } catch {}

  onProgress?.("Generando secuencia de mensajes...", 70)
  const messagesRaw = await generateMessages(openai, rawProfileData, psychProfileRaw, salesStrategyRaw, prospectName, sourceType, ctx)

  onProgress?.("Refinando y optimizando mensajes...", 88)
  const refinedMessages = await refineAndValidate(openai, messagesRaw, psychProfileRaw, prospectName, ctx)

  onProgress?.("Extrayendo datos del prospecto...", 95)

  // Extract prospect info from raw data
  let prospectInfo = { full_name: "", headline: "", company: "", location: "" }
  try {
    const extractResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Del siguiente texto de perfil LinkedIn, extrae solo estos datos en JSON:
{"full_name": "...", "headline": "...", "company": "...", "location": "..."}

PERFIL:
${rawProfileData.substring(0, 2000)}`,
        },
      ],
      response_format: { type: "json_object" },
    })
    prospectInfo = JSON.parse(extractResponse.choices[0].message.content || "{}")
  } catch {}

  onProgress?.("¡Análisis completo!", 100)

  return {
    rawProfileData,
    psychologicalProfile: JSON.parse(psychProfileRaw),
    salesStrategy: JSON.parse(salesStrategyRaw),
    messages: JSON.parse(refinedMessages),
    prospectInfo,
  }
}
