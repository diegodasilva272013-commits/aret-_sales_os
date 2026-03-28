import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" })

const PLANS = {
  pro: {
    price_id: process.env.STRIPE_PRICE_PRO!,
    plan: "pro",
    plan_limit: 200,
  },
  agency: {
    price_id: process.env.STRIPE_PRICE_AGENCY!,
    plan: "agency",
    plan_limit: 999,
  },
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { planKey } = await req.json()
  const plan = PLANS[planKey as keyof typeof PLANS]
  if (!plan) return NextResponse.json({ error: "Plan inválido" }, { status: 400 })

  // Obtener org del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, organizations(stripe_customer_id, name)")
    .eq("id", user.id)
    .single()

  const org = (profile?.organizations as { stripe_customer_id?: string; name?: string } | null)
  const orgId = profile?.organization_id

  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 })

  // Crear o recuperar customer de Stripe
  let customerId = org?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org?.name || user.email,
      metadata: { org_id: orgId },
    })
    customerId = customer.id
    await supabase.from("organizations").update({ stripe_customer_id: customerId }).eq("id", orgId)
  }

  // Crear sesión de checkout
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: plan.price_id, quantity: 1 }],
    mode: "subscription",
    success_url: `${req.headers.get("origin")}/settings?upgrade=success`,
    cancel_url: `${req.headers.get("origin")}/settings?upgrade=cancelled`,
    metadata: { org_id: orgId, plan: plan.plan },
  })

  return NextResponse.json({ url: session.url })
}
