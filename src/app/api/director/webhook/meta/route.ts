import { NextRequest, NextResponse } from 'next/server'

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'arete_sales_2026'

// GET — Meta verification challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — Incoming messages / events from Meta
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Webhook event received:', JSON.stringify(body, null, 2))

    // TODO: Process incoming WhatsApp messages here

    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
