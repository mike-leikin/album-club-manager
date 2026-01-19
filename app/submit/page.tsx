"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createAuthClient } from "@/lib/auth/supabaseAuthClientBrowser";
import { formatDateOnlyEastern } from "@/lib/utils/dates";

type Week = {
  week_number: number;
  contemporary_title?: string;
  contemporary_artist?: string;
  contemporary_year?: number;
  contemporary_album_art_url?: string;
  classic_title?: string;
  classic_artist?: string;
  classic_year?: number;
  classic_album_art_url?: string;
  response_deadline?: string;
};

type ReviewSubmissionPayload = {
  week_number: number;
  participant_email: string;
  contemporary?: {
    rating: number;
    favorite_track?: string;
    review_text?: string;
  };
  classic?: {
    rating: number;
    favorite_track?: string;
    review_text?: string;
  };
};

export default function SubmitPage() {
  const [email, setEmail] = useState("");
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [weekData, setWeekData] = useState<Week | null>(null);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [emailSource, setEmailSource] = useState<"url" | "localStorage" | "manual">("manual");

  // Contemporary album review
  const [contempRating, setContempRating] = useState("");
  const [contempTrack, setContempTrack] = useState("");
  const [contempReview, setContempReview] = useState("");

  // Classic album review
  const [classicRating, setClassicRating] = useState("");
  const [classicTrack, setClassicTrack] = useState("");
  const [classicReview, setClassicReview] = useState("");

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-populate email from URL parameter or localStorage
  useEffect(() => {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get("email");

    if (emailParam) {
      setEmail(emailParam);
      setEmailSource("url");
      // Save to localStorage for future visits
      localStorage.setItem("albumClubEmail", emailParam);
    } else {
      // Try to load from localStorage
      const savedEmail = localStorage.getItem("albumClubEmail");
      if (savedEmail) {
        setEmail(savedEmail);
        setEmailSource("localStorage");
      }
    }
  }, []);

  // Fetch latest week on mount
  useEffect(() => {
    const fetchLatestWeek = async () => {
      setLoadingWeek(true);
      try {
        const response = await fetch("/api/weeks");
        const result = await response.json();

        if (response.ok && result.data) {
          setWeekData(result.data);
          setWeekNumber(result.data.week_number);
        }
      } catch (error) {
        console.error("Failed to fetch week data:", error);
      } finally {
        setLoadingWeek(false);
      }
    };

    fetchLatestWeek();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    if (!weekNumber) {
      toast.error("Week number is required");
      return;
    }

    const contempRatingNum = contempRating ? parseFloat(contempRating) : null;
    const classicRatingNum = classicRating ? parseFloat(classicRating) : null;

    if (!contempRatingNum && !classicRatingNum) {
      toast.error("Please rate at least one album");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: ReviewSubmissionPayload = {
        week_number: weekNumber,
        participant_email: email.trim(),
      };

      if (contempRatingNum !== null) {
        payload.contemporary = {
          rating: contempRatingNum,
          favorite_track: contempTrack.trim() || undefined,
          review_text: contempReview.trim() || undefined,
        };
      }

      if (classicRatingNum !== null) {
        payload.classic = {
          rating: classicRatingNum,
          favorite_track: classicTrack.trim() || undefined,
          review_text: classicReview.trim() || undefined,
        };
      }

      const response = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit reviews");
      }

      // Save email to localStorage for future visits
      if (email.trim()) {
        localStorage.setItem("albumClubEmail", email.trim());
      }

      toast.success(
        "Reviews submitted successfully! A confirmation email is on its way."
      );

      // Check if user is authenticated
      const supabase = createAuthClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Authenticated user - redirect to dashboard after a brief delay
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        // Not authenticated - clear form but stay on page
        setContempRating("");
        setContempTrack("");
        setContempReview("");
        setClassicRating("");
        setClassicTrack("");
        setClassicReview("");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit reviews"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingWeek) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900 p-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-gray-500">Loading week data...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Submit Your Review</h1>
        <p className="text-gray-500 mb-8">
          Share your thoughts on this week&apos;s albums
        </p>

        {weekData && (
          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                Week {weekData.week_number}
              </h2>
              {weekData.response_deadline && (
                <p className="text-sm text-gray-500">
                  Deadline: {formatDateOnlyEastern(weekData.response_deadline, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contemporary Album */}
              {weekData.contemporary_title && (
                <div className="flex flex-col items-center text-center space-y-3">
                  {weekData.contemporary_album_art_url ? (
                    <img
                      src={weekData.contemporary_album_art_url}
                      alt={`${weekData.contemporary_title} cover`}
                      className="w-48 h-48 rounded-lg object-cover shadow-2xl ring-2 ring-emerald-500/20"
                    />
                  ) : (
                    <div className="w-48 h-48 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <span className="text-4xl">🔊</span>
                    </div>
                  )}
                  <div>
                    <div className="text-emerald-400 text-xs uppercase tracking-wide font-medium mb-1">
                      Contemporary
                    </div>
                    <div className="text-gray-900 font-medium">
                      {weekData.contemporary_title}
                    </div>
                    {weekData.contemporary_artist && (
                      <div className="text-gray-500 text-sm">
                        {weekData.contemporary_artist}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Classic Album */}
              {weekData.classic_title && (
                <div className="flex flex-col items-center text-center space-y-3">
                  {weekData.classic_album_art_url ? (
                    <img
                      src={weekData.classic_album_art_url}
                      alt={`${weekData.classic_title} cover`}
                      className="w-48 h-48 rounded-lg object-cover shadow-2xl ring-2 ring-purple-500/20"
                    />
                  ) : (
                    <div className="w-48 h-48 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <span className="text-4xl">💿</span>
                    </div>
                  )}
                  <div>
                    <div className="text-purple-400 text-xs uppercase tracking-wide font-medium mb-1">
                      Classic (RS 500)
                    </div>
                    <div className="text-gray-900 font-medium">
                      {weekData.classic_title}
                    </div>
                    {weekData.classic_artist && (
                      <div className="text-gray-500 text-sm">
                        {weekData.classic_artist}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailSource("manual");
                }}
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                placeholder="your.email@example.com"
              />
              {emailSource === "url" && email && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-500">
                  ✓ Pre-filled
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Use the email you registered with
            </p>
          </div>

          {/* Contemporary Album */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-6 flex gap-4">
              {weekData?.contemporary_album_art_url && (
                <img
                  src={weekData.contemporary_album_art_url}
                  alt={weekData.contemporary_title}
                  className="w-24 h-24 rounded-lg border border-gray-300 flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-1">
                  🔊 Contemporary
                </p>
                <h3 className="text-lg font-bold text-gray-900">
                  {weekData?.contemporary_title || "Contemporary Album"}
                </h3>
                {weekData?.contemporary_artist && (
                  <p className="text-sm text-gray-500 mt-1">
                    {weekData.contemporary_artist}
                    {weekData.contemporary_year && ` • ${weekData.contemporary_year}`}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating (0.0 - 10.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={contempRating}
                  onChange={(e) => setContempRating(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder=""
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Favorite Track (optional)
                </label>
                <input
                  type="text"
                  value={contempTrack}
                  onChange={(e) => setContempTrack(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="Track name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review (optional)
                </label>
                <textarea
                  value={contempReview}
                  onChange={(e) => setContempReview(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none resize-y"
                  placeholder="Share your thoughts on the album..."
                />
              </div>
            </div>
          </div>

          {/* Classic Album */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-6 flex gap-4">
              {weekData?.classic_album_art_url && (
                <img
                  src={weekData.classic_album_art_url}
                  alt={weekData.classic_title}
                  className="w-24 h-24 rounded-lg border border-gray-300 flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">
                  💿 Classic (RS 500)
                </p>
                <h3 className="text-lg font-bold text-gray-900">
                  {weekData?.classic_title || "Classic Album"}
                </h3>
                {weekData?.classic_artist && (
                  <p className="text-sm text-gray-500 mt-1">
                    {weekData.classic_artist}
                    {weekData.classic_year && ` • ${weekData.classic_year}`}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating (0.0 - 10.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={classicRating}
                  onChange={(e) => setClassicRating(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder=""
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Favorite Track (optional)
                </label>
                <input
                  type="text"
                  value={classicTrack}
                  onChange={(e) => setClassicTrack(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="Track name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review (optional)
                </label>
                <textarea
                  value={classicReview}
                  onChange={(e) => setClassicReview(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none resize-y"
                  placeholder="Share your thoughts on the album..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Reviews"}
          </button>

          <p className="text-xs text-zinc-500 text-center">
            You can submit reviews for one or both albums. All fields except
            email and at least one rating are optional.
          </p>
        </form>
      </div>
    </main>
  );
}
