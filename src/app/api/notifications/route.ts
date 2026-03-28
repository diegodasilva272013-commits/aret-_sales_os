import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, is_owner")
    .eq("id", user.id)
    .single()

  if (!profile?.is_owner) return NextResponse.json({ error: "Solo owners" }, { status: 403 })

  // Prospectos con follow-up pendiente (activos sin contacto hace +2 días)
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const { data: pending } = await supabase
    .from("prospects")
    .select("full_name, company, status, profiles!assigned_to(full_name, email)")
    .eq("status", "activo")
    .lt("last_contact_at", twoDaysAgo)

  if (!pending?.length) return NextResponse.json({ message: "Sin pendientes" })

  // Agrupar por setter
  const bySetter: Record<string, { email: string; name: string; prospects: typeof pending }> = {}
  for (const p of pending) {
    const setter = p.profiles as any
    if (!setter?.email) continue
    if (!bySetter[setter.email]) {
      bySetter[setter.email] = { email: setter.email, name: setter.full_name, prospects: [] }
    }
    bySetter[setter.email].prospects.push(p)
  }

  // Enviar email a cada setter
  for (const setter of Object.values(bySetter)) {
    const rows = setter.prospects.map(p =>
      `<tr><td style="padding:8px;border-bottom:1px solid #333">${p.full_name}</td><td style="padding:8px;border-bottom:1px solid #333">${p.company || "-"}</td></tr>`
    ).join("")

    await transporter.sendMail({
      from: `"Arete Prospector" <${process.env.GMAIL_USER}>`,
      to: setter.email,
      subject: `⚡ ${setter.prospects.length} prospectos esperando follow-up`,
      html: `
        <div style="font-family:sans-serif;background:#0f0f0f;color:#fff;padding:32px;border-radius:12px;max-width:600px">
          <h2 style="color:#6c63ff">Hola ${setter.name} 👋</h2>
          <p style="color:#aaa">Tenés <strong style="color:#fff">${setter.prospects.length} prospectos</strong> esperando follow-up hace más de 2 días:</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <thead>
              <tr style="background:#1a1a2e">
                <th style="padding:8px;text-align:left;color:#6c63ff">Nombre</th>
                <th style="padding:8px;text-align:left;color:#6c63ff">Empresa</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/prospects" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#6c63ff;color:#fff;text-decoration:none;border-radius:8px">Ver prospectos →</a>
        </div>
      `,
    })
  }

  return NextResponse.json({ sent: Object.keys(bySetter).length })
}
