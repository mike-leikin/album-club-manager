'use client'

import { createAuthClient } from '@/lib/auth/supabaseAuthClient'
import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
  const router = useRouter()
  const supabase = createAuthClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-black text-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-zinc-400">
          You don't have permission to access the curator dashboard.
          Only users with curator permissions can access this area.
        </p>
        <div className="flex flex-col gap-3 mt-8">
          <button
            onClick={() => router.push('/')}
            className="rounded-lg border border-zinc-700 px-6 py-3 font-medium transition hover:bg-zinc-900"
          >
            Back to Home
          </button>
          <button
            onClick={handleSignOut}
            className="text-sm text-zinc-400 hover:text-zinc-300 underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  )
}
