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
  const [reminderEmailSubscribed, setReminderEmailSubscribed] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Invitation state
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  useEffect(() => {
    loadUserSettings();
    loadInvitations();
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
      setReminderEmailSubscribed((participantData as any)?.reminder_email_subscribed ?? true);
      setName((participantData as any)?.name || '');
      setEmail((participantData as any)?.email || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load your settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    try {
      const supabase = createAuthClient();
      const { error } = await (supabase
        .from('participants') as any)
        .update({ name, email })
        .eq('id', (participant as any)?.id);

      if (error) throw error;

      setParticipant({ ...participant, name, email });
      setIsEditingProfile(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEmailPreference = async () => {
    setIsSaving(true);
    try {
      const supabase = createAuthClient();
      const { error } = await (supabase
        .from('participants') as any)
        .update({
          email_subscribed: emailSubscribed,
          reminder_email_subscribed: reminderEmailSubscribed,
        })
        .eq('id', (participant as any)?.id);

      if (error) throw error;

      toast.success('Email preferences updated');
    } catch (error) {
      console.error('Failed to update preference:', error);
      toast.error('Failed to update email preference');
    } finally {
      setIsSaving(false);
    }
  };

  const loadInvitations = async () => {
    try {
      const response = await fetch('/api/invitations/my-invites');
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load invitations:', error);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSendingInvite(true);
    try {
      const response = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitee_email: inviteEmail,
          invitee_name: inviteName || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      toast.success('Invitation sent! A curator will review it shortly.');
      setInviteEmail('');
      setInviteName('');
      loadInvitations(); // Refresh the list
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsSendingInvite(false);
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

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { text: 'Pending Approval', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
      approved: { text: 'Approved', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      accepted: { text: 'Joined', className: 'bg-blue-600/10 text-emerald-400 border-emerald-500/20' },
      rejected: { text: 'Declined', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${badge.className}`}>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-gray-700">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="mt-2 text-gray-500">Manage your Album Club preferences</p>
        </div>

        {/* Account Info */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition"
              >
                Edit
              </button>
            )}
          </div>
          <div className="space-y-4">
            {isEditingProfile ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-blue-500"
                  />
                </div>
                {participant?.is_curator && (
                  <div className="rounded-lg bg-blue-600/10 border border-emerald-500/20 p-3">
                    <p className="text-sm font-medium text-emerald-400">✓ Curator Account</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleUpdateProfile}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingProfile(false);
                      setName(participant?.name || '');
                      setEmail(participant?.email || '');
                    }}
                    disabled={isSaving}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Name</label>
                  <p className="mt-1 text-gray-900">{participant?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-gray-900">{participant?.email}</p>
                </div>
                {participant?.is_curator && (
                  <div className="mt-4 rounded-lg bg-blue-600/10 border border-emerald-500/20 p-3">
                    <p className="text-sm font-medium text-emerald-400">✓ Curator Account</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Email Preferences */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Email Preferences</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="emailSubscribed"
                checked={emailSubscribed}
                onChange={(e) => setEmailSubscribed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 bg-white text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
              />
              <div className="flex-1">
                <label htmlFor="emailSubscribed" className="block text-sm font-medium text-gray-900 cursor-pointer">
                  Receive weekly album emails
                </label>
                <p className="mt-1 text-sm text-gray-500">
                  Get notified each week when new albums are posted. You can still log in and submit reviews even if unsubscribed.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="reminderEmailSubscribed"
                checked={reminderEmailSubscribed}
                onChange={(e) => setReminderEmailSubscribed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 bg-white text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
              />
              <div className="flex-1">
                <label htmlFor="reminderEmailSubscribed" className="block text-sm font-medium text-gray-900 cursor-pointer">
                  Receive reminder emails
                </label>
                <p className="mt-1 text-sm text-gray-500">
                  Get a nudge mid-week if you have not submitted any reviews yet. Reminders are separate from weekly announcements.
                </p>
              </div>
            </div>

            <button
              onClick={handleUpdateEmailPreference}
              disabled={isSaving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Email Preferences'}
            </button>
          </div>
        </div>

        {/* Friend Invitations */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Invite Friends</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Send Invite via Email</h3>
              <p className="text-sm text-gray-500 mb-3">
                Enter a friend's email to send them an invitation to join Album Club.
                A curator will review before they can sign up.
              </p>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="friend@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Friend's Name (optional)"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-blue-500"
                />
                <button
                  onClick={handleSendInvite}
                  disabled={isSendingInvite || !inviteEmail}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                >
                  {isSendingInvite ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Invitation History */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Your Invitations</h2>
          <p className="text-sm text-gray-500 mb-4">
            Track friends you've invited. You can also forward your weekly album emails -
            they include a referral link in the footer.
          </p>

          {invitations.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              You haven't invited anyone yet.
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 bg-white/50 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900">
                        {invite.invitee_name || invite.invitee_email}
                      </p>
                      {getStatusBadge(invite.status)}
                    </div>
                    {invite.invitee_name && (
                      <p className="text-xs text-zinc-500">{invite.invitee_email}</p>
                    )}
                    <p className="text-xs text-zinc-500 mt-1">
                      Sent {new Date(invite.created_at).toLocaleDateString()}
                      {invite.invite_method === 'weekly_email_forward' && ' • Via weekly email'}
                    </p>
                  </div>
                  {invite.status === 'accepted' && invite.invitee && (
                    <div className="text-xs text-emerald-400">
                      ✓ {invite.invitee.name} joined
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-red-400">Danger Zone</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Delete Account</h3>
              <p className="text-sm text-gray-500 mb-4">
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
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-zinc-800 disabled:opacity-50"
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
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-zinc-800"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
