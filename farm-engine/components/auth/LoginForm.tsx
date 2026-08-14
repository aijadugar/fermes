'use client'

import { AlertCircle } from 'lucide-react'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { MagicLinkForm } from '@/components/auth/MagicLinkForm'

export function LoginForm({
  next,
  authError,
}: {
  next?: string
  authError?: boolean
}) {
  return (
    <div
      className="
        w-full max-w-md rounded-2xl border-2 border-black
        bg-[#f7f7f2] p-6 text-black
        shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
        sm:p-8
      "
    >
      <div className="mb-6 flex items-center gap-3">
        <div
          className="
            flex h-12 w-12 shrink-0 items-center justify-center
            overflow-hidden rounded-full
            border-2 border-black bg-yellow-400
            shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
          "
        >
          <img
            src="/fermes.png"
            alt="Fermes"
            className="h-12 w-12 rounded-full object-cover"
          />
        </div>

        <div>
          <div className="text-xl font-black uppercase tracking-tight text-black">
            Fermes
          </div>

          <p className="text-sm font-semibold text-black/70">
            Farm intelligence starts here.
          </p>
        </div>
      </div>

      {authError && (
        <div
          className="
            mb-5 flex items-start gap-2 rounded-xl
            border-2 border-red-700
            bg-red-50 p-3 text-sm font-bold text-red-800
          "
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />

          <span>
            We couldn&apos;t complete sign-in. Please try again.
          </span>
        </div>
      )}

      <GoogleButton next={next} />

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-black/30" />

        <span className="text-xs font-black uppercase tracking-widest text-black/60">
          or
        </span>

        <div className="h-px flex-1 bg-black/30" />
      </div>

      <MagicLinkForm next={next} />
    </div>
  )
}