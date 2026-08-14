'use client'

import { AlertCircle, Sprout } from 'lucide-react'
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
        w-full max-w-md rounded-2xl border-2 border-black bg-white p-6
        shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
        sm:p-8
      "
        >
            <div className="mb-6 flex items-center gap-3">
                <div
                    className="
            flex h-12 w-12 shrink-0 items-center justify-center
            rounded-xl border-2 border-black bg-yellow-400
            shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
          "
                >
                    <Sprout className="size-6" />
                </div>
                <div>
                    <div className="text-xl font-black uppercase tracking-tight">
                        Fermes
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                        Farm intelligence starts here.
                    </p>
                </div>
            </div>

            <p className="mb-6 text-sm font-bold">
                Sign in to continue to Fermes.
            </p>

            {authError && (
                <div
                    className="
            mb-5 flex items-start gap-2 rounded-xl border-2 border-red-600
            bg-red-50 p-3 text-sm font-bold text-red-700
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
                <div className="h-px flex-1 bg-black/20" />
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                    or
                </span>
                <div className="h-px flex-1 bg-black/20" />
            </div>

            <MagicLinkForm next={next} />

        <a
            href="/"
            className="
            mt-6 block text-center text-xs font-bold text-gray-500
            transition hover:text-black
            "
      >
            Back to Fermes
        </a>
    </div >
  )
}