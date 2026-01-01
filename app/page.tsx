// app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createAuthClient } from '@/lib/auth/supabaseAuthClientBrowser'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createAuthClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
      setIsLoading(false)
    })
  }, [supabase])

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push('/admin')
    } else {
      router.push('/login')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-gray-50">
      <div className="max-w-xl text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold">Album Club Manager</h1>
        <p className="text-lg text-zinc-400">
          A helper app for selecting albums, generating emails, and reviewing ratings.
        </p>
        <div className="flex flex-col gap-3 mt-8">
          <button
            onClick={handleGetStarted}
            disabled={isLoading}
            className="rounded-lg bg-emerald-500 px-6 py-3 font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
          </button>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/reviews"
              className="text-sm text-zinc-400 hover:text-zinc-300 underline"
            >
              Browse reviews
            </a>
            <span className="hidden sm:inline text-zinc-600">•</span>
            <a
              href="/submit"
              className="text-sm text-zinc-400 hover:text-zinc-300 underline"
            >
              Submit a review
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
