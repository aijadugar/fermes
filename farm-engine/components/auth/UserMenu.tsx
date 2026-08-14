'use client'

import { useEffect, useRef, useState } from 'react'
import { LogOut, Sprout } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toFermesUser, type FermesUser } from '@/lib/auth/types'
import { signOutAction } from '@/lib/auth/actions'

export function UserMenu({
  initialUser = null,
}: {
  initialUser?: FermesUser | null
}) {
  const [user, setUser] = useState<FermesUser | null>(initialUser)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(toFermesUser(data.user))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toFermesUser(session?.user ?? null))
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) {
    return (
      <a
        href="/login"
        className="
          inline-flex items-center rounded-lg border-2 border-black
          bg-yellow-400 px-3 py-2 text-xs font-black
          shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
          transition hover:bg-yellow-500
          active:translate-x-[1px] active:translate-y-[1px] active:shadow-none
        "
      >
        Sign in
      </a>
    )
  }

  const label = user.fullName || user.email || 'Account'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="
          inline-flex items-center gap-2 rounded-full border-2 border-black
          bg-white px-2 py-1.5 text-xs font-bold
          shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
          transition hover:bg-yellow-50
        "
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="size-6 rounded-full border border-black"
          />
        ) : (
          <span className="grid size-6 place-items-center rounded-full border border-black bg-yellow-400">
            <Sprout className="size-3.5" />
          </span>
        )}
        <span className="hidden max-w-[10rem] truncate sm:inline">
          {label}
        </span>
      </button>

      {open && (
        <div
          className="
            absolute right-0 top-[calc(100%+8px)] z-40 w-56
            rounded-xl border-2 border-black bg-white p-2
            shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
          "
        >
          <div className="border-b-2 border-black/10 px-2 pb-2">
            {user.fullName && (
              <div className="truncate text-sm font-black">
                {user.fullName}
              </div>
            )}
            {user.email && (
              <div className="truncate text-xs font-medium text-gray-500">
                {user.email}
              </div>
            )}
          </div>

          <a
            href="/"
            className="
              mt-2 flex items-center gap-2 rounded-lg px-2 py-2
              text-sm font-bold transition hover:bg-yellow-50
            "
          >
            <Sprout className="size-4" />
            Fermes
          </a>

          <form action={signOutAction}>
            <button
              type="submit"
              className="
                flex w-full items-center gap-2 rounded-lg px-2 py-2
                text-left text-sm font-bold text-red-600
                transition hover:bg-red-50
              "
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}