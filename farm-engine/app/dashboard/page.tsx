import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href="/" className="text-xl font-black uppercase tracking-tight">
            Fermes
          </a>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600">
              Welcome, {user.email?.split('@')[0] || 'User'}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
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
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Dashboard
        </h1>
        <p className="mt-2 text-sm font-medium text-gray-600">
          You are signed in as {user.email}
        </p>

        <div
          className="
            mt-8
            rounded-2xl
            border-2 border-black
            bg-white
            p-8
            shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
          "
        >
          <h2 className="text-xl font-black uppercase tracking-tight">
            Protected Content
          </h2>
          <p className="mt-2 text-sm font-medium text-gray-600">
            This page is only visible to authenticated users.
          </p>
        </div>
      </main>
    </div>
  );
}
