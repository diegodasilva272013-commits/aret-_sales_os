import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseCSV, normalizePhone } from "@/lib/whatsapp/csv-parser"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "Sin organización" }, { status: 400 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 })

  const text = await file.text()
  if (!text.trim()) return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 })

  const { rows, headers } = parseCSV(text)

  if (rows.length === 0) {
    return NextResponse.json({ error: "El CSV no contiene filas de datos", imported: 0 })
  }

  // Detect column indices for phone, name, alias
  const phoneIdx = headers.findIndex(h => /phone|telefono|teléfono|numero|número|celular|movil|móvil/i.test(h))
  const nameIdx  = headers.findIndex(h => /name|nombre/i.test(h))
  const aliasIdx = headers.findIndex(h => /alias|apodo/i.test(h))

  // If no phone header found, assume first column is phone
  const resolvedPhoneIdx = phoneIdx >= 0 ? phoneIdx : 0

  const contacts: { organization_id: string; phone: string; name: string | null; alias: string | null; source: string }[] = []

  for (const row of rows) {
    const rawPhone = row[resolvedPhoneIdx]?.trim()
    if (!rawPhone) continue

    const phone = normalizePhone(rawPhone)
    if (!phone) continue

    contacts.push({
      organization_id: profile.organization_id,
      phone,
      name: nameIdx >= 0 ? (row[nameIdx]?.trim() || null) : null,
      alias: aliasIdx >= 0 ? (row[aliasIdx]?.trim() || null) : null,
      source: "csv",
    })
  }

  if (contacts.length === 0) {
    return NextResponse.json({ error: "No se encontraron números de teléfono válidos en el CSV", imported: 0 })
  }

  // Batch upsert in chunks of 500 to avoid payload limits
  let imported = 0
  const chunkSize = 500

  for (let i = 0; i < contacts.length; i += chunkSize) {
    const chunk = contacts.slice(i, i + chunkSize)
    const { error, count } = await supabase
      .from("wa_contacts")
      .upsert(chunk, { onConflict: "organization_id,phone", ignoreDuplicates: false })
      .select("id", { count: "exact", head: true })

    if (error) {
      console.error("[contacts/import] Upsert error:", error)
      return NextResponse.json({ error: error.message, imported }, { status: 500 })
    }

    imported += count || chunk.length
  }

  return NextResponse.json({ imported, total: contacts.length })
}
