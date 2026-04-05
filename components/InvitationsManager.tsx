'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Invitation = {
  id: string;
  invitee_email: string;
  invitee_name: string | null;
  invite_method: string;
  created_at: string;
  referrer: {
    id: string;
    name: string;
    email: string;
    referral_count: number;
    created_at: string;
  };
};

export default function InvitationsManager() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingInvitations();
  }, []);

  const loadPendingInvitations = async () => {
    try {
      const response = await fetch('/api/admin/invitations/pending');
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.data || []);
      } else {
        toast.error('Failed to load pending invitations');
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/admin/invitations/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve invitation');
      }

      toast.success('Invitation approved! Invitee will receive a signup link.');
      setInvitations(invitations.filter((inv) => inv.id !== id));
    } catch (error) {
      console.error('Error approving invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    setProcessingId(id);
    try {
      const response = await fetch(`/api/admin/invitations/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject invitation');
      }

      toast.success('Invitation rejected');
      setInvitations(invitations.filter((inv) => inv.id !== id));
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-400">Loading pending invitations...</div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-12 text-center">
        <div className="mb-4 text-5xl">✓</div>
        <h3 className="text-xl font-semibold text-white mb-2">All Caught Up!</h3>
        <p className="text-zinc-400">
          No pending invitations to review at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Pending Invitations</h2>
          <p className="text-sm text-zinc-400 mt-1">
            {invitations.length} {invitations.length === 1 ? 'invitation' : 'invitations'} awaiting review
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-6"
          >
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-1">
                  {invitation.invitee_name || invitation.invitee_email}
                </h3>
                {invitation.invitee_name && (
                  <p className="text-sm text-zinc-400">{invitation.invitee_email}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border bg-zinc-800 text-zinc-300 border-zinc-700">
                    {invitation.invite_method === 'email' ? 'Direct Email' : 'Weekly Email Forward'}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Requested {new Date(invitation.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-zinc-900/50 p-4 border border-zinc-800 mb-4">
                <h4 className="text-sm font-semibold text-zinc-300 mb-2">Invited by</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{invitation.referrer.name}</p>
                    <p className="text-xs text-zinc-500">{invitation.referrer.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Member since</p>
                    <p className="text-sm text-zinc-400">
                      {new Date(invitation.referrer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500">
                    <span className="font-semibold text-emerald-400">
                      {invitation.referrer.referral_count}
                    </span>{' '}
                    successful {invitation.referrer.referral_count === 1 ? 'referral' : 'referrals'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(invitation.id)}
                  disabled={processingId === invitation.id}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium sm:flex-none"
                >
                  {processingId === invitation.id ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(invitation.id)}
                  disabled={processingId === invitation.id}
                  className="flex-1 px-4 py-2.5 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium sm:flex-none"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
