'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { createAuthClient } from '@/lib/auth/supabaseAuthClientBrowser';

export default function InviteTokenPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`/api/invitations/verify?token=${token}`);
      const data = await response.json();

      if (data.valid && data.invitation) {
        setInvitation(data.invitation);
        setEmail(data.invitation.invitee_email);
        if (data.invitation.invitee_name) {
          setName(data.invitation.invitee_name);
        }
        setError(null);
      } else {
        setError(data.error || 'Invalid invitation link');
      }
    } catch (err) {
      console.error('Error verifying invitation:', err);
      setError('Failed to verify invitation');
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || name.length < 2) {
      toast.error('Please enter your full name');
      return;
    }

    if (!acceptedTerms) {
      toast.error('Please accept the terms and privacy policy');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          acceptedTerms,
          invite_token: token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      toast.success('Check your email for a magic link to complete signup!');
      router.push('/welcome');
    } catch (err) {
      console.error('Signup error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to sign up');
      setSubmitting(false);
    }
  };

  if (loading || verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-zinc-300">Verifying invitation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center px-4">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-red-500/20 bg-zinc-950/80 p-8 text-center">
            <div className="mb-4 text-5xl">❌</div>
            <h1 className="text-2xl font-bold text-white mb-4">Invalid Invitation</h1>
            <p className="text-zinc-400 mb-6">{error}</p>
            <a
              href="/"
              className="inline-block rounded-lg bg-emerald-500 px-6 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
            >
              Go to Homepage
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8">
          <div className="mb-6 text-center">
            <div className="mb-3 text-5xl">🎵</div>
            <h1 className="text-3xl font-bold text-white mb-2">
              You're Invited!
            </h1>
            <p className="text-zinc-400">
              <span className="font-semibold text-emerald-400">{invitation.referrer_name}</span> invited you to join Album Club
            </p>
          </div>

          <div className="mb-6 rounded-lg bg-zinc-900/50 p-4 border border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-100 mb-2">What is Album Club?</h2>
            <p className="text-sm text-zinc-400">
              Each week, we listen to two albums together—one contemporary and one classic from the Rolling Stone 500—and share our thoughts.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Email is pre-filled from your invitation
              </p>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
                className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
              />
              <label htmlFor="terms" className="text-sm text-zinc-400">
                I accept the{' '}
                <a href="/terms" className="text-emerald-400 hover:text-emerald-300 underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-emerald-400 hover:text-emerald-300 underline">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating Account...' : 'Join Album Club'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">
            You'll receive a magic link email to complete signup
          </p>
        </div>
      </div>
    </div>
  );
}
