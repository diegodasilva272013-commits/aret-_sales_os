import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FacturacionClient from '@/components/director/FacturacionClient'

export default async function DirectorFacturacionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_owner')
    .eq('id', user.id)
    .single()

  if (!profile?.is_owner) redirect('/dashboard')

  return <FacturacionClient />
}
