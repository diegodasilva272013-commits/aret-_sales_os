import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const url = new URL(req.url)
  const lineId = url.searchParams.get("line_id")
  if (!lineId) return NextResponse.json({ error: "line_id requerido" }, { status: 400 })

  const baileysUrl = process.env.BAILEYS_SERVER_URL

  // If Baileys server is not configured, return a placeholder response
  if (!baileysUrl) {
    return NextResponse.json({
      placeholder: true,
      qr: null,
      connected: false,
      message: "Servidor Baileys no configurado. Configura BAILEYS_SERVER_URL para habilitar la vinculación por QR.",
    })
  }

  // Proxy to the Baileys microservice
  try {
    const res = await fetch(`${baileysUrl}/api/qr?session=${lineId}`, {
      headers: { "Authorization": `Bearer ${process.env.BAILEYS_SERVER_SECRET || ""}` },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Error en el servidor Baileys", placeholder: false }, { status: res.status })
    }

    const data = await res.json()

    // If now connected, update line status in DB
    if (data.connected) {
      await supabase
        .from("wa_lines")
        .update({ status: "ready", updated_at: new Date().toISOString() })
        .eq("id", lineId)
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: `No se pudo contactar el servidor Baileys: ${message}`, placeholder: false }, { status: 503 })
  }
}
