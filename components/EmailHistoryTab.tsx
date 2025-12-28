"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type EmailLog = {
  id: number;
  week_number: number;
  participant_id: string | null; // UUID
  participant_email: string;
  status: 'sent' | 'failed';
  sent_at: string;
  resend_id: string | null;
  error_message: string | null;
  participant?: {
    id: string; // UUID
    name: string;
    email: string;
  } | null;
};

type EmailSummary = {
  total: number;
  sent: number;
  failed: number;
  byWeek: Record<number, { sent: number; failed: number; total: number }>;
};

export default function EmailHistoryTab() {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [summary, setSummary] = useState<EmailSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterWeek, setFilterWeek] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  // Fetch email logs
  const fetchEmailLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterWeek) params.append('week_number', filterWeek);
      if (filterStatus) params.append('status', filterStatus);

      const [logsRes, summaryRes] = await Promise.all([
        fetch(`/api/email/logs?${params.toString()}`),
        fetch(`/api/email/logs/summary${filterWeek ? `?week_number=${filterWeek}` : ''}`),
      ]);

      if (!logsRes.ok || !summaryRes.ok) {
        throw new Error('Failed to fetch email logs');
      }

      const logsData = await logsRes.json();
      const summaryData = await summaryRes.json();

      setEmailLogs(logsData.logs || []);
      setSummary(summaryData.summary || null);
    } catch (error) {
      console.error('Error fetching email logs:', error);
      toast.error('Failed to load email history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailLogs();
  }, [filterWeek, filterStatus]);

  // Retry failed emails for a specific week
  const handleRetryWeek = async (weekNumber: number) => {
    if (!confirm(`Retry sending emails to all participants who didn't receive Week ${weekNumber}?`)) {
      return;
    }

    setIsRetrying(true);
    try {
      const res = await fetch('/api/email/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekNumber }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to retry emails');
      }

      const data = await res.json();
      toast.success(`Retried ${data.sent} email(s) for Week ${weekNumber}`);

      if (data.failed > 0) {
        toast.warning(`${data.failed} email(s) still failed`);
      }

      // Refresh logs
      fetchEmailLogs();
    } catch (error) {
      console.error('Error retrying emails:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to retry emails');
    } finally {
      setIsRetrying(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
      <div className="mb-6">
        <h2 className="mb-2 text-xl font-semibold">Email History</h2>
        <p className="text-sm text-zinc-400">
          Track email delivery status and retry failed sends.
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-2xl font-bold text-white">{summary.total}</div>
            <div className="text-sm text-zinc-400">Total Emails</div>
          </div>
          <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4">
            <div className="text-2xl font-bold text-emerald-400">{summary.sent}</div>
            <div className="text-sm text-zinc-400">Successfully Sent</div>
          </div>
          <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4">
            <div className="text-2xl font-bold text-red-400">{summary.failed}</div>
            <div className="text-sm text-zinc-400">Failed</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Filter by Week</label>
          <input
            type="number"
            placeholder="Week #"
            value={filterWeek}
            onChange={(e) => setFilterWeek(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Filter by Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
          >
            <option value="">All</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => {
              setFilterWeek("");
              setFilterStatus("");
            }}
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* By Week Summary */}
      {summary && Object.keys(summary.byWeek).length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-zinc-300">By Week</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(summary.byWeek)
              .sort(([a], [b]) => parseInt(b) - parseInt(a))
              .map(([week, stats]) => (
                <div
                  key={week}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
                >
                  <div>
                    <div className="font-semibold text-white">Week {week}</div>
                    <div className="text-xs text-zinc-400">
                      <span className="text-emerald-400">{stats.sent} sent</span>
                      {stats.failed > 0 && (
                        <span className="text-red-400"> • {stats.failed} failed</span>
                      )}
                    </div>
                  </div>
                  {stats.failed > 0 && (
                    <button
                      onClick={() => handleRetryWeek(parseInt(week))}
                      disabled={isRetrying}
                      className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
                    >
                      Retry
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Email Logs Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="py-8 text-center text-zinc-400">Loading email history...</div>
        ) : emailLogs.length === 0 ? (
          <div className="py-8 text-center text-zinc-400">
            No email logs found. Emails will appear here once the database migration is complete.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400">
                <th className="pb-2">Week</th>
                <th className="pb-2">Participant</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Sent At</th>
                <th className="pb-2">Error</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {emailLogs.map((log) => (
                <tr key={log.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                  <td className="py-3 font-medium text-white">#{log.week_number}</td>
                  <td className="py-3 text-zinc-300">
                    {log.participant?.name || <span className="text-zinc-500">Deleted</span>}
                  </td>
                  <td className="py-3 text-zinc-400">{log.participant_email}</td>
                  <td className="py-3">
                    {log.status === 'sent' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/30 px-2 py-1 text-xs text-emerald-400">
                        ✓ Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-900/30 px-2 py-1 text-xs text-red-400">
                        ✗ Failed
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-xs text-zinc-500">{formatDate(log.sent_at)}</td>
                  <td className="py-3 text-xs text-red-400">
                    {log.error_message && (
                      <span title={log.error_message} className="cursor-help">
                        {log.error_message.substring(0, 50)}
                        {log.error_message.length > 50 && '...'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
