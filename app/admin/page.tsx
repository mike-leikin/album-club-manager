"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import ParticipantsManager from "@/components/ParticipantsManager";
import SpotifySearch from "@/components/SpotifySearch";
import RS500Picker from "@/components/RS500Picker";
import EmailHistoryTab from "@/components/EmailHistoryTab";
import AdminReviewsTab from "@/components/AdminReviewsTab";
import InvitationsManager from "@/components/InvitationsManager";
import AlbumDiscovery from "@/components/AlbumDiscovery";
import type { Database } from "@/lib/types/database";
import { formatDateOnlyEastern } from "@/lib/utils/dates";

type Album = {
  title: string;
  artist: string;
  year?: string;
  spotifyUrl?: string;
  albumArtUrl?: string;
  rollingStoneRank?: string;
};

type Tab = "week" | "participants" | "reviews" | "history" | "email-history" | "export" | "invitations" | "discover";

type ReviewStats = {
  contemporary: {
    avgRating: number | null;
    reviewCount: number;
    reviews: Array<{
      rating: number;
      favorite_track?: string;
      review_text?: string;
      participant: { name: string };
    }>;
  };
  classic: {
    avgRating: number | null;
    reviewCount: number;
    reviews: Array<{
      rating: number;
      favorite_track?: string;
      review_text?: string;
      participant: { name: string };
    }>;
  };
  totalParticipants: number;
  participationRate: number;
};

export default function AdminPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("week");

  // Basic setup
  const [weekNumber, setWeekNumber] = useState("1");
  const [responseDeadline, setResponseDeadline] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [curatorMessage, setCuratorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPreviousWeek, setIsLoadingPreviousWeek] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isSendingReminderTest, setIsSendingReminderTest] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number | null>(null);
  const [editingWeekPublishedAt, setEditingWeekPublishedAt] = useState<string | null>(null);

  // Review stats for previous week
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);

  // Week history
  const [weekHistory, setWeekHistory] = useState<Database['public']['Tables']['weeks']['Row'][]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [deletingWeekId, setDeletingWeekId] = useState<string | null>(null);

  // Contemporary album
  const [contemporary, setContemporary] = useState<Album>({
    title: "",
    artist: "",
    year: "",
    spotifyUrl: "",
    albumArtUrl: "",
  });

  // Classic album
  const [classic, setClassic] = useState<Album>({
    title: "",
    artist: "",
    year: "",
    spotifyUrl: "",
    albumArtUrl: "",
    rollingStoneRank: "",
  });

  const formatDeadline = (value: string) => {
    if (!value) return "";
    return formatDateOnlyEastern(value, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const formattedDeadline = formatDeadline(responseDeadline);

  // Fetch review stats for previous week
  useEffect(() => {
    const fetchReviewStats = async () => {
      const prevWeek = Number(weekNumber) - 1;
      if (prevWeek < 1) {
        setReviewStats(null);
        return;
      }

      try {
        const response = await fetch(`/api/reviews?week_number=${prevWeek}`);
        const result = await response.json();

        if (response.ok && result.data) {
          setReviewStats(result.data);
        } else {
          setReviewStats(null);
        }
      } catch (error) {
        console.error("Failed to fetch review stats:", error);
        setReviewStats(null);
      }
    };

    fetchReviewStats();
  }, [weekNumber]);

  // Fetch week history when history tab is opened
  useEffect(() => {
    const fetchWeekHistory = async () => {
      if (activeTab !== "history") return;

      setIsLoadingHistory(true);

      try {
        const response = await fetch("/api/weeks/all");
        const result = await response.json();

        if (response.ok && result.data) {
          // Sort by week number descending (most recent first)
          const sorted = [...result.data].sort((a, b) => b.week_number - a.week_number);
          setWeekHistory(sorted);
        } else {
          setWeekHistory([]);
        }
      } catch (error) {
        console.error("Failed to fetch week history:", error);
        setWeekHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchWeekHistory();
  }, [activeTab]);

  // ---- Derived email content ----
  const subject = `Album Club – Week ${weekNumber || ""}`.trim();

  const bodyLines: string[] = [];

  bodyLines.push("Hi all,");
  bodyLines.push("");

  // Add curator message if present
  if (curatorMessage && curatorMessage.trim()) {
    bodyLines.push(curatorMessage.trim());
    bodyLines.push("");
  }

  // Add previous week's results if available
  if (reviewStats && reviewStats.contemporary.reviewCount > 0 || reviewStats && reviewStats.classic.reviewCount > 0) {
    const prevWeek = Number(weekNumber) - 1;
    bodyLines.push(`=== Week ${prevWeek} Results ===`);
    bodyLines.push("");

    if (reviewStats.contemporary.reviewCount > 0) {
      bodyLines.push(`🔊 Contemporary: ${reviewStats.contemporary.avgRating?.toFixed(1) || "N/A"}/10 (${reviewStats.contemporary.reviewCount} ${reviewStats.contemporary.reviewCount === 1 ? "review" : "reviews"})`);

      // Add favorite tracks if any
      const favTracks = reviewStats.contemporary.reviews
        .filter(r => r.favorite_track)
        .map(r => `   • ${r.favorite_track} – ${r.participant.name}`)
        .slice(0, 3); // Show max 3
      if (favTracks.length > 0) {
        bodyLines.push("   Favorite tracks:");
        bodyLines.push(...favTracks);
      }
      bodyLines.push("");
    }

    if (reviewStats.classic.reviewCount > 0) {
      bodyLines.push(`💿 Classic: ${reviewStats.classic.avgRating?.toFixed(1) || "N/A"}/10 (${reviewStats.classic.reviewCount} ${reviewStats.classic.reviewCount === 1 ? "review" : "reviews"})`);

      // Add favorite tracks if any
      const favTracks = reviewStats.classic.reviews
        .filter(r => r.favorite_track)
        .map(r => `   • ${r.favorite_track} – ${r.participant.name}`)
        .slice(0, 3);
      if (favTracks.length > 0) {
        bodyLines.push("   Favorite tracks:");
        bodyLines.push(...favTracks);
      }
      bodyLines.push("");
    }

    bodyLines.push("---");
    bodyLines.push("");
  }

  bodyLines.push("Here are the picks for this week:");
  bodyLines.push("");

  // Contemporary line
  if (contemporary.title || contemporary.artist) {
    const pieces: string[] = [];
    pieces.push("🔊 Contemporary:");
    if (contemporary.title) pieces.push(contemporary.title);
    if (contemporary.artist) pieces.push("– " + contemporary.artist);
    if (contemporary.year) pieces.push(`(${contemporary.year})`);
    bodyLines.push(pieces.join(" "));
    if (contemporary.albumArtUrl) {
      bodyLines.push(`Cover: ${contemporary.albumArtUrl}`);
    }
    if (contemporary.spotifyUrl) {
      bodyLines.push(`Listen: ${contemporary.spotifyUrl}`);
    }
    bodyLines.push("");
  }

  // Classic line
  if (classic.title || classic.artist) {
    const pieces: string[] = [];
    pieces.push("💿 Classic (RS 500):");
    if (classic.title) pieces.push(classic.title);
    if (classic.artist) pieces.push("– " + classic.artist);
    if (classic.year) pieces.push(`(${classic.year})`);
    if (classic.rollingStoneRank) {
      pieces.push(`[Rank #${classic.rollingStoneRank}]`);
    }
    bodyLines.push(pieces.join(" "));
    if (classic.albumArtUrl) {
      bodyLines.push(`Cover: ${classic.albumArtUrl}`);
    }
    if (classic.spotifyUrl) {
      bodyLines.push(`Listen: ${classic.spotifyUrl}`);
    }
    bodyLines.push("");
  }

  bodyLines.push(
    "Please rate each album on a 1.0–10.0 scale and share any quick thoughts.",
  );
  if (formattedDeadline) {
    bodyLines.push(`Responses by: ${formattedDeadline}`);
  }
  bodyLines.push("");

  // Add full reviews section if available
  if (reviewStats && (reviewStats.contemporary.reviewCount > 0 || reviewStats.classic.reviewCount > 0)) {
    const prevWeek = Number(weekNumber) - 1;
    bodyLines.push("---");
    bodyLines.push("");
    bodyLines.push(`=== Week ${prevWeek} Full Reviews ===`);
    bodyLines.push("");

    // Contemporary reviews with text
    const contemporaryWithText = reviewStats.contemporary.reviews.filter(r => r.review_text);
    if (contemporaryWithText.length > 0) {
      bodyLines.push("🔊 Contemporary:");
      bodyLines.push("");
      contemporaryWithText.forEach(review => {
        bodyLines.push(`${review.participant.name} (${review.rating}/10):`);
        if (review.review_text) {
          bodyLines.push(`"${review.review_text}"`);
        }
        bodyLines.push("");
      });
    }

    // Classic reviews with text
    const classicWithText = reviewStats.classic.reviews.filter(r => r.review_text);
    if (classicWithText.length > 0) {
      bodyLines.push("💿 Classic:");
      bodyLines.push("");
      classicWithText.forEach(review => {
        bodyLines.push(`${review.participant.name} (${review.rating}/10):`);
        if (review.review_text) {
          bodyLines.push(`"${review.review_text}"`);
        }
        bodyLines.push("");
      });
    }
  }

  bodyLines.push("- Mike");

  const body = bodyLines.join("\n");

  // Copy helpers
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchWeekState = async () => {
      try {
        const response = await fetch("/api/weeks/all");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Failed to load weeks.");
        }

        if (cancelled) return;

        const allWeeks = Array.isArray(result?.data) ? result.data : [];

        if (allWeeks.length === 0) {
          setWeekNumber("1");
          setCurrentWeekNumber(null);
          setEditingWeekPublishedAt(null);
          return;
        }

        const sorted = [...allWeeks].sort((a, b) => b.week_number - a.week_number);
        const publishedWeeks = sorted.filter((week) => week.published_at);
        const draftWeeks = sorted.filter((week) => !week.published_at);
        const latestPublished = publishedWeeks[0] ?? null;
        const latestDraft = draftWeeks[0] ?? null;

        if (latestDraft && (!latestPublished || latestDraft.week_number > latestPublished.week_number)) {
          setCurrentWeekNumber(latestPublished?.week_number ?? null);
          setWeekNumber(String(latestDraft.week_number));
          setEditingWeekPublishedAt(latestDraft.published_at ?? null);
          setResponseDeadline(latestDraft.response_deadline ?? "");
          setCuratorMessage(latestDraft.curator_message ?? "");
          setContemporary({
            title: latestDraft.contemporary_title ?? "",
            artist: latestDraft.contemporary_artist ?? "",
            year: latestDraft.contemporary_year ?? "",
            spotifyUrl: latestDraft.contemporary_spotify_url ?? "",
            albumArtUrl: latestDraft.contemporary_album_art_url ?? "",
          });
          setClassic({
            title: latestDraft.classic_title ?? "",
            artist: latestDraft.classic_artist ?? "",
            year: latestDraft.classic_year ?? "",
            spotifyUrl: latestDraft.classic_spotify_url ?? "",
            albumArtUrl: latestDraft.classic_album_art_url ?? "",
            rollingStoneRank: latestDraft.rs_rank ? String(latestDraft.rs_rank) : "",
          });
          return;
        }

        if (latestPublished) {
          const nextWeekNumber = latestPublished.week_number ? latestPublished.week_number + 1 : 1;
          setCurrentWeekNumber(latestPublished.week_number ?? null);
          setWeekNumber(String(nextWeekNumber));
          setEditingWeekPublishedAt(null);
          setResponseDeadline(latestPublished.response_deadline ?? "");
          setContemporary({
            title: latestPublished.contemporary_title ?? "",
            artist: latestPublished.contemporary_artist ?? "",
            year: latestPublished.contemporary_year ?? "",
            spotifyUrl: latestPublished.contemporary_spotify_url ?? "",
            albumArtUrl: latestPublished.contemporary_album_art_url ?? "",
          });
          setClassic({
            title: latestPublished.classic_title ?? "",
            artist: latestPublished.classic_artist ?? "",
            year: latestPublished.classic_year ?? "",
            spotifyUrl: latestPublished.classic_spotify_url ?? "",
            albumArtUrl: latestPublished.classic_album_art_url ?? "",
            rollingStoneRank: latestPublished.rs_rank ? String(latestPublished.rs_rank) : "",
          });
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchWeekState();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopyFromPreviousWeek = async () => {
    const currentWeekNum = Number(weekNumber);
    const previousWeekNum = currentWeekNum - 1;

    if (previousWeekNum < 1) {
      toast.error("No previous week to copy from");
      return;
    }

    setIsLoadingPreviousWeek(true);

    try {
      const response = await fetch(`/api/weeks?week_number=${previousWeekNum}`);
      const result = await response.json();

      if (!response.ok || !result.data) {
        throw new Error("Previous week not found");
      }

      const prevWeek = result.data;

      // Copy all album data from previous week
      setContemporary({
        title: prevWeek.contemporary_title ?? "",
        artist: prevWeek.contemporary_artist ?? "",
        year: prevWeek.contemporary_year ?? "",
        spotifyUrl: prevWeek.contemporary_spotify_url ?? "",
        albumArtUrl: prevWeek.contemporary_album_art_url ?? "",
      });

      setClassic({
        title: prevWeek.classic_title ?? "",
        artist: prevWeek.classic_artist ?? "",
        year: prevWeek.classic_year ?? "",
        spotifyUrl: prevWeek.classic_spotify_url ?? "",
        albumArtUrl: prevWeek.classic_album_art_url ?? "",
        rollingStoneRank: prevWeek.rs_rank ? String(prevWeek.rs_rank) : "",
      });

      setCuratorMessage(prevWeek.curator_message ?? "");

      toast.success(`Copied album data from Week ${previousWeekNum}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to copy previous week"
      );
    } finally {
      setIsLoadingPreviousWeek(false);
    }
  };

  const handleSendTestEmail = async () => {
    const parsedWeekNumber = Number(weekNumber);
    if (!Number.isFinite(parsedWeekNumber) || parsedWeekNumber <= 0) {
      toast.error("Please save the week before sending a test email.");
      return;
    }

    setIsSendingTestEmail(true);

    try {
      const response = await fetch("/api/email/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekNumber: parsedWeekNumber }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send test email");
      }

      toast.success(`Test email sent to ${result.message.split(' ').pop()}!`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send test email"
      );
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleSendReminderTest = async () => {
    if (!currentWeekNumber) {
      toast.error("No current week available for reminder test.");
      return;
    }

    setIsSendingReminderTest(true);
    try {
      const response = await fetch("/api/email/send-reminder-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekNumber: currentWeekNumber }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to send reminder test email");
      }

      toast.success(result.message || "Reminder test email sent");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send reminder test email"
      );
    } finally {
      setIsSendingReminderTest(false);
    }
  };

  const handleSendEmail = async () => {
    const parsedWeekNumber = Number(weekNumber);
    if (!Number.isFinite(parsedWeekNumber) || parsedWeekNumber <= 0) {
      toast.error("Please save the week before sending emails.");
      return;
    }

    if (!confirm(`Send week ${parsedWeekNumber} email to all participants?`)) {
      return;
    }

    setIsSendingEmail(true);

    try {
      const response = await fetch("/api/email/send-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekNumber: parsedWeekNumber }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send emails");
      }

      toast.success(`Email sent to ${result.sent} participant(s)!`);
      if (result.failed > 0) {
        toast.error(`${result.failed} email(s) failed to send`);
      }
      setCurrentWeekNumber(parsedWeekNumber);
      setEditingWeekPublishedAt(new Date().toISOString());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send emails"
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendReminder = async () => {
    if (!currentWeekNumber) {
      toast.error("No current week available for reminders.");
      return;
    }

    setIsSendingReminder(true);
    try {
      const countResponse = await fetch("/api/email/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekNumber: currentWeekNumber, dryRun: true }),
      });

      const countResult = await countResponse.json();
      if (!countResponse.ok) {
        throw new Error(countResult.error || "Failed to load reminder recipients");
      }

      const eligibleCount = Number(countResult.eligible || 0);
      if (eligibleCount === 0) {
        toast.success("No reminder emails to send.");
        return;
      }

      const confirmed = confirm(
        `Send reminder for Week ${currentWeekNumber} to ${eligibleCount} participant(s)?`
      );
      if (!confirmed) return;

      const response = await fetch("/api/email/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekNumber: currentWeekNumber }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to send reminder emails");
      }

      const skipped = Number(result.skipped || 0);
      const summary =
        skipped > 0
          ? `Reminder sent to ${result.sent} participant(s). Skipped ${skipped}.`
          : `Reminder sent to ${result.sent} participant(s)!`;
      toast.success(summary);
      if (result.failed > 0) {
        toast.error(`${result.failed} reminder email(s) failed to send`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send reminder emails"
      );
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    const parsedWeekNumber = Number(weekNumber);
    if (!Number.isFinite(parsedWeekNumber) || parsedWeekNumber <= 0) {
      toast.error("Enter a valid week number before saving.");
      setIsSaving(false);
      return;
    }

    const normalizeText = (value?: string) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    };

    const payload = {
      week_number: parsedWeekNumber,
      response_deadline: normalizeText(responseDeadline),
      curator_message: normalizeText(curatorMessage),
      contemporary_title: normalizeText(contemporary.title),
      contemporary_artist: normalizeText(contemporary.artist),
      contemporary_year: normalizeText(contemporary.year),
      contemporary_spotify_url: normalizeText(contemporary.spotifyUrl),
      contemporary_album_art_url: normalizeText(contemporary.albumArtUrl),
      classic_title: normalizeText(classic.title),
      classic_artist: normalizeText(classic.artist),
      classic_year: normalizeText(classic.year),
      classic_spotify_url: normalizeText(classic.spotifyUrl),
      classic_album_art_url: normalizeText(classic.albumArtUrl),
      rs_rank: classic.rollingStoneRank
        ? Number(classic.rollingStoneRank)
        : null,
    };

    try {
      const response = await fetch("/api/weeks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Unable to save. Please try again.");
      }

      toast.success("Week saved successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save. Please try again."
      );
    }

    setIsSaving(false);
  };

  const handleDeleteWeek = async (weekNumber: number) => {
    if (!confirm(`Are you sure you want to delete Week ${weekNumber}? This will also delete all associated reviews and cannot be undone.`)) {
      return;
    }

    setDeletingWeekId(String(weekNumber));

    try {
      const response = await fetch(`/api/weeks?week_number=${weekNumber}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete week");
      }

      toast.success(`Week ${weekNumber} deleted successfully`);

      // Refresh the week history
      const historyResponse = await fetch("/api/weeks/all");
      const historyResult = await historyResponse.json();

      if (historyResponse.ok && historyResult.data) {
        const sorted = [...historyResult.data].sort((a, b) => b.week_number - a.week_number);
        setWeekHistory(sorted);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete week"
      );
    } finally {
      setDeletingWeekId(null);
    }
  };

  const actionButtonClass =
    "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header with tabs */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Curator Dashboard</h1>
            <a
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              My Reviews
            </a>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("week")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "week"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Week Management
            </button>
            <button
              onClick={() => setActiveTab("participants")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "participants"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Participants
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "reviews"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Reviews
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "history"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Week History
            </button>
            <button
              onClick={() => setActiveTab("email-history")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "email-history"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Email History
            </button>
            <button
              onClick={() => setActiveTab("invitations")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "invitations"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Invitations
            </button>
            <button
              onClick={() => setActiveTab("export")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "export"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Data Export
            </button>
            <button
              onClick={() => setActiveTab("discover")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "discover"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Discover
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "week" && (
          <div className="flex flex-col gap-6 md:flex-row">
            {/* Left: Curator form */}
            <section className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-lg md:w-1/2">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold">This Week&apos;s Albums</h2>
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={handleCopyFromPreviousWeek}
                disabled={isLoadingPreviousWeek || Number(weekNumber) <= 1}
                className={actionButtonClass}
                title={Number(weekNumber) <= 1 ? "No previous week available" : "Copy album data from previous week"}
              >
                {isLoadingPreviousWeek ? "Copying..." : "Copy from Previous Week"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={actionButtonClass}
              >
                {isSaving ? "Saving..." : "Save Week"}
              </button>
              <button
                type="button"
                onClick={() => setShowEmailPreview(true)}
                className={actionButtonClass}
              >
                Preview Email
              </button>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isSendingTestEmail}
                className={actionButtonClass}
                title="Send a test email to yourself to preview the actual HTML email"
              >
                {isSendingTestEmail ? "Sending..." : "🧪 Send Test Email"}
              </button>
              <button
                type="button"
                onClick={handleSendReminderTest}
                disabled={isSendingReminderTest || !currentWeekNumber}
                className={actionButtonClass}
                title={
                  currentWeekNumber
                    ? `Send reminder test for Week ${currentWeekNumber}`
                    : "No current week available"
                }
              >
                {isSendingReminderTest
                  ? "Sending..."
                  : `🧪 Send Reminder Test${currentWeekNumber ? ` (Week ${currentWeekNumber})` : ""}`}
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className={actionButtonClass}
              >
                {isSendingEmail ? "Sending..." : "📧 Send Email"}
              </button>
              <button
                type="button"
                onClick={handleSendReminder}
                disabled={isSendingReminder || !currentWeekNumber}
                className={actionButtonClass}
                title={
                  currentWeekNumber
                    ? `Send reminder for Week ${currentWeekNumber}`
                    : "No current week available"
                }
              >
                {isSendingReminder
                  ? "Sending..."
                  : `🔔 Send Reminder${currentWeekNumber ? ` (Week ${currentWeekNumber})` : ""}`}
              </button>
            </div>
          </div>

          {/* Week setup */}
          <div className="mb-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">This Week&apos;s Setup (Week {weekNumber})</h2>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  editingWeekPublishedAt
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {editingWeekPublishedAt ? "Published" : "Draft"}
              </span>
              {currentWeekNumber && (
                <span className="text-xs text-gray-500">
                  Current week: {currentWeekNumber}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Response Deadline
              </label>
              <input
                type="date"
                value={responseDeadline}
                onChange={(e) => setResponseDeadline(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none [color-scheme:dark]"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Curator message */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Custom Message (Optional)
            </label>
            <textarea
              value={curatorMessage}
              onChange={(e) => setCuratorMessage(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none resize-y"
              rows={4}
              placeholder="Add a personal note or context for this week's picks..."
              maxLength={3000}
            />
            <p className="text-xs text-gray-700 mt-1">
              {curatorMessage.length}/3000 characters
            </p>
          </div>

          {/* Contemporary album */}
          <div className="mb-6 space-y-3">
            <h2 className="text-lg font-semibold">Contemporary Album</h2>

            <SpotifySearch
              onSelectAlbum={(album) => {
                setContemporary({
                  title: album.title,
                  artist: album.artist,
                  year: album.year,
                  spotifyUrl: album.spotifyUrl,
                  albumArtUrl: album.albumArtUrl,
                });
              }}
              placeholder="Search Spotify for contemporary album..."
            />

            {contemporary.albumArtUrl && (
              <div className="flex justify-center">
                <img
                  src={contemporary.albumArtUrl}
                  alt={`${contemporary.title} cover`}
                  className="h-32 w-32 rounded-lg object-cover shadow-lg"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Title
              </label>
              <input
                type="text"
                value={contemporary.title}
                onChange={(e) =>
                  setContemporary((prev) => ({ ...prev, title: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="Album title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Artist
              </label>
              <input
                type="text"
                value={contemporary.artist}
                onChange={(e) =>
                  setContemporary((prev) => ({ ...prev, artist: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="Artist name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Year (optional)
              </label>
              <input
                type="text"
                value={contemporary.year}
                onChange={(e) =>
                  setContemporary((prev) => ({ ...prev, year: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Spotify URL (optional)
              </label>
              <input
                type="url"
                value={contemporary.spotifyUrl}
                onChange={(e) =>
                  setContemporary((prev) => ({
                    ...prev,
                    spotifyUrl: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="https://open.spotify.com/album/..."
              />
            </div>
          </div>

          {/* Classic album */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              Classic Album <span className="text-xs text-gray-500">(RS 500)</span>
            </h2>

            <RS500Picker
              onSelectAlbum={(album) => {
                setClassic({
                  title: album.title,
                  artist: album.artist,
                  year: album.year,
                  spotifyUrl: album.spotifyUrl,
                  albumArtUrl: album.albumArtUrl,
                  rollingStoneRank: album.rollingStoneRank?.toString() || "",
                });
              }}
              placeholder="Search Rolling Stone 500..."
            />

            {classic.albumArtUrl && (
              <div className="flex justify-center">
                <img
                  src={classic.albumArtUrl}
                  alt={`${classic.title} cover`}
                  className="h-32 w-32 rounded-lg object-cover shadow-lg"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Title
              </label>
              <input
                type="text"
                value={classic.title}
                onChange={(e) =>
                  setClassic((prev) => ({ ...prev, title: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="Album title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Artist
              </label>
              <input
                type="text"
                value={classic.artist}
                onChange={(e) =>
                  setClassic((prev) => ({ ...prev, artist: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="Artist name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Year (optional)
              </label>
              <input
                type="text"
                value={classic.year}
                onChange={(e) =>
                  setClassic((prev) => ({ ...prev, year: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="1971"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Spotify URL (optional)
              </label>
              <input
                type="url"
                value={classic.spotifyUrl}
                onChange={(e) =>
                  setClassic((prev) => ({
                    ...prev,
                    spotifyUrl: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="https://open.spotify.com/album/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">
                Rolling Stone Rank (optional)
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={classic.rollingStoneRank}
                onChange={(e) =>
                  setClassic((prev) => ({
                    ...prev,
                    rollingStoneRank: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="63"
              />
            </div>
          </div>
        </section>

        {/* Right: Email preview */}
        <section className="w-full md:w-1/2">
          <div className="rounded-2xl bg-white p-6 text-gray-900 shadow-2xl">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Email Preview
            </h2>

            {/* Subject */}
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Subject
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  readOnly
                  value={subject}
                  className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(subject)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Body
              </label>
              <textarea
                readOnly
                value={body}
                className="mt-1 h-72 w-full resize-none rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs leading-relaxed text-gray-900"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => copyToClipboard(body)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100"
                >
                  Copy Body
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              You&apos;ll be able to paste this into Gmail and send to your Google
              Group.
            </p>

            {/* Visual Preview with Album Art */}
            {(contemporary.albumArtUrl || classic.albumArtUrl) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                  Visual Preview
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    This Week&apos;s Albums:
                  </p>
                  <div className="space-y-3">
                    {contemporary.title && contemporary.albumArtUrl && (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-md shadow-sm">
                        <img
                          src={contemporary.albumArtUrl}
                          alt={contemporary.title}
                          className="w-16 h-16 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-emerald-600 font-medium">
                            🔊 CONTEMPORARY
                          </div>
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {contemporary.title}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {contemporary.artist}
                            {contemporary.year && ` (${contemporary.year})`}
                          </div>
                        </div>
                      </div>
                    )}
                    {classic.title && classic.albumArtUrl && (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-md shadow-sm">
                        <img
                          src={classic.albumArtUrl}
                          alt={classic.title}
                          className="w-16 h-16 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-purple-600 font-medium">
                            💿 CLASSIC (RS 500)
                          </div>
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {classic.title}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {classic.artist}
                            {classic.year && ` (${classic.year})`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    💡 Tip: Copy the image URLs from the text body above and add them to your email for a richer experience.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
          </div>
        )}

        {/* Participants Tab */}
        {activeTab === "participants" && <ParticipantsManager />}

        {activeTab === "invitations" && <InvitationsManager />}

        {/* Reviews Tab */}
        {activeTab === "reviews" && <AdminReviewsTab />}

        {/* Email Preview Modal */}
        {showEmailPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Email Preview</h2>
                <button
                  onClick={() => setShowEmailPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-700">Subject:</div>
                  <div className="text-gray-900">Album Club – Week {weekNumber}</div>
                </div>

                <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 mb-4">
                  <p className="text-sm text-yellow-900">
                    ℹ️ <strong>Preview Note:</strong> This shows the plain text content. Actual emails will be sent with beautiful HTML formatting including album artwork, Spotify links, and previous week results.
                  </p>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Content:</div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm text-gray-900 whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {`Hi [Participant Name],\n\n${body}`}
                  </div>
                </div>

                <div className="text-xs text-gray-600">
                  Each participant will receive a personalized email with their name and a unique review link.
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowEmailPreview(false)}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowEmailPreview(false);
                      handleSendEmail();
                    }}
                    className="rounded-md bg-purple-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-600"
                  >
                    Send Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Week History Tab */}
        {activeTab === "history" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold">Week History</h2>

            {isLoadingHistory ? (
              <p className="text-gray-500">Loading week history...</p>
            ) : weekHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No weeks saved yet.</p>
            ) : (
              <div className="space-y-4">
                {weekHistory.map((week) => (
                  <div
                    key={week.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4 hover:border-gray-300 transition"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">Week {week.week_number}</h3>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                              week.published_at
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {week.published_at ? "Published" : "Draft"}
                          </span>
                        </div>
                        {week.response_deadline && (
                          <p className="text-xs text-gray-600">
                            Deadline: {formatDateOnlyEastern(week.response_deadline, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            // Load this week's data into the form
                            setWeekNumber(String(week.week_number));
                            setResponseDeadline(week.response_deadline || "");
                            setCuratorMessage(week.curator_message || "");
                            setEditingWeekPublishedAt(week.published_at ?? null);
                            setContemporary({
                              title: week.contemporary_title || "",
                              artist: week.contemporary_artist || "",
                              year: week.contemporary_year || "",
                              spotifyUrl: week.contemporary_spotify_url || "",
                              albumArtUrl: week.contemporary_album_art_url || "",
                            });
                            setClassic({
                              title: week.classic_title || "",
                              artist: week.classic_artist || "",
                              year: week.classic_year || "",
                              spotifyUrl: week.classic_spotify_url || "",
                              albumArtUrl: week.classic_album_art_url || "",
                              rollingStoneRank: week.rs_rank ? String(week.rs_rank) : "",
                            });
                            setActiveTab("week");
                            toast.success(`Loaded Week ${week.week_number} for editing`);
                          }}
                          className="rounded-md border border-blue-500 bg-blue-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteWeek(week.week_number)}
                          disabled={deletingWeekId === String(week.week_number)}
                          className="rounded-md border border-red-500 bg-red-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingWeekId === String(week.week_number) ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Contemporary Album */}
                      {week.contemporary_title && (
                        <div className="flex gap-3">
                          {week.contemporary_album_art_url ? (
                            <img
                              src={week.contemporary_album_art_url}
                              alt={week.contemporary_title}
                              className="w-16 h-16 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <span className="text-xl">🔊</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-emerald-600 text-xs uppercase tracking-wide font-medium">
                              Contemporary
                            </div>
                            <div className="text-sm font-medium text-gray-900 truncate">{week.contemporary_title}</div>
                            {week.contemporary_artist && (
                              <div className="text-xs text-gray-600 truncate">{week.contemporary_artist}</div>
                            )}
                            {week.contemporary_year && (
                              <div className="text-xs text-gray-600">({week.contemporary_year})</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Classic Album */}
                      {week.classic_title && (
                        <div className="flex gap-3">
                          {week.classic_album_art_url ? (
                            <img
                              src={week.classic_album_art_url}
                              alt={week.classic_title}
                              className="w-16 h-16 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <span className="text-xl">💿</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-purple-600 text-xs uppercase tracking-wide font-medium">
                              Classic (RS 500)
                            </div>
                            <div className="text-sm font-medium text-gray-900 truncate">{week.classic_title}</div>
                            {week.classic_artist && (
                              <div className="text-xs text-gray-600 truncate">{week.classic_artist}</div>
                            )}
                            <div className="text-xs text-gray-600">
                              {week.classic_year && `(${week.classic_year})`}
                              {week.rs_rank && ` • Rank #${week.rs_rank}`}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Email History Tab */}
        {activeTab === "email-history" && (
          <EmailHistoryTab />
        )}

        {/* Data Export Tab */}
        {activeTab === "export" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold">Data Export & Backup</h2>
            <p className="mb-6 text-sm text-gray-500">
              Export your album club data for backup or analysis. All exports include timestamps and can be used to restore data if needed.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Full Backup */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">💾</span>
                  <h3 className="font-semibold text-gray-900">Complete Backup</h3>
                </div>
                <p className="mb-4 text-sm text-gray-600">
                  Export everything: all reviews, participants, weeks, and RS 500 data in a single JSON file.
                </p>
                <a
                  href="/api/export/full"
                  download
                  className="inline-block w-full rounded-md bg-emerald-500 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-emerald-600"
                >
                  Download Full Backup (JSON)
                </a>
              </div>

              {/* Reviews Export */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">📝</span>
                  <h3 className="font-semibold text-gray-900">Reviews</h3>
                </div>
                <p className="mb-4 text-sm text-gray-600">
                  Export all participant reviews with ratings, favorite tracks, and comments.
                </p>
                <div className="flex gap-2">
                  <a
                    href="/api/export/reviews?format=csv"
                    download
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    CSV
                  </a>
                  <a
                    href="/api/export/reviews?format=json"
                    download
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    JSON
                  </a>
                </div>
              </div>

              {/* Participants Export */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  <h3 className="font-semibold text-gray-900">Participants</h3>
                </div>
                <p className="mb-4 text-sm text-gray-600">
                  Export participant list with names, emails, and review counts.
                </p>
                <div className="flex gap-2">
                  <a
                    href="/api/export/participants?format=csv"
                    download
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    CSV
                  </a>
                  <a
                    href="/api/export/participants?format=json"
                    download
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    JSON
                  </a>
                </div>
              </div>

              {/* Weeks Export */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  <h3 className="font-semibold text-gray-900">Week History</h3>
                </div>
                <p className="mb-4 text-sm text-gray-600">
                  Export all weeks with album details, deadlines, and average ratings.
                </p>
                <div className="flex gap-2">
                  <a
                    href="/api/export/weeks?format=csv"
                    download
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    CSV
                  </a>
                  <a
                    href="/api/export/weeks?format=json"
                    download
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    JSON
                  </a>
                </div>
              </div>
            </div>

            {/* Backup Recommendations */}
            <div className="mt-6 rounded-xl border border-yellow-300 bg-yellow-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-yellow-800">
                <span className="text-xl">⚠️</span>
                <h4 className="font-semibold">Backup Recommendations</h4>
              </div>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Download a complete backup regularly (weekly recommended)</li>
                <li>• Store backups in a safe location (cloud storage, external drive)</li>
                <li>• Keep multiple backup versions in case you need to restore older data</li>
                <li>• Test your backups occasionally to ensure they can be restored</li>
              </ul>
            </div>
          </div>
        )}
        {/* Discover Tab */}
        {activeTab === "discover" && (
          <AlbumDiscovery
            onSelect={(album) => {
              setContemporary({
                title: album.title,
                artist: album.artist,
                year: album.year,
                spotifyUrl: album.spotifyUrl,
                albumArtUrl: album.albumArtUrl,
              });
              setActiveTab("week");
            }}
          />
        )}
      </div>
    </main>
  );
}
