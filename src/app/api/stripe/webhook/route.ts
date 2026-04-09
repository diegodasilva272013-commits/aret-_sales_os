import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Stripe from "stripe"
import { PLANS } from "@/lib/plans"

let _stripe: Stripe
const stripe = new Proxy({} as Stripe, { get(_, p: string) { const c = _stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" }); const v = (c as any)[p]; return typeof v === "function" ? v.bind(c) : v } })

const PLAN_LIMITS: Record<string, { plan: string; plan_limit: number; search_limit: number }> = {
  [process.env.STRIPE_PRICE_STARTER!]: { plan: "starter", plan_limit: PLANS.starter.analysesPerMonth, search_limit: PLANS.starter.searchLimit },
  [process.env.STRIPE_PRICE_PRO!]:     { plan: "pro",     plan_limit: PLANS.pro.analysesPerMonth,     search_limit: PLANS.pro.searchLimit },
  [process.env.STRIPE_PRICE_AGENCY!]:  { plan: "agency",  plan_limit: PLANS.agency.analysesPerMonth,  search_limit: PLANS.agency.searchLimit },
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Webhook signature inválida" }, { status: 400 })
  }

  const supabase = await createClient()

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const orgId = session.metadata?.org_id
    const subscriptionId = session.subscription as string

    if (orgId && subscriptionId) {
      // Obtener precio del subscription para saber el plan
      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      const priceId = sub.items.data[0]?.price.id
      const planData = PLAN_LIMITS[priceId] || { plan: "starter", plan_limit: PLANS.starter.analysesPerMonth, search_limit: PLANS.starter.searchLimit }

      await supabase.from("organizations").update({
        plan: planData.plan,
        plan_limit: planData.plan_limit,
        search_limit: planData.search_limit,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: priceId,
        analyses_used: 0,
        searches_used: 0,
      }).eq("id", orgId)
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription
    // Bajar a free si cancela
    await supabase.from("organizations").update({
      plan: "free",
      plan_limit: PLANS.free.analysesPerMonth,
      search_limit: PLANS.free.searchLimit,
      stripe_subscription_id: null,
    }).eq("stripe_customer_id", sub.customer as string)
  }

  if (event.type === "invoice.payment_failed") {
    // Podrías mandar un email de aviso acá
  }

  return NextResponse.json({ received: true })
}
