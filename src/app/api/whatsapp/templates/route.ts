/**
 * GET /api/whatsapp/templates
 * Fetches approved WhatsApp message templates from Meta Cloud API.
 * Used in the Campaign Builder to let users select a template for cold outreach
 * (bypasses the 24h conversation window restriction).
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const wabaId = process.env.WHATSAPP_WABA_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID

  if (!accessToken || !wabaId) {
    return NextResponse.json({
      templates: [],
      warning: "WHATSAPP_ACCESS_TOKEN o WHATSAPP_WABA_ID no configurados en .env",
    })
  }

  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0"

  try {
    const res = await fetch(
      `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?fields=name,status,language,components,category&limit=100`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } }
      return NextResponse.json(
        { error: err.error?.message || `Meta API error ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json() as {
      data: Array<{
        id: string
        name: string
        status: string
        language: string
        category: string
        components: Array<{
          type: string
          text?: string
          format?: string
          buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>
        }>
      }>
    }

    // Only return APPROVED templates
    const approved = (data.data || []).filter(t => t.status === "APPROVED")

    // Parse body text and detect if it has variables ({{1}}, {{2}}, etc.)
    const parsed = approved.map(t => {
      const bodyComponent = t.components.find(c => c.type === "BODY")
      const headerComponent = t.components.find(c => c.type === "HEADER")
      const buttonsComponent = t.components.find(c => c.type === "BUTTONS")

      const bodyText = bodyComponent?.text || ""
      const variableCount = (bodyText.match(/\{\{(\d+)\}\}/g) || []).length

      return {
        id: t.id,
        name: t.name,
        language: t.language,
        category: t.category,
        body: bodyText,
        header: headerComponent?.text || null,
        header_format: headerComponent?.format || null,
        has_buttons: !!buttonsComponent,
        variable_count: variableCount,
      }
    })

    return NextResponse.json({ templates: parsed })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al conectar con Meta API" },
      { status: 500 }
    )
  }
}
