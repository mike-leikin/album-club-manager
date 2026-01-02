'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createAuthClient } from '@/lib/auth/supabaseAuthClientBrowser';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [participant, setParticipant] = useState<any>(null);
  const [emailSubscribed, setEmailSubscribed] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const supabase = createAuthClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // Get participant data
      const { data: participantData, error } = await supabase
        .from('participants')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single();

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      setParticipant(participantData);
      setEmailSubscribed((participantData as any)?.email_subscribed ?? true);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load your settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmailPreference = async () => {
    setIsSaving(true);
    try {
      const supabase = createAuthClient();
      const { error } = await (supabase
        .from('participants') as any)
        .update({ email_subscribed: emailSubscribed })
        .eq('id', (participant as any)?.id);

      if (error) throw error;

      toast.success(
        emailSubscribed
          ? 'You will receive weekly emails'
          : 'You have unsubscribed from weekly emails'
      );
    } catch (error) {
      console.error('Failed to update preference:', error);
      toast.error('Failed to update email preference');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      toast.success('Account deleted successfully');

      // Sign out and redirect
      const supabase = createAuthClient();
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-zinc-300">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="mt-2 text-zinc-400">Manage your Album Club preferences</p>
        </div>

        {/* Account Info */}
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Account Information</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-400">Name</label>
              <p className="mt-1 text-zinc-100">{participant?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400">Email</label>
              <p className="mt-1 text-zinc-100">{participant?.email}</p>
            </div>
            {participant?.is_curator && (
              <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                <p className="text-sm font-medium text-emerald-400">✓ Curator Account</p>
              </div>
            )}
          </div>
        </div>

        {/* Email Preferences */}
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Email Preferences</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="emailSubscribed"
                checked={emailSubscribed}
                onChange={(e) => setEmailSubscribed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
              />
              <div className="flex-1">
                <label htmlFor="emailSubscribed" className="block text-sm font-medium text-zinc-100 cursor-pointer">
                  Receive weekly album emails
                </label>
                <p className="mt-1 text-sm text-zinc-400">
                  Get notified each week when new albums are posted. You can still log in and submit reviews even if unsubscribed.
                </p>
              </div>
            </div>

            <button
              onClick={handleUpdateEmailPreference}
              disabled={isSaving}
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Email Preferences'}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-zinc-950/80 p-6">
          <h2 className="mb-4 text-xl font-semibold text-red-400">Danger Zone</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-zinc-100 mb-2">Delete Account</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Permanently delete your account. Your reviews will be preserved but your name will be removed. This action cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-md border border-red-500 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                >
                  Delete Account
                </button>
              ) : (
                <div className="space-y-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                  <p className="text-sm font-medium text-red-300">
                    Are you sure? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
