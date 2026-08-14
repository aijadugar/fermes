'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.12A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.61H1.26a12 12 0 0 0 0 10.78l4.01-3.12z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.61l4.01 3.12C6.22 6.88 8.87 4.77 12 4.77z"
      />
    </svg>
  )
}

export function GoogleButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      if (next) callbackUrl.searchParams.set('next', next)

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
        },
      })

      if (signInError) {
        setError('Could not start Google sign-in. Please try again.')
        setLoading(false)
      }
    } catch {
      setError('Could not start Google sign-in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="
          inline-flex h-12 w-full items-center justify-center gap-3
          rounded-xl border-2 border-black bg-white
          text-sm font-black
          shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
          transition
          hover:bg-yellow-50
          active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
          disabled:pointer-events-none disabled:opacity-60
        "
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </button>

      {error && (
        <p className="text-xs font-bold text-red-600">{error}</p>
      )}
    </div>
  )
}