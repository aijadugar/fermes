import type { User as SupabaseUser } from '@supabase/supabase-js'

export type FermesUser = {
  id: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
}

export type LoginState = {
  status: 'idle' | 'submitting' | 'magic-link-sent' | 'error'
  error: string | null
}

export function toFermesUser(user: SupabaseUser | null): FermesUser | null {
  if (!user) return null

  const meta = user.user_metadata as Record<string, unknown> | undefined

  const fullName =
    (typeof meta?.full_name === 'string' && meta.full_name) ||
    (typeof meta?.name === 'string' && meta.name) ||
    null

  const avatarUrl =
    (typeof meta?.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta?.picture === 'string' && meta.picture) ||
    null

  return {
    id: user.id,
    email: user.email ?? null,
    fullName,
    avatarUrl,
  }
}