import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import SetupWizard from "@/components/SetupWizard"

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, is_owner")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) redirect("/onboarding")

  const orgId = profile.organization_id

  // Check if already completed
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, setup_completed, twilio_account_sid, twilio_auth_token, twilio_phone_number, twilio_api_key, twilio_api_secret, twilio_twiml_app_sid, whatsapp_access_token, whatsapp_phone_number_id, whatsapp_verify_token, calendly_url")
    .eq("id", orgId)
    .single()

  if (org?.setup_completed) redirect("/dashboard")

  // Check existing API keys
  const { data: apiKeys } = await supabase
    .from("org_api_keys")
    .select("openai_key, google_maps_key")
    .eq("organization_id", orgId)
    .single()

  return (
    <SetupWizard
      orgId={orgId}
      orgName={org?.name || ""}
      existingKeys={{
        openai_key: apiKeys?.openai_key || "",
        google_maps_key: apiKeys?.google_maps_key || "",
      }}
      existingIntegrations={{
        twilio_account_sid: org?.twilio_account_sid || "",
        twilio_auth_token: org?.twilio_auth_token || "",
        twilio_phone_number: org?.twilio_phone_number || "",
        twilio_api_key: org?.twilio_api_key || "",
        twilio_api_secret: org?.twilio_api_secret || "",
        twilio_twiml_app_sid: org?.twilio_twiml_app_sid || "",
        whatsapp_access_token: org?.whatsapp_access_token || "",
        whatsapp_phone_number_id: org?.whatsapp_phone_number_id || "",
        whatsapp_verify_token: org?.whatsapp_verify_token || "",
        calendly_url: org?.calendly_url || "",
      }}
    />
  )
}
