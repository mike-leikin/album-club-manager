"use client";

import { useEffect, useState } from "react";
import ParticipantsManager from "@/components/ParticipantsManager";
import SpotifySearch from "@/components/SpotifySearch";

type Album = {
  title: string;
  artist: string;
  year?: string;
  spotifyUrl?: string;
  albumArtUrl?: string;
  rollingStoneRank?: string;
};

type Tab = "week" | "participants";

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
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Review stats for previous week
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

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
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
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

      setLoadingReviews(true);
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
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviewStats();
  }, [weekNumber]);

  // ---- Derived email content ----
  const subject = `Album Club – Week ${weekNumber || ""}`.trim();

  const bodyLines: string[] = [];

  bodyLines.push("Hi all,");
  bodyLines.push("");

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

    const fetchLatestWeek = async () => {
      try {
        const response = await fetch("/api/weeks");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Failed to load latest week.");
        }

        if (!result?.data || cancelled) return;

        const latest = result.data;
        setWeekNumber(
          latest.week_number ? String(latest.week_number) : "1",
        );
        setResponseDeadline(latest.response_deadline ?? "");
        setContemporary({
          title: latest.contemporary_title ?? "",
          artist: latest.contemporary_artist ?? "",
          year: latest.contemporary_year ?? "",
          spotifyUrl: latest.contemporary_spotify_url ?? "",
          albumArtUrl: latest.contemporary_album_art_url ?? "",
        });
        setClassic({
          title: latest.classic_title ?? "",
          artist: latest.classic_artist ?? "",
          year: latest.classic_year ?? "",
          spotifyUrl: latest.classic_spotify_url ?? "",
          albumArtUrl: latest.classic_album_art_url ?? "",
          rollingStoneRank: latest.rs_rank ? String(latest.rs_rank) : "",
        });
      } catch (error) {
        console.error(error);
      }
    };

    fetchLatestWeek();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveFeedback(null);

    const parsedWeekNumber = Number(weekNumber);
    if (!Number.isFinite(parsedWeekNumber) || parsedWeekNumber <= 0) {
      setSaveFeedback({
        type: "error",
        message: "Enter a valid week number before saving.",
      });
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

      setSaveFeedback({ type: "success", message: "Saved ✅" });
    } catch (error) {
      setSaveFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save. Please try again.",
      });
    }

    setIsSaving(false);
  };

  return (
    <main className="min-h-screen bg-black text-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header with tabs */}
        <div className="mb-6">
          <h1 className="mb-4 text-3xl font-bold">Curator Dashboard</h1>

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-zinc-800">
            <button
              onClick={() => setActiveTab("week")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "week"
                  ? "border-b-2 border-emerald-500 text-emerald-400"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              Week Management
            </button>
            <button
              onClick={() => setActiveTab("participants")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "participants"
                  ? "border-b-2 border-emerald-500 text-emerald-400"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              Participants
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "week" && (
          <div className="flex flex-col gap-6 md:flex-row">
            {/* Left: Curator form */}
            <section className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-lg md:w-1/2">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold">This Week&apos;s Albums</h2>
            <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md border border-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Week"}
              </button>
              {saveFeedback && (
                <span
                  className={
                    saveFeedback.type === "success"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {saveFeedback.message}
                </span>
              )}
            </div>
          </div>

          {/* Week setup */}
          <div className="mb-6 space-y-3">
            <h2 className="text-lg font-semibold">This Week&apos;s Setup</h2>

            <div>
              <label className="block text-sm font-medium text-zinc-300">
                Week Number
              </label>
              <input
                type="number"
                value={weekNumber}
                onChange={(e) => setWeekNumber(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                placeholder="1"
                min={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">
                Response Deadline
              </label>
              <input
                type="date"
                value={responseDeadline}
                onChange={(e) => setResponseDeadline(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
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
              <label className="block text-sm font-medium text-zinc-300">
                Title
              </label>
              <input
                type="text"
                value={contemporary.title}
                onChange={(e) =>
                  setContemporary((prev) => ({ ...prev, title: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                placeholder="Album title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">
                Artist
              </label>
              <input
                type="text"
                value={contemporary.artist}
                onChange={(e) =>
                  setContemporary((prev) => ({ ...prev, artist: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                placeholder="Artist name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">
                Year (optional)
              </label>
              <input
                type="text"
                value={contemporary.year}
                onChange={(e) =>
                  setContemporary((prev) => ({ ...prev, year: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                placeholder="2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">
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
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                placeholder="https://open.spotify.com/album/..."
              />
            </div>
          </div>

          {/* Classic album */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              Classic Album <span className="text-xs text-zinc-400">(RS 500)</span>
            </h2>

            <SpotifySearch
              onSelectAlbum={(album) => {
                setClassic({
                  title: album.title,
                  artist: album.artist,
                  year: album.year,
                  spotifyUrl: album.spotifyUrl,
                  albumArtUrl: album.albumArtUrl,
                  rollingStoneRank: classic.rollingStoneRank,
                });
              }}
              placeholder="Search Spotify for classic album..."
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
              <label className="block text-sm font-medium text-zinc-300">
                Title
              </label>
              <input
                type="text"
                value={classic.title}
                onChange={(e) =>
                  setClassic((prev) => ({ ...prev, title: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                placeholder="Album title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">
                Artist
              </label>
              <input
                type="text"
                value={classic.artist}
                onChange={(e) =>
                  setClassic((prev) => ({ ...prev, artist: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                placeholder="Artist name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">
                Year (optional)
              </label>
              <input
                type="text"
                value={classic.year}
                onChange={(e) =>
                  setClassic((prev) => ({ ...prev, year: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                placeholder="1971"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">
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
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                placeholder="https://open.spotify.com/album/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">
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
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
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
      </div>
    </main>
  );
}
