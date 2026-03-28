import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const params = new URLSearchParams(body)
  const to = params.get("To") || req.nextUrl.searchParams.get("to") || ""
  console.log("📞 TwiML llamado - To:", to, "Params:", body.substring(0, 200))

  const twiml = new twilio.twiml.VoiceResponse()

  if (to) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const prospectId = params.get("prospectId") || ""
    const userId = params.get("userId") || ""
    const orgId = params.get("orgId") || ""

    const dial = twiml.dial({
      callerId: process.env.TWILIO_PHONE_NUMBER!,
      record: "record-from-answer",
      trim: "trim-silence",
      recordingStatusCallback: `${appUrl}/api/calls/recording?prospectId=${prospectId}&userId=${userId}&orgId=${orgId}`,
      recordingStatusCallbackMethod: "POST",
    })
    dial.number(to)
  } else {
    twiml.say({ language: "es-AR" }, "No se especificó número destino.")
  }

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
