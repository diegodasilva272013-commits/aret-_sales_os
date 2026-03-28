import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 })

    const supabase = await createClient()

    // Obtener datos del setter
    const { data: setter } = await supabase
      .from("profiles")
      .select("full_name, email, last_notification_sent_at")
      .eq("id", userId)
      .single()

    if (!setter?.email) return NextResponse.json({ error: "Sin email" })

    // Doble chequeo: no spamear
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    if (setter.last_notification_sent_at && setter.last_notification_sent_at > oneDayAgo) {
      return NextResponse.json({ skipped: true })
    }

    // Obtener prospectos pendientes
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const { data: prospects } = await supabase
      .from("prospects")
      .select("full_name, company, last_contact_at")
      .eq("assigned_to", userId)
      .eq("status", "activo")
      .or(`last_contact_at.lt.${twoDaysAgo},last_contact_at.is.null`)

    if (!prospects?.length) return NextResponse.json({ skipped: true })

    const rows = prospects.map(p => {
      const days = p.last_contact_at
        ? Math.floor((Date.now() - new Date(p.last_contact_at).getTime()) / 86400000)
        : null
      const daysText = days ? `${days} días` : "nunca contactado"
      return `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #222">${p.full_name}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #222;color:#aaa">${p.company || "-"}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #222;color:#ef4444">${daysText}</td>
      </tr>`
    }).join("")

    await transporter.sendMail({
      from: `"Arete Prospector" <${process.env.GMAIL_USER}>`,
      to: setter.email,
      subject: `⚡ ${prospects.length} prospecto${prospects.length > 1 ? "s" : ""} esperando follow-up`,
      html: `
        <div style="font-family:sans-serif;background:#0f0f0f;color:#fff;padding:32px;border-radius:12px;max-width:600px;margin:0 auto">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#6c63ff,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:20px">⚡</div>
            <h1 style="margin:0;font-size:20px">Arete Prospector</h1>
          </div>
          <h2 style="color:#6c63ff;margin-top:0">Hola ${setter.full_name} 👋</h2>
          <p style="color:#aaa">Tenés <strong style="color:#fff">${prospects.length} prospecto${prospects.length > 1 ? "s" : ""}</strong> que llevan más de 48hs sin follow-up:</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <thead>
              <tr style="background:#1a1a2e">
                <th style="padding:10px 8px;text-align:left;color:#6c63ff;font-size:12px;text-transform:uppercase">Nombre</th>
                <th style="padding:10px 8px;text-align:left;color:#6c63ff;font-size:12px;text-transform:uppercase">Empresa</th>
                <th style="padding:10px 8px;text-align:left;color:#6c63ff;font-size:12px;text-transform:uppercase">Sin contacto</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/prospects"
            style="display:inline-block;margin-top:24px;padding:12px 28px;background:#6c63ff;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
            Ver prospectos →
          </a>
          <p style="color:#444;font-size:12px;margin-top:32px">Recibís este email una vez por día mientras tengas pendientes.</p>
        </div>
      `,
    })

    // Actualizar timestamp para no volver a mandar en 24hs
    await supabase
      .from("profiles")
      .update({ last_notification_sent_at: new Date().toISOString() })
      .eq("id", userId)

    return NextResponse.json({ sent: true, count: prospects.length })
  } catch (e) {
    console.error("Notification error:", e)
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}
