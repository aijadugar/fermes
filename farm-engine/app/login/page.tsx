'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import GoogleButton from '@/components/auth/GoogleButton';
import MagicLinkForm from '@/components/auth/MagicLinkForm';
import type { User } from '@supabase/supabase-js';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const errorParam = searchParams.get('error');

  useEffect(() => {
    // Check if user is already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Redirect authenticated users to dashboard
        router.push('/dashboard');
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        router.push('/dashboard');
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-lg font-bold">Loading...</div>
      </div>
    );
  }

  // Should not render if redirecting
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href="/" className="text-xl font-black uppercase tracking-tight">
            Fermes
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
        <div
          className="
            rounded-2xl
            border-2 border-black
            bg-white
            p-8
            shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
          "
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Fermes
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-600">
              Farm intelligence starts here.
            </p>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Sign in to continue to Fermes.
            </p>
          </div>

          {errorParam && (
            <div
              className="
                mb-6
                rounded-xl
                border-2 border-black
                bg-red-50
                p-4
                text-sm font-medium
              "
            >
              <strong className="font-bold">We couldn&apos;t complete sign-in.</strong>
              <br />
              Please try again.
            </div>
          )}

          <div className="space-y-6">
            <GoogleButton />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500 font-bold">
                  or
                </span>
              </div>
            </div>

            <MagicLinkForm />
          </div>

          <div className="mt-8 text-center">
            <a
              href="/"
              className="
                inline-flex items-center gap-2
                text-sm font-medium
                text-gray-600
                hover:text-black
              "
            >
              ← Back to Fermes
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
