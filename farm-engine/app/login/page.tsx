import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-user'
import { LoginForm } from '@/components/auth/LoginForm'
import { sanitizeNext } from '@/lib/auth/sanitize-next'

export const metadata = {
  title: 'Sign in | Fermes',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const params = await searchParams

  const user = await getCurrentUser()
  if (user) {
    redirect(sanitizeNext(params.next))
  }

  return (
    <main
      className="
        flex min-h-screen items-center justify-center
        bg-[#f8fafc] px-4 py-12
      "
    >
      <LoginForm next={params.next} authError={params.error === 'auth'} />
    </main>
  )
}