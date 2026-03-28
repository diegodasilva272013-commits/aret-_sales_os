import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function transcribeRecording(recordingUrl: string): Promise<string> {
  try {
    // Twilio requiere auth para descargar el audio
    const auth = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString("base64")

    const audioRes = await fetch(recordingUrl, {
      headers: { Authorization: `Basic ${auth}` },
    })

    if (!audioRes.ok) return ""

    const audioBuffer = await audioRes.arrayBuffer()
    const audioFile = new File([audioBuffer], "recording.mp3", { type: "audio/mpeg" })

    const result = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "es",
    })

    return result.text
  } catch (err) {
    console.error("Transcription error:", err)
    return ""
  }
}

export async function POST(req: NextRequest) {
  try {
    const prospectId = req.nextUrl.searchParams.get("prospectId")
    const userId = req.nextUrl.searchParams.get("userId")
    const orgId = req.nextUrl.searchParams.get("orgId")

    const formData = await req.formData()
    const recordingUrl = formData.get("RecordingUrl")?.toString()
    const callSid = formData.get("CallSid")?.toString() || formData.get("CallSid")?.toString()
    const callDuration = formData.get("RecordingDuration")?.toString() || formData.get("CallDuration")?.toString()
    const callStatus = "completed"

    console.log("🎙️ Recording webhook recibido:", { recordingUrl, callSid, callStatus, callDuration, prospectId })

    if (recordingUrl) {
      const mp3Url = recordingUrl + ".mp3"

      // Insertar grabación primero
      const { data: recording, error: insertError } = await supabase.from("call_recordings").insert({
        prospect_id: prospectId || null,
        organization_id: orgId || null,
        user_id: userId || null,
        call_sid: callSid,
        recording_url: mp3Url,
        duration_seconds: parseInt(callDuration || "0"),
        status: callStatus || "completed",
      }).select("id").single()

      console.log("💾 Insert resultado:", { recording, insertError })

      // Transcribir en background
      transcribeRecording(mp3Url).then(async (transcript) => {
        if (transcript && recording?.id) {
          await supabase.from("call_recordings")
            .update({ transcript })
            .eq("id", recording.id)
        }
      })

      if (prospectId) {
        await supabase.from("prospects")
          .update({ last_contact_at: new Date().toISOString() })
          .eq("id", prospectId)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Recording webhook error:", e)
    return NextResponse.json({ ok: true })
  }
}
