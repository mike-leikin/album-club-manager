"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type EmailSend = {
  id: string;
  week_number: number;
  email_type: string;
  subject: string;
  created_at: string;
  source_send_id: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  opened_count: number;
  clicked_count: number;
};

type EmailSendRecipient = {
  id: string;
  participant_id: string | null;
  participant_email: string;
  status: "queued" | "sent" | "failed";
  sent_at: string | null;
  resend_id: string | null;
  error_message: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  participant?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type EmailSendDetail = {
  send: EmailSend & {
    html_body: string;
    text_body: string;
  };
  recipients: EmailSendRecipient[];
  preview?: {
    html_body: string;
    text_body: string;
  } | null;
};

type Participant = {
  id: string;
  name: string;
  email: string;
  email_subscribed: boolean;
  reminder_email_subscribed: boolean;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatEmailType = (emailType: string) => {
  const labels: Record<string, string> = {
    weekly_prompt: "Weekly Prompt",
    reminder: "Reminder",
    results: "Results",
    onboarding: "Onboarding",
    admin_message: "Admin Message",
  };
  return labels[emailType] || emailType.replace(/_/g, " ");
};

export default function EmailHistoryTab() {
  const [sendHistory, setSendHistory] = useState<EmailSend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSendId, setSelectedSendId] = useState<string | null>(null);
  const [selectedSend, setSelectedSend] = useState<EmailSendDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isResending, setIsResending] = useState(false);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const fetchSendHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/email/send-history");
      if (!res.ok) throw new Error("Failed to fetch email history");
      const data = await res.json();
      setSendHistory(data.sends || []);
    } catch (error) {
      console.error("Error fetching email history:", error);
      toast.error("Failed to load email history");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSendDetail = async (sendId: string) => {
    setIsDetailLoading(true);
    try {
      const res = await fetch(`/api/email/send-history/${sendId}`);
      if (!res.ok) throw new Error("Failed to fetch send details");
      const data = await res.json();
      setSelectedSend(data || null);
    } catch (error) {
      console.error("Error fetching send details:", error);
      toast.error("Failed to load send details");
      setSelectedSend(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const res = await fetch("/api/participants");
      if (!res.ok) throw new Error("Failed to fetch participants");
      const data = await res.json();
      setParticipants(data.data || []);
    } catch (error) {
      console.error("Error fetching participants:", error);
      toast.error("Failed to load participants");
    }
  };

  useEffect(() => {
    fetchSendHistory();
  }, []);

  useEffect(() => {
    if (!selectedSendId) {
      setSelectedSend(null);
      return;
    }
    setSelectedRecipientIds(new Set());
    fetchSendDetail(selectedSendId);
    if (participants.length === 0) {
      fetchParticipants();
    }
    // Scroll to detail panel after a brief delay to allow render
    setTimeout(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [selectedSendId]);

  const groupedByWeek = useMemo(() => {
    const groups = new Map<number, EmailSend[]>();
    sendHistory.forEach((send) => {
      if (!groups.has(send.week_number)) {
        groups.set(send.week_number, []);
      }
      groups.get(send.week_number)!.push(send);
    });

    return Array.from(groups.entries()).sort(([a], [b]) => b - a);
  }, [sendHistory]);

  const totals = useMemo(() => {
    return sendHistory.reduce(
      (acc, send) => {
        acc.sends += 1;
        acc.recipients += send.recipient_count || 0;
        acc.failed += send.failed_count || 0;
        acc.opened += send.opened_count || 0;
        acc.clicked += send.clicked_count || 0;
        return acc;
      },
      { sends: 0, recipients: 0, failed: 0, opened: 0, clicked: 0 }
    );
  }, [sendHistory]);

  const originalRecipientIds = useMemo(() => {
    const ids = new Set<string>();
    (selectedSend?.recipients || []).forEach((recipient) => {
      if (recipient.participant_id) {
        ids.add(recipient.participant_id);
      }
    });
    return ids;
  }, [selectedSend]);

  const isReminderSend = selectedSend?.send.email_type === "reminder";

  const isParticipantEligible = (participant: Participant) =>
    participant.email_subscribed &&
    (!isReminderSend || participant.reminder_email_subscribed);

  const filteredParticipants = useMemo(() => {
    if (!searchTerm) return participants;
    const term = searchTerm.toLowerCase();
    return participants.filter(
      (participant) =>
        participant.name.toLowerCase().includes(term) ||
        participant.email.toLowerCase().includes(term)
    );
  }, [participants, searchTerm]);

  const toggleRecipient = (participantId: string) => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  };

  const selectMissingRecipients = () => {
    const missing = participants
      .filter(
        (participant) =>
          isParticipantEligible(participant) && !originalRecipientIds.has(participant.id)
      )
      .map((participant) => participant.id);
    setSelectedRecipientIds(new Set(missing));
  };

  const clearSelections = () => {
    setSelectedRecipientIds(new Set());
  };

  const handleResend = async () => {
    if (!selectedSendId) return;
    if (selectedRecipientIds.size === 0) {
      toast.error("Select at least one recipient");
      return;
    }

    const confirmed = confirm(
      `Send this email to ${selectedRecipientIds.size} participant(s)?`
    );
    if (!confirmed) return;

    setIsResending(true);
    try {
      const res = await fetch(`/api/email/send-history/${selectedSendId}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_ids: Array.from(selectedRecipientIds),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend email");
      }

      toast.success(`Queued ${data.queued_count} resend(s)`);
      if (data.failed > 0) {
        toast.warning(`${data.failed} resend(s) failed`);
      }
      if (data.missing_ids?.length) {
        toast.warning(`${data.missing_ids.length} participant(s) not found`);
      }
      if (data.unsubscribed_ids?.length) {
        toast.warning(`${data.unsubscribed_ids.length} participant(s) unsubscribed`);
      }

      setSelectedRecipientIds(new Set());
      fetchSendHistory();
    } catch (error) {
      console.error("Error resending email:", error);
      toast.error(error instanceof Error ? error.message : "Failed to resend email");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
      <div className="mb-6">
        <h2 className="mb-2 text-xl font-semibold text-white">Email History</h2>
        <p className="text-sm text-zinc-400">
          Review previous sends, preview content, and resend to selected participants.
        </p>
      </div>

      {sendHistory.length > 0 && (
        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-2xl font-bold text-white">{totals.sends}</div>
            <div className="text-sm text-zinc-400">Send Instances</div>
          </div>
          <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4">
            <div className="text-2xl font-bold text-emerald-400">{totals.recipients}</div>
            <div className="text-sm text-zinc-400">Total Recipients</div>
          </div>
          <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4">
            <div className="text-2xl font-bold text-red-400">{totals.failed}</div>
            <div className="text-sm text-zinc-400">Failed Sends</div>
          </div>
          <div className="rounded-xl border border-blue-900/50 bg-blue-950/30 p-4">
            <div className="text-2xl font-bold text-blue-400">
              {totals.recipients > 0
                ? `${Math.round((totals.opened / totals.recipients) * 100)}%`
                : "—"}
            </div>
            <div className="text-sm text-zinc-400">Open Rate</div>
          </div>
          <div className="rounded-xl border border-purple-900/50 bg-purple-950/30 p-4">
            <div className="text-2xl font-bold text-purple-400">
              {totals.recipients > 0
                ? `${Math.round((totals.clicked / totals.recipients) * 100)}%`
                : "—"}
            </div>
            <div className="text-sm text-zinc-400">Click Rate</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-zinc-400">Loading email history...</div>
      ) : groupedByWeek.length === 0 ? (
        <div className="py-8 text-center text-zinc-400">
          No email sends found. Sends will appear here once logged.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByWeek.map(([weekNumber, sends]) => (
            <div key={weekNumber}>
              <h3 className="mb-3 text-sm font-semibold text-zinc-300">
                Week {weekNumber}
              </h3>
              <div className="overflow-hidden rounded-xl border border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900/80 text-xs text-zinc-400">
                    <tr className="text-left">
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Sent At</th>
                      <th className="px-4 py-3">Recipients</th>
                      <th className="px-4 py-3">Delivery</th>
                      <th className="px-4 py-3">Opens</th>
                      <th className="px-4 py-3">Clicks</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-200">
                    {sends.map((send) => (
                      <tr
                        key={send.id}
                        className={`cursor-pointer border-t border-zinc-800/60 transition hover:bg-zinc-900/40 ${
                          selectedSendId === send.id ? "bg-zinc-900/60" : ""
                        }`}
                        onClick={() => setSelectedSendId(send.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{formatEmailType(send.email_type)}</span>
                            {send.source_send_id && (
                              <span className="rounded-full bg-blue-900/40 px-2 py-0.5 text-xs text-blue-300">
                                Resend
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{send.subject}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {formatDate(send.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {send.recipient_count ?? 0}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="text-emerald-400">
                            {send.sent_count ?? 0} sent
                          </span>
                          {send.failed_count > 0 && (
                            <span className="text-red-400"> • {send.failed_count} failed</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-blue-400">
                          {send.sent_count > 0
                            ? `${Math.round(((send.opened_count ?? 0) / send.sent_count) * 100)}%`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-purple-400">
                          {send.sent_count > 0
                            ? `${Math.round(((send.clicked_count ?? 0) / send.sent_count) * 100)}%`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSendId && (
        <div ref={detailPanelRef} className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">Email Content</h3>
              <p className="text-xs text-zinc-400">
                Preview is rendered from the stored template using a sample recipient.
              </p>
            </div>
            {isDetailLoading ? (
              <div className="py-6 text-center text-zinc-400">Loading preview...</div>
            ) : selectedSend ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-800 bg-black">
                  <iframe
                    title="Email preview"
                    srcDoc={
                      selectedSend.preview?.html_body || selectedSend.send.html_body
                    }
                    className="h-80 w-full"
                    sandbox=""
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs text-zinc-400">Plain text</p>
                  <pre className="whitespace-pre-wrap rounded-lg border border-zinc-800 bg-black/60 p-3 text-xs text-zinc-300">
                    {selectedSend.preview?.text_body || selectedSend.send.text_body}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-zinc-400">No send selected.</div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">Recipients</h3>
              <p className="text-xs text-zinc-400">
                Select participants to resend this email. Original recipients are listed below.
              </p>
            </div>

            {selectedSend && (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs text-zinc-400">Original recipients</p>
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs">
                    {selectedSend.recipients.length === 0 ? (
                      <div className="text-zinc-500">No recipients logged.</div>
                    ) : (
                      selectedSend.recipients.map((recipient) => (
                        <div
                          key={recipient.id}
                          className="flex items-center justify-between text-zinc-300"
                        >
                          <div>
                            <div>{recipient.participant?.name || "Unknown"}</div>
                            <div className="text-zinc-500">{recipient.participant_email}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            {recipient.opened_at && (
                              <span className="rounded-full bg-blue-900/40 px-2 py-0.5 text-xs text-blue-300">
                                opened
                              </span>
                            )}
                            {recipient.clicked_at && (
                              <span className="rounded-full bg-purple-900/40 px-2 py-0.5 text-xs text-purple-300">
                                clicked
                              </span>
                            )}
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                recipient.status === "sent"
                                  ? "bg-emerald-900/40 text-emerald-300"
                                  : recipient.status === "failed"
                                  ? "bg-red-900/40 text-red-300"
                                  : "bg-yellow-900/40 text-yellow-300"
                              }`}
                            >
                              {recipient.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-zinc-400">Resend to participants</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={selectMissingRecipients}
                        className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                      >
                        Select missing
                      </button>
                      <button
                        type="button"
                        onClick={clearSelections}
                        className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Search participants..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="mb-3 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500"
                  />

                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs">
                    {filteredParticipants.length === 0 ? (
                      <div className="text-zinc-500">No participants found.</div>
                    ) : (
                      filteredParticipants.map((participant) => {
                        const isOriginal = originalRecipientIds.has(participant.id);
                        const isSelected = selectedRecipientIds.has(participant.id);
                        const isEligible = isParticipantEligible(participant);
                        return (
                          <label
                            key={participant.id}
                            className={`flex items-center justify-between gap-3 rounded-md px-2 py-2 ${
                              isEligible
                                ? "cursor-pointer hover:bg-zinc-900/60"
                                : "opacity-50"
                            }`}
                          >
                            <div>
                              <div className="text-zinc-200">{participant.name}</div>
                              <div className="text-zinc-500">{participant.email}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isOriginal && (
                                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                                  Original
                                </span>
                              )}
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!isEligible}
                                onChange={() => toggleRecipient(participant.id)}
                                className="h-4 w-4 rounded border-zinc-600 bg-zinc-900"
                              />
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">
                    {selectedRecipientIds.size} selected
                  </p>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending || selectedRecipientIds.size === 0}
                    className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isResending ? "Sending..." : "Send to selected"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
