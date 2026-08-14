'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

export function UserMenu({ user }: { user: User | null }) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (!user) {
    return (
      <a
        href="/login"
        className="
          rounded-lg
          border-2 border-black
          bg-white
          px-3 py-1.5
          text-sm font-bold
          shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
          transition
          hover:bg-yellow-50
        "
      >
        Sign in
      </a>
    );
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'User';

  return (
    <div className="relative group">
      <button
        className="
          flex items-center gap-2
          rounded-lg
          border-2 border-black
          bg-yellow-400
          px-3 py-1.5
          text-sm font-bold
          shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
          transition
          hover:bg-yellow-500
        "
      >
        <span>🌱</span>
        <span className="hidden sm:inline">{displayName}</span>
      </button>

      <div
        className="
          absolute right-0 top-full mt-2 w-48
          rounded-xl
          border-2 border-black
          bg-white
          py-2
          opacity-0
          invisible
          group-hover:opacity-100
          group-hover:visible
          transition
          shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
          z-50
        "
      >
        <div className="px-3 pb-2 border-b border-black/20">
          <div className="text-xs font-bold uppercase tracking-wide">
            {displayName}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {user.email}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="
            w-full text-left
            px-3 py-2
            text-sm font-medium
            hover:bg-yellow-50
          "
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
