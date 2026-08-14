'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function MagicLinkForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('Magic link error:', error);
      } else {
        setSent(true);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div
        className="
          rounded-xl
          border-2 border-black
          bg-yellow-50
          p-4
          text-sm font-medium
        "
      >
        <strong className="font-bold">Check your email.</strong>
        <br />
        We&apos;ve sent you a secure sign-in link.
      </div>
    );
  }

  return (
    <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-bold">
        <span className="uppercase tracking-wide">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          disabled={loading}
          className="
            h-12
            rounded-xl
            border-2 border-black
            bg-white
            px-4
            text-sm font-medium
            outline-none
            transition
            placeholder:text-gray-400
            focus:bg-yellow-50
            focus:ring-2
            focus:ring-yellow-400
            disabled:opacity-50
          "
        />
      </label>

      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="
          w-full
          rounded-xl
          border-2 border-black
          bg-black
          px-4 py-3
          text-sm font-bold
          text-white
          shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
          transition
          hover:bg-gray-800
          disabled:opacity-50
          disabled:cursor-not-allowed
        "
      >
        {loading ? 'Sending...' : 'Send magic link'}
      </button>
    </form>
  );
}
