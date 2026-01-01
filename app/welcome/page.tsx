'use client'

import Link from 'next/link'

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-black text-gray-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full space-y-6 text-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Album Club</h1>
          <p className="text-zinc-400">
            You&apos;re in! Head to your dashboard to see the latest picks and
            submit your first reviews.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="rounded-lg bg-emerald-500 px-6 py-3 font-medium text-white transition hover:bg-emerald-600"
          >
            Go to dashboard
          </Link>
          <Link
            href="/submit"
            className="rounded-lg border border-zinc-700 px-6 py-3 font-medium text-zinc-200 transition hover:border-zinc-500"
          >
            Submit a review
          </Link>
        </div>
      </div>
    </main>
  )
}
