import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const { prospectId } = await req.json()
  const supabase = await createClient()
  await supabase.from("prospects").update({ status: "llamada_agendada" }).eq("id", prospectId)
  return NextResponse.json({ success: true })
}
