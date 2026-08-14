'use client'

import { useState } from 'react'
import { Loader2, Mail, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { LoginState } from '@/lib/auth/types'

export function MagicLinkForm({ next }: { next?: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<LoginState>({
    status: 'idle',
    error: null,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || state.status === 'submitting') return

    setState({ status: 'submitting', error: null })

    try {
      const supabase = createClient()
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      if (next) callbackUrl.searchParams.set('next', next)

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      })

      if (error) {
        setState({
          status: 'error',
          error: "We couldn't send the link. Please try again.",
        })
        return
      }

      setState({ status: 'magic-link-sent', error: null })
    } catch {
      setState({
        status: 'error',
        error: "We couldn't send the link. Please try again.",
      })
    }
  }

  if (state.status === 'magic-link-sent') {
    return (
      <div
        className="
          rounded-xl border-2 border-black bg-yellow-50 p-4
          text-sm font-bold
        "
      >
        Check your email.
        <p className="mt-1 font-medium text-gray-600">
          We&apos;ve sent a secure sign-in link to {email}.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-2 text-sm font-bold">
        <span className="uppercase tracking-wide">Email</span>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={state.status === 'submitting'}
            className="
              h-12 w-full rounded-xl border-2 border-black bg-white
              pl-11 pr-4 text-sm font-medium outline-none transition
              placeholder:text-gray-400
              focus:bg-yellow-50 focus:ring-2 focus:ring-yellow-400
              disabled:bg-gray-100
            "
          />
        </div>
      </label>

      {state.status === 'error' && state.error && (
        <p className="text-xs font-bold text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={state.status === 'submitting' || !email.trim()}
        className="
          inline-flex h-12 w-full items-center justify-center gap-2
          rounded-xl border-2 border-black bg-yellow-400
          text-sm font-black
          shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
          transition
          hover:bg-yellow-500
          active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
          disabled:pointer-events-none disabled:opacity-50
        "
      >
        {state.status === 'submitting' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Send magic link
      </button>
    </form>
  )
}