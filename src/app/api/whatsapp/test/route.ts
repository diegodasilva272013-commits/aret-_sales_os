import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Endpoint de diagnóstico temporal - usa service_role para bypasear RLS
// DELETE THIS AFTER DEBUGGING
let _sb: any
const supabase = new Proxy({} as any, { get(_, p: string) { const c = _sb ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); const v = c[p]; return typeof v === "function" ? v.bind(c) : v } })

export async function GET(req: NextRequest) {
  const prospectId = req.nextUrl.searchParams.get("prospect_id") || "9f7e6374-2af3-4c6e-85b9-528e083728ee"
  const orgId = "41bb4817-72d1-4bf4-89d3-029b094bce39"

  // 1. Query messages with service_role (bypasses RLS)
  const { data: svcMessages, error: svcErr } = await supabase
    .from("whatsapp_messages")
    .select("id, direction, content, status, created_at")
    .eq("prospect_id", prospectId)
    .order("created_at")

  // 2. Query messages for inbox view
  const { data: inboxMessages, error: inboxErr } = await supabase
    .from("whatsapp_messages")
    .select(`id, content, direction, status, created_at, prospect_id,
      prospects!prospect_id(id, full_name, company, whatsapp_number)`)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20)

  // 3. Check table info
  const { data: allMsgs, count } = await supabase
    .from("whatsapp_messages")
    .select("id", { count: "exact", head: true })

  return NextResponse.json({
    test_prospect_messages: {
      count: svcMessages?.length || 0,
      error: svcErr?.message || null,
      messages: svcMessages,
    },
    inbox_query: {
      count: inboxMessages?.length || 0,
      error: inboxErr?.message || null,
      first_3: inboxMessages?.slice(0, 3),
    },
    total_messages_in_db: count,
    env_check: {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      whatsapp_token: !!process.env.WHATSAPP_ACCESS_TOKEN,
      phone_id: process.env.WHATSAPP_PHONE_NUMBER_ID,
    },
  })
}
