"use client"

import { useParams } from "next/navigation"
import VideoRoom from "@/components/VideoRoom"

export default function VideollamadaPage() {
  const { roomId } = useParams<{ roomId: string }>()

  return <VideoRoom roomName={roomId} isProspect={true} />
}
