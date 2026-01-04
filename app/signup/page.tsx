'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createAuthClient } from '@/lib/auth/supabaseAuthClientBrowser'

export default function SignUpPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successEmail, setSuccessEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const supabase = createAuthClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage('')

    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage('Please enter your full name.')
      return
    }

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.')
      return
    }

    if (!acceptedTerms) {
      setErrorMessage('You must accept the terms to continue.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          acceptedTerms,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to sign up')
      }

      setSuccessEmail(email.trim())
      toast.success('Check your email for the magic link!')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign up'
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (successEmail) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
            <div className="text-5xl mb-4">🎵</div>
            <h2 className="text-2xl font-bold text-emerald-400 mb-2">
              Check your email
            </h2>
            <p className="text-gray-700 mb-4">
              We sent a magic link to <strong>{successEmail}</strong>
            </p>
            <p className="text-sm text-gray-500">
              Click the link to finish setting up your account.
            </p>
          </div>
          <button
            onClick={() => setSuccessEmail('')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Use a different email
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">
              Album Club
            </p>
            <h1 className="text-4xl font-bold mt-3">Join the weekly listening club.</h1>
            <p className="text-gray-500 mt-3">
              Get curated picks, share your takes, and see how the group scores each
              album.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-zinc-950/60 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">How it works</h2>
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">🎧</span>
                <div>
                  <p className="font-medium">Weekly picks</p>
                  <p className="text-sm text-gray-500">
                    Two albums drop every week: one classic, one contemporary.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">✍️</span>
                <div>
                  <p className="font-medium">Share reviews</p>
                  <p className="text-sm text-gray-500">
                    Rate each album, add a favorite track, and leave a short review.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">💬</span>
                <div>
                  <p className="font-medium">Discuss together</p>
                  <p className="text-sm text-gray-500">
                    See the group averages and catch up on everyone&apos;s takes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm text-zinc-500">
            Already have an account?{' '}
            <a href="/login" className="text-emerald-400 hover:text-emerald-300 underline">
              Log in
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Create your account</h2>
            <p className="text-sm text-gray-500 mt-1">
              We&apos;ll email you a secure magic link to finish signup.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jamie Rivera"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-zinc-50 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-zinc-50 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-gray-500">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-white text-emerald-500 focus:ring-emerald-500"
                required
              />
              <span>
                I agree to the{' '}
                <a href="/terms" className="text-emerald-400 hover:text-emerald-300 underline">
                  Terms
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-emerald-400 hover:text-emerald-300 underline">
                  Privacy Policy
                </a>
                .
              </span>
            </label>

            {errorMessage && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending...' : 'Create account'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
