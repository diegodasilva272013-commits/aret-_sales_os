import { NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 500 })

  const { text } = (await req.json()) as { text: string }
  if (!text) return NextResponse.json({ error: "No text" }, { status: 400 })

  const openai = new OpenAI({ apiKey })

  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "onyx",
    input: text,
    speed: 1.05,
  })

  const buffer = Buffer.from(await response.arrayBuffer())

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length.toString(),
    },
  })
}
