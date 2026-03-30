import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // Verificar límite de búsquedas
  const { data: profile } = await supabase.from("profiles").select("organization_id, organizations(searches_used, search_limit)").eq("id", user.id).single()
  const org = profile?.organizations as { searches_used?: number; search_limit?: number } | null
  if (org && typeof org.searches_used === "number" && typeof org.search_limit === "number") {
    if (org.searches_used >= org.search_limit) {
      return NextResponse.json({ error: "Límite de búsquedas alcanzado para tu plan. Actualizá tu plan para buscar más empresas." }, { status: 403 })
    }
  }

  const { query, location, country, pageToken, excludeIds = [] } = await req.json()
  if (!query || !location) return NextResponse.json({ error: "Tipo de empresa y ubicación requeridos" }, { status: 400 })

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Google Maps API key no configurada" }, { status: 500 })

  const searchQuery = `${query} en ${location}, ${country || ""}`

  const requestBody: Record<string, unknown> = {
    textQuery: searchQuery,
    languageCode: "es",
    maxResultCount: 20,
  }
  if (pageToken) requestBody.pageToken = pageToken

  const placesRes = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.types,places.googleMapsUri,nextPageToken",
      },
      body: JSON.stringify(requestBody),
    }
  )

  const placesData = await placesRes.json()

  console.log("[BUSINESS SEARCH] Query:", searchQuery, "Status:", placesRes.status, "Results:", placesData.places?.length || 0)

  if (!placesRes.ok) {
    console.error("[BUSINESS SEARCH] Error:", JSON.stringify(placesData.error))
    return NextResponse.json({ error: `Google Places error: ${placesData.error?.message || placesRes.status}` }, { status: 500 })
  }

  const results: Record<string, unknown>[] = placesData.places || []

  // Filtrar los que ya se mostraron antes
  const excludeSet = new Set(excludeIds as string[])
  const businesses = results
    .filter(place => !excludeSet.has(place.id as string))
    .map((place) => ({
      place_id: (place.id as string) || "",
      name: (place.displayName as { text?: string })?.text || "",
      address: (place.formattedAddress as string) || "",
      phone: (place.nationalPhoneNumber as string) || "",
      website: (place.websiteUri as string) || "",
      google_maps_url: (place.googleMapsUri as string) || "",
      google_rating: (place.rating as number) || null,
      category: ((place.types as string[]) || [])[0]?.replace(/_/g, " ") || query,
      city: location,
      country: country || "",
    }))

  // Incrementar uso de búsquedas
  if (profile?.organization_id) {
    await supabase.rpc("increment_searches_used", { org_id: profile.organization_id }).catch(() => {})
  }

  return NextResponse.json({
    businesses,
    total: businesses.length,
    nextPageToken: placesData.nextPageToken || null,
  })
}
