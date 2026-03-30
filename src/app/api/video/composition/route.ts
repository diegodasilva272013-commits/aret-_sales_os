import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import twilio from "twilio"
import OpenAI from "openai"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)

async function transcribeTrack(recordingUrl: string, participantIdentity: string): Promise<string> {
  try {
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")
    const res = await fetch(`${recordingUrl}.mp3`, { headers: { Authorization: `Basic ${auth}` } })
    if (!res.ok) return ""
    const buffer = await res.arrayBuffer()
    const file = new File([buffer], "audio.mp3", { type: "audio/mpeg" })
    const result = await openai.audio.transcriptions.create({ file, model: "whisper-1", language: "es" })
    return result.text ? `[${participantIdentity}]: ${result.text}` : ""
  } catch (err) {
    console.error("Transcription error for", participantIdentity, err)
    return ""
  }
}

export async function POST(req: NextRequest) {
  try {
    const prospectId = req.nextUrl.searchParams.get("prospectId")
    const orgId = req.nextUrl.searchParams.get("orgId")

    const formData = await req.formData()
    const statusEvent = formData.get("StatusCallbackEvent")?.toString()
    const roomSid = formData.get("RoomSid")?.toString()
    const roomName = formData.get("RoomName")?.toString()

    console.log("📹 Video webhook:", statusEvent, roomName)

    if (statusEvent === "room-ended" && roomSid) {
      // Esperar un poco para que Twilio termine de procesar las grabaciones
      await new Promise(r => setTimeout(r, 3000))

      // Obtener grabaciones individuales por participante
      const recordings = await client.video.v1.rooms(roomSid).recordings.list()
      console.log(`📹 Recordings encontradas: ${recordings.length}`)

      // Crear composición de video para reproducción
      let compositionSid = ""
      try {
        const host = req.headers.get("host") || ""
        const cbProtocol = host.includes("localhost") ? "http" : "https"
        const cbUrl = `${cbProtocol}://${host}`
        const composition = await client.video.v1.compositions.create({
          roomSid,
          audioSources: ["*"],
          videoLayout: { grid: { video_sources: ["*"] } },
          statusCallback: `${cbUrl}/api/video/composition-ready`,
          statusCallbackMethod: "POST",
          format: "mp4",
        })
        compositionSid = composition.sid
        console.log("📹 Composición creada:", compositionSid)
      } catch (err) {
        console.error("Error creando composición:", err)
      }

      // Insertar en DB con status processing
      const { data: videoRecording } = await supabase.from("video_recordings").insert({
        room_name: roomName,
        room_sid: roomSid,
        prospect_id: prospectId || null,
        organization_id: orgId || null,
        composition_sid: compositionSid || null,
        status: "transcribing",
      }).select("id").single()

      // Transcribir cada pista de audio por separado (diarización)
      if (videoRecording?.id && recordings.length > 0) {
        const audioRecordings = recordings.filter(r => r.kind === "audio")
        console.log(`📹 Audio tracks: ${audioRecordings.length}`)

        if (audioRecordings.length > 0) {
          const transcripts = await Promise.all(
            audioRecordings.map(r => {
              const url = `https://video.twilio.com/v1/Rooms/${roomSid}/Recordings/${r.sid}/Media`
              const identity = (r as any).participantSid || r.sid
              return transcribeTrack(url, identity)
            })
          )

          // Buscar nombre real del participante
          const participants = await client.video.v1.rooms(roomSid).participants.list()
          const sidToName: Record<string, string> = {}
          for (const p of participants) sidToName[p.sid] = p.identity

          // Reemplazar SIDs por nombres
          const labeledTranscripts = transcripts.map(t => {
            return t.replace(/\[([^\]]+)\]/g, (_, sid) => `[${sidToName[sid] || sid}]`)
          })

          const fullTranscript = labeledTranscripts.filter(Boolean).join("\n\n")

          await supabase.from("video_recordings")
            .update({ transcript: fullTranscript || null, status: compositionSid ? "processing" : "completed" })
            .eq("id", videoRecording.id)
        } else {
          // No hay audio tracks separados, marcar para procesar con composición
          await supabase.from("video_recordings")
            .update({ status: compositionSid ? "processing" : "completed" })
            .eq("id", videoRecording.id)
        }

        if (prospectId) {
          await supabase.from("prospects")
            .update({ last_contact_at: new Date().toISOString() })
            .eq("id", prospectId)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Composition webhook error:", err)
    return NextResponse.json({ ok: true })
  }
}
