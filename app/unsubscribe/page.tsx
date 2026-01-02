'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [isResubscribing, setIsResubscribing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid unsubscribe link. No token provided.');
      return;
    }

    // Auto-unsubscribe on page load
    handleUnsubscribe();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;

    setStatus('loading');
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, resubscribe: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsubscribe');
      }

      setStatus('success');
      setMessage(data.message);
      setUserName(data.name);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to unsubscribe');
    }
  };

  const handleResubscribe = async () => {
    if (!token) return;

    setIsResubscribing(true);
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, resubscribe: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resubscribe');
      }

      setMessage(data.message);
      setUserName(data.name);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to resubscribe');
    } finally {
      setIsResubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-white">Album Club</h1>
            <p className="mt-2 text-zinc-400">Email Preferences</p>
          </div>

          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-zinc-700 border-t-emerald-500"></div>
              <p className="text-zinc-300">Processing your request...</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                <p className="text-emerald-400 text-center font-medium">✓ {message}</p>
              </div>

              {userName && (
                <p className="text-zinc-400 text-sm text-center">
                  Hi {userName}! You have been unsubscribed from weekly album emails.
                </p>
              )}

              <div className="space-y-3 border-t border-zinc-800 pt-4">
                <p className="text-zinc-300 text-sm">What this means:</p>
                <ul className="space-y-2 text-zinc-400 text-sm list-disc list-inside">
                  <li>You won't receive weekly album emails</li>
                  <li>You can still log in and submit reviews</li>
                  <li>Your account remains active</li>
                  <li>You can resubscribe anytime</li>
                </ul>
              </div>

              <div className="space-y-2 pt-4">
                <button
                  onClick={handleResubscribe}
                  disabled={isResubscribing}
                  className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResubscribing ? 'Resubscribing...' : 'Resubscribe to Weekly Emails'}
                </button>

                <Link
                  href="/dashboard"
                  className="block w-full rounded-md border border-zinc-700 px-4 py-2 text-center text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <p className="text-red-400 text-center font-medium">✕ {message}</p>
              </div>

              <div className="space-y-2">
                <Link
                  href="/"
                  className="block w-full rounded-md bg-emerald-500 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-emerald-600"
                >
                  Go to Home
                </Link>

                <p className="text-zinc-400 text-xs text-center">
                  Need help? Contact your Album Club curator.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-zinc-300">Loading...</div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
