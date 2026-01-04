// app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createAuthClient } from '@/lib/auth/supabaseAuthClientBrowser'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCurator, setIsCurator] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createAuthClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)

      if (session) {
        // Check if user is a curator
        const { data: participant } = await supabase
          .from('participants')
          .select('is_curator')
          .eq('auth_user_id', session.user.id)
          .single() as { data: { is_curator: boolean } | null }

        setIsCurator(participant?.is_curator || false)
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [supabase])

  const handleGetStarted = () => {
    if (isAuthenticated) {
      // Route curators to admin, regular users to dashboard
      router.push(isCurator ? '/admin' : '/dashboard')
    } else {
      router.push('/login')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-xl text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold text-gray-900">Album Club</h1>
        <p className="text-lg text-gray-600">
          Discover new music, share your thoughts, and explore albums together.
        </p>
        <div className="flex flex-col gap-3 mt-8">
          <button
            onClick={handleGetStarted}
            disabled={isLoading}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
          </button>
          {!isAuthenticated && (
            <a
              href="/signup"
              className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 text-center"
            >
              Create an account
            </a>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/reviews"
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Browse reviews
            </a>
            <span className="hidden sm:inline text-gray-400">•</span>
            <a
              href="/submit"
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Submit a review
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
