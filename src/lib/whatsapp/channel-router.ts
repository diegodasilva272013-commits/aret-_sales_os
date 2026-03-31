/**
 * Channel router for WhatsApp Masivo.
 * Routes send requests to either the Baileys microservice or Meta Cloud API
 * depending on the line's channel_type.
 */

export type SendResult = {
  success: boolean
  message_id?: string
  error?: string
}

export type SendPayload = {
  phone: string
  body: string
  media_url?: string
  line: {
    id: string
    channel_type: string
    meta_phone_id?: string | null
    baileys_session?: string | null
  }
  contact?: {
    name?: string | null
    alias?: string | null
  }
}

/**
 * Route a send request to the appropriate channel.
 */
export async function routeChannel(payload: SendPayload): Promise<SendResult> {
  if (payload.line.channel_type === "meta") {
    return sendViaMeta(payload)
  }
  return sendViaBaileys(payload)
}

/**
 * Send a message via Meta Cloud API.
 */
export async function sendViaMeta(payload: SendPayload): Promise<SendResult> {
  const { phone, body, media_url, line } = payload

  const phoneNumberId = line.meta_phone_id || process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0"

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: "Meta API no configurada (WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN faltante)" }
  }

  let msgBody: Record<string, unknown>

  if (media_url) {
    // Image message
    msgBody = {
      messaging_product: "whatsapp",
      to: phone,
      type: "image",
      image: { link: media_url, caption: body },
    }
  } else {
    msgBody = {
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body },
    }
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(msgBody),
        signal: AbortSignal.timeout(15000),
      }
    )

    const data = await res.json() as Record<string, unknown>

    if (!res.ok) {
      const errObj = data.error as Record<string, unknown> | undefined
      return {
        success: false,
        error: (errObj?.message as string) || `Meta API error ${res.status}`,
      }
    }

    const messages = data.messages as Array<{ id: string }> | undefined
    return {
      success: true,
      message_id: messages?.[0]?.id,
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de red enviando via Meta",
    }
  }
}

/**
 * Send a message via Baileys microservice.
 */
export async function sendViaBaileys(payload: SendPayload): Promise<SendResult> {
  const { phone, body, media_url, line } = payload

  const baileysUrl = process.env.BAILEYS_SERVER_URL

  if (!baileysUrl) {
    // Baileys server not configured — simulate for development
    console.log(`[Baileys MOCK] Would send to ${phone}: ${body.slice(0, 60)}...`)
    return {
      success: true,
      message_id: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    }
  }

  try {
    const res = await fetch(`${baileysUrl}/api/send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.BAILEYS_SERVER_SECRET || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: line.baileys_session || line.id,
        phone,
        message: body,
        media_url: media_url || null,
      }),
      signal: AbortSignal.timeout(20000),
    })

    const data = await res.json() as Record<string, unknown>

    if (!res.ok) {
      return {
        success: false,
        error: (data.error as string) || `Baileys server error ${res.status}`,
      }
    }

    return {
      success: true,
      message_id: data.message_id as string | undefined,
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de red enviando via Baileys",
    }
  }
}
