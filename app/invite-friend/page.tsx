'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export default function InviteFriendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referrerId = searchParams.get('ref');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [referrer, setReferrer] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'share' | 'signup'>('share');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [signupUrl, setSignupUrl] = useState('');

  useEffect(() => {
    if (!referrerId) {
      setError('Invalid referral link');
      setLoading(false);
      return;
    }

    loadReferrer();
  }, [referrerId]);

  const loadReferrer = async () => {
    try {
      const response = await fetch('/api/invitations/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: referrerId }),
      });

      const data = await response.json();

      if (data.success) {
        setReferrer({
          id: data.referrer_id,
          name: data.referrer_name,
        });
      } else {
        setError(data.error || 'Failed to load referrer information');
      }
    } catch (err) {
      console.error('Error loading referrer:', err);
      setError('Failed to load referral information');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/invitations/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: referrerId,
          invitee_email: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation request');
      }

      toast.success('Invitation request sent! A curator will review it shortly.');
      setEmail('');
    } catch (err) {
      console.error('Invitation request error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const copyShareMessage = () => {
    const message = `Hey! I'm part of a weekly album listening group called Album Club, and I think you'd really enjoy it.

Every week, we listen to two albums together:
- One contemporary release
- One classic from Rolling Stone's 500 Greatest Albums

Then we share quick reviews and favorite tracks. It's a fun way to discover new music and revisit classics.

I'd love for you to join! Here's your personal invite link:
${window.location.href}

Just click that link and enter your email. A curator will approve your invitation, and then you'll start receiving the weekly picks.

Hope to see you in the club!

- ${referrer?.name || 'A friend'}`;

    navigator.clipboard.writeText(message);
    toast.success('Message copied! Forward it to your friend.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-zinc-300">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center px-4">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-red-500/20 bg-zinc-950/80 p-8 text-center">
            <div className="mb-4 text-5xl">❌</div>
            <h1 className="text-2xl font-bold text-white mb-4">Invalid Link</h1>
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
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8">
          <div className="mb-8 text-center">
            <div className="mb-3 text-5xl">🎵</div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Join Album Club
            </h1>
            <p className="text-zinc-400">
              <span className="font-semibold text-emerald-400">{referrer?.name}</span> wants you to join our weekly music listening group
            </p>
          </div>

          <div className="mb-8 rounded-lg bg-zinc-900/50 p-6 border border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">What is Album Club?</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Each week, we listen to two albums together:
            </p>
            <ul className="space-y-2 text-sm text-zinc-400 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span>One contemporary release</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span>One classic from Rolling Stone's 500 Greatest Albums</span>
              </li>
            </ul>
            <p className="text-sm text-zinc-400">
              Then we share quick reviews and favorite tracks. It's a fun way to discover new music and revisit classics.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="mb-6 flex gap-2 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition ${
                mode === 'signup'
                  ? 'bg-emerald-500 text-white'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Request to Join
            </button>
            <button
              onClick={() => setMode('share')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition ${
                mode === 'share'
                  ? 'bg-emerald-500 text-white'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Forward to Friend
            </button>
          </div>

          {mode === 'signup' ? (
            <form onSubmit={handleRequestInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Your Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="rounded-lg bg-zinc-900/50 p-4 border border-zinc-800">
                <p className="text-sm text-zinc-400">
                  <span className="font-semibold text-zinc-300">Next steps:</span> A curator will review your request and send you a signup link when approved.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending Request...' : 'Request Invitation'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-900 p-6 border border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">
                  Share this invitation
                </h3>
                <p className="text-sm text-zinc-400 mb-4">
                  Copy the message below and forward it to your friend via email, text, or any messaging app.
                </p>
                <button
                  onClick={copyShareMessage}
                  className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-600"
                >
                  Copy Invitation Message
                </button>
              </div>

              <div className="rounded-lg bg-zinc-900/50 p-4 border border-zinc-800">
                <p className="text-sm text-zinc-400">
                  Your friend will click this link, enter their email, and a curator will approve their request.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
