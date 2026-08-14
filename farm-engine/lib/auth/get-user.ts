import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { toFermesUser, type FermesUser } from '@/lib/auth/types'

export async function getCurrentUser(): Promise<FermesUser | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return toFermesUser(user)
}