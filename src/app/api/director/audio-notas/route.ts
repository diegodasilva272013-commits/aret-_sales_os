import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function getAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/director/audio-notas?entidad_tipo=brief&entidad_id=uuid
export async function GET(req: NextRequest) {
  // DB-ADAPT: await createClient() (async server client)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const entidad_tipo = searchParams.get('entidad_tipo')
  const entidad_id = searchParams.get('entidad_id')

  if (!entidad_tipo || !entidad_id) {
    return NextResponse.json({ error: 'Missing entidad_tipo or entidad_id' }, { status: 400 })
  }

  const admin = getAdmin()
  const { data, error } = await admin
    .from('audio_notas')
    .select('*, profiles:usuario_id(full_name)')
    .eq('entidad_tipo', entidad_tipo)
    .eq('entidad_id', entidad_id)
    .order('creado_en', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate signed URLs for storage-based audio
  const notasWithUrls = await Promise.all((data || []).map(async (nota) => {
    if (nota.audio_url && nota.audio_url.startsWith('storage:')) {
      const path = nota.audio_url.replace('storage:', '')
      const { data: signedData } = await admin.storage
        .from('audio-notas')
        .createSignedUrl(path, 3600)
      return { ...nota, audio_playback_url: signedData?.signedUrl || null }
    }
    return { ...nota, audio_playback_url: nota.audio_url }
  }))

  return NextResponse.json(notasWithUrls)
}

// POST /api/director/audio-notas (FormData: audio file + metadata)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const audioFile = formData.get('audio') as File | null
  const entidad_tipo = formData.get('entidad_tipo') as string
  const entidad_id = formData.get('entidad_id') as string
  const titulo = (formData.get('titulo') as string) || ''
  const duracion = parseInt(formData.get('duracion') as string) || 0
  const transcripcion = (formData.get('transcripcion') as string) || ''

  if (!audioFile || !entidad_tipo || !entidad_id) {
    return NextResponse.json({ error: 'Missing audio, entidad_tipo or entidad_id' }, { status: 400 })
  }

  const admin = getAdmin()
  const arrayBuffer = await audioFile.arrayBuffer()
  let audio_url: string

  // Try Supabase Storage first, fallback to base64
  try {
    const filename = `${entidad_tipo}/${entidad_id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.webm`
    const { error: uploadError } = await admin.storage
      .from('audio-notas')
      .upload(filename, arrayBuffer, {
        contentType: audioFile.type || 'audio/webm',
        upsert: false,
      })

    if (uploadError) throw uploadError
    audio_url = `storage:${filename}`
  } catch {
    // Fallback: store as base64 data URL
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    audio_url = `data:${audioFile.type || 'audio/webm'};base64,${base64}`
  }

  const { data, error } = await admin
    .from('audio_notas')
    .insert({
      entidad_tipo,
      entidad_id,
      audio_url,
      duracion_segundos: duracion,
      titulo,
      transcripcion,
      usuario_id: user.id,
    })
    .select('*, profiles:usuario_id(full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return with playback URL
  let audio_playback_url = audio_url
  if (audio_url.startsWith('storage:')) {
    const path = audio_url.replace('storage:', '')
    const { data: signedData } = await admin.storage
      .from('audio-notas')
      .createSignedUrl(path, 3600)
    audio_playback_url = signedData?.signedUrl || audio_url
  }

  return NextResponse.json({ ...data, audio_playback_url })
}

// PUT /api/director/audio-notas (JSON: { id, transcripcion?, titulo? })
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, transcripcion, titulo } = body

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = getAdmin()
  const updateData: Record<string, unknown> = { actualizado_en: new Date().toISOString() }
  if (transcripcion !== undefined) updateData.transcripcion = transcripcion
  if (titulo !== undefined) updateData.titulo = titulo

  const { data, error } = await admin
    .from('audio_notas')
    .update(updateData)
    .eq('id', id)
    .select('*, profiles:usuario_id(full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/director/audio-notas?id=uuid
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = getAdmin()

  // Get record to delete from storage
  const { data: note } = await admin
    .from('audio_notas')
    .select('audio_url')
    .eq('id', id)
    .single()

  // Delete from storage if applicable
  if (note?.audio_url?.startsWith('storage:')) {
    const path = note.audio_url.replace('storage:', '')
    await admin.storage.from('audio-notas').remove([path])
  }

  const { error } = await admin
    .from('audio_notas')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
