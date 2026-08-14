import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function sanitizeNext(next: string | null): string {
  if (!next) return '/'
  if (!next.startsWith('/')) return '/'
  if (next.startsWith('//')) return '/'
  if (next.includes('\\')) return '/'
  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const next = sanitizeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('Supabase exchangeCodeForSession failed:', error.message)
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}