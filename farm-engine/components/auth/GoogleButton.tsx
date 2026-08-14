'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('OAuth error:', error);
      }
    } catch (err) {
      console.error('Unexpected error during OAuth:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="
        w-full
        rounded-xl
        border-2 border-black
        bg-white
        px-4 py-3
        text-sm font-bold
        shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
        transition
        hover:bg-yellow-50
        disabled:opacity-50
        disabled:cursor-not-allowed
      "
    >
      {loading ? 'Redirecting...' : 'Continue with Google'}
    </button>
  );
}
