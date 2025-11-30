"use client";

import { useState, useEffect } from "react";

type Week = {
  week_number: number;
  contemporary_title?: string;
  contemporary_artist?: string;
  classic_title?: string;
  classic_artist?: string;
  response_deadline?: string;
};

export default function SubmitPage() {
  const [email, setEmail] = useState("");
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [weekData, setWeekData] = useState<Week | null>(null);
  const [loadingWeek, setLoadingWeek] = useState(false);

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!email.trim()) {
      setSubmitError("Please enter your email address");
      return;
    }

    if (!weekNumber) {
      setSubmitError("Week number is required");
      return;
    }

    const contempRatingNum = contempRating ? parseFloat(contempRating) : null;
    const classicRatingNum = classicRating ? parseFloat(classicRating) : null;

    if (!contempRatingNum && !classicRatingNum) {
      setSubmitError("Please rate at least one album");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
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

      setSubmitSuccess(true);
      // Clear form
      setContempRating("");
      setContempTrack("");
      setContempReview("");
      setClassicRating("");
      setClassicTrack("");
      setClassicReview("");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit reviews"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingWeek) {
    return (
      <main className="min-h-screen bg-black text-gray-50 p-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-zinc-400">Loading week data...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Submit Your Review</h1>
        <p className="text-zinc-400 mb-8">
          Share your thoughts on this week&apos;s albums
        </p>

        {weekData && (
          <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
            <h2 className="text-xl font-semibold mb-4">
              Week {weekData.week_number}
            </h2>
            <div className="space-y-3 text-sm">
              {weekData.contemporary_title && (
                <div>
                  <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">
                    Contemporary
                  </div>
                  <div className="text-zinc-100">
                    {weekData.contemporary_title}
                    {weekData.contemporary_artist && (
                      <span className="text-zinc-400">
                        {" "}
                        – {weekData.contemporary_artist}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {weekData.classic_title && (
                <div>
                  <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">
                    Classic
                  </div>
                  <div className="text-zinc-100">
                    {weekData.classic_title}
                    {weekData.classic_artist && (
                      <span className="text-zinc-400">
                        {" "}
                        – {weekData.classic_artist}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Your Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
              placeholder="your.email@example.com"
            />
            <p className="mt-2 text-xs text-zinc-500">
              Use the email you registered with
            </p>
          </div>

          {/* Contemporary Album */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
            <h3 className="text-lg font-semibold mb-4">
              🔊 Contemporary Album
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Rating (0.0 - 10.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={contempRating}
                  onChange={(e) => setContempRating(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                  placeholder="8.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Favorite Track (optional)
                </label>
                <input
                  type="text"
                  value={contempTrack}
                  onChange={(e) => setContempTrack(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                  placeholder="Track name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Review (optional, max 500 characters)
                </label>
                <textarea
                  value={contempReview}
                  onChange={(e) => setContempReview(e.target.value)}
                  maxLength={500}
                  rows={4}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none resize-none"
                  placeholder="Share your thoughts on the album..."
                />
                <p className="mt-1 text-xs text-zinc-500 text-right">
                  {contempReview.length}/500
                </p>
              </div>
            </div>
          </div>

          {/* Classic Album */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
            <h3 className="text-lg font-semibold mb-4">💿 Classic Album</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Rating (0.0 - 10.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={classicRating}
                  onChange={(e) => setClassicRating(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                  placeholder="9.2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Favorite Track (optional)
                </label>
                <input
                  type="text"
                  value={classicTrack}
                  onChange={(e) => setClassicTrack(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                  placeholder="Track name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Review (optional, max 500 characters)
                </label>
                <textarea
                  value={classicReview}
                  onChange={(e) => setClassicReview(e.target.value)}
                  maxLength={500}
                  rows={4}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none resize-none"
                  placeholder="Share your thoughts on the album..."
                />
                <p className="mt-1 text-xs text-zinc-500 text-right">
                  {classicReview.length}/500
                </p>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {submitError && (
            <div className="rounded-md border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm text-emerald-400">
              ✅ Reviews submitted successfully! Thank you for your feedback.
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-emerald-500 px-6 py-3 font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
