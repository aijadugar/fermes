import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeNext } from '@/lib/auth/sanitize-next'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const searchParams = url.searchParams

  const code = searchParams.get('code')
  const next = sanitizeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const forwardedProto =
        request.headers.get('x-forwarded-proto') || 'https'

      const origin = forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : url.origin

      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error(
      'Supabase exchangeCodeForSession failed:',
      error.message
    )
  }

  return NextResponse.redirect('/login?error=auth')
}