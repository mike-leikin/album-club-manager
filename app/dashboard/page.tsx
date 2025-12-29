"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createAuthClient } from "@/lib/auth/supabaseAuthClientBrowser";
import type { Review, Week } from "@/lib/types/database";

type ReviewWithWeek = Review & {
  week: Week;
};

type ReviewStats = {
  totalReviews: number;
  contemporaryCount: number;
  classicCount: number;
  avgContemporaryRating: number | null;
  avgClassicRating: number | null;
  participationRate: number;
  totalWeeks: number;
};

type MyReviewsResponse = {
  reviews: ReviewWithWeek[];
  stats: ReviewStats;
  participant: {
    name: string;
    isCurator: boolean;
  };
};

export default function DashboardPage() {
  const [reviews, setReviews] = useState<ReviewWithWeek[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<ReviewWithWeek | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isCurator, setIsCurator] = useState(false);

  // Editing form state
  const [editRating, setEditRating] = useState(0);
  const [editFavoriteTrack, setEditFavoriteTrack] = useState("");
  const [editReviewText, setEditReviewText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/my-reviews");
      if (!response.ok) {
        throw new Error("Failed to fetch reviews");
      }

      const { data } = await response.json() as { data: MyReviewsResponse };
      console.log("Dashboard API response:", data);
      console.log("Setting isCurator to:", data.participant.isCurator);
      setReviews(data.reviews);
      setStats(data.stats);
      setUserName(data.participant.name);
      setIsCurator(data.participant.isCurator);
    } catch (error) {
      toast.error("Failed to load your reviews");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  function startEditing(review: ReviewWithWeek) {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditFavoriteTrack(review.favorite_track || "");
    setEditReviewText(review.review_text || "");
  }

  function cancelEditing() {
    setEditingReview(null);
    setEditRating(0);
    setEditFavoriteTrack("");
    setEditReviewText("");
  }

  async function saveEdit() {
    if (!editingReview) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/reviews/${editingReview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: editRating,
          favorite_track: editFavoriteTrack || null,
          review_text: editReviewText || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update review");
      }

      toast.success("Review updated successfully");
      cancelEditing();
      await loadReviews();
    } catch (error) {
      toast.error("Failed to update review");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteReview(reviewId: string) {
    if (!confirm("Are you sure you want to delete this review?")) {
      return;
    }

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete review");
      }

      toast.success("Review deleted successfully");
      await loadReviews();
    } catch (error) {
      toast.error("Failed to delete review");
      console.error(error);
    }
  }

  async function handleSignOut() {
    const supabase = createAuthClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {userName ? `${userName}'s Dashboard` : "My Dashboard"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                View and manage your album reviews
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/"
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Home
              </a>
              {isCurator && (
                <a
                  href="/admin"
                  className="px-4 py-2 text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Admin Panel
                </a>
              )}
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Section */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">
                Total Reviews
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {stats.totalReviews}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">
                Participation Rate
              </div>
              <div className="mt-2 text-3xl font-bold text-blue-600">
                {stats.participationRate}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.totalReviews / 2} of {stats.totalWeeks} weeks
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">
                Avg Contemporary
              </div>
              <div className="mt-2 text-3xl font-bold text-purple-600">
                {stats.avgContemporaryRating?.toFixed(1) || "—"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.contemporaryCount} reviews
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">
                Avg Classic
              </div>
              <div className="mt-2 text-3xl font-bold text-orange-600">
                {stats.avgClassicRating?.toFixed(1) || "—"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.classicCount} reviews
              </div>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Review History
            </h2>
          </div>

          {reviews.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">
                You haven't submitted any reviews yet.
              </p>
              <a
                href="/submit"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Submit Your First Review
              </a>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {Object.entries(
                reviews.reduce((acc, review) => {
                  const weekNum = review.week_number;
                  if (!acc[weekNum]) acc[weekNum] = [];
                  acc[weekNum].push(review);
                  return acc;
                }, {} as Record<number, ReviewWithWeek[]>)
              )
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([weekNum, weekReviews]) => {
                  const week = weekReviews[0].week;
                  const contemporaryReview = weekReviews.find(
                    (r) => r.album_type === "contemporary"
                  );
                  const classicReview = weekReviews.find(
                    (r) => r.album_type === "classic"
                  );

                  return (
                    <div key={weekNum} className="px-6 py-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Week {weekNum}
                        </h3>
                        {week.response_deadline && (
                          <p className="text-sm text-gray-500">
                            Deadline:{" "}
                            {new Date(week.response_deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Contemporary Album Review */}
                        {contemporaryReview && (
                          <ReviewCard
                            review={contemporaryReview}
                            week={week}
                            albumType="contemporary"
                            isEditing={editingReview?.id === contemporaryReview.id}
                            editRating={editRating}
                            editFavoriteTrack={editFavoriteTrack}
                            editReviewText={editReviewText}
                            isSaving={isSaving}
                            onEdit={() => startEditing(contemporaryReview)}
                            onDelete={() => deleteReview(contemporaryReview.id)}
                            onCancel={cancelEditing}
                            onSave={saveEdit}
                            onRatingChange={setEditRating}
                            onFavoriteTrackChange={setEditFavoriteTrack}
                            onReviewTextChange={setEditReviewText}
                          />
                        )}

                        {/* Classic Album Review */}
                        {classicReview && (
                          <ReviewCard
                            review={classicReview}
                            week={week}
                            albumType="classic"
                            isEditing={editingReview?.id === classicReview.id}
                            editRating={editRating}
                            editFavoriteTrack={editFavoriteTrack}
                            editReviewText={editReviewText}
                            isSaving={isSaving}
                            onEdit={() => startEditing(classicReview)}
                            onDelete={() => deleteReview(classicReview.id)}
                            onCancel={cancelEditing}
                            onSave={saveEdit}
                            onRatingChange={setEditRating}
                            onFavoriteTrackChange={setEditFavoriteTrack}
                            onReviewTextChange={setEditReviewText}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

type ReviewCardProps = {
  review: ReviewWithWeek;
  week: Week;
  albumType: "contemporary" | "classic";
  isEditing: boolean;
  editRating: number;
  editFavoriteTrack: string;
  editReviewText: string;
  isSaving: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onSave: () => void;
  onRatingChange: (value: number) => void;
  onFavoriteTrackChange: (value: string) => void;
  onReviewTextChange: (value: string) => void;
};

function ReviewCard({
  review,
  week,
  albumType,
  isEditing,
  editRating,
  editFavoriteTrack,
  editReviewText,
  isSaving,
  onEdit,
  onDelete,
  onCancel,
  onSave,
  onRatingChange,
  onFavoriteTrackChange,
  onReviewTextChange,
}: ReviewCardProps) {
  const albumTitle =
    albumType === "contemporary"
      ? week.contemporary_title
      : week.classic_title;
  const albumArtist =
    albumType === "contemporary"
      ? week.contemporary_artist
      : week.classic_artist;
  const albumYear =
    albumType === "contemporary" ? week.contemporary_year : week.classic_year;
  const albumArtUrl =
    albumType === "contemporary"
      ? week.contemporary_album_art_url
      : week.classic_album_art_url;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Album Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-start gap-3">
          {albumArtUrl && (
            <img
              src={albumArtUrl}
              alt={albumTitle || "Album"}
              className="w-16 h-16 object-cover rounded"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate">
              {albumTitle}
            </h4>
            <p className="text-sm text-gray-600 truncate">{albumArtist}</p>
            {albumYear && (
              <p className="text-xs text-gray-500">{albumYear}</p>
            )}
          </div>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              albumType === "contemporary"
                ? "bg-purple-100 text-purple-800"
                : "bg-orange-100 text-orange-800"
            }`}
          >
            {albumType === "contemporary" ? "Contemporary" : "Classic"}
          </span>
        </div>
      </div>

      {/* Review Content */}
      <div className="px-4 py-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={editRating}
                onChange={(e) => onRatingChange(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Favorite Track
              </label>
              <input
                type="text"
                value={editFavoriteTrack}
                onChange={(e) => onFavoriteTrackChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review
              </label>
              <textarea
                value={editReviewText}
                onChange={(e) => onReviewTextChange(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                placeholder="Optional"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={onSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700">
                Rating:
              </span>
              <span className="ml-2 text-2xl font-bold text-blue-600">
                {review.rating.toFixed(1)}
              </span>
              <span className="text-gray-500">/10</span>
            </div>

            {review.favorite_track && (
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Favorite Track:
                </span>
                <p className="text-gray-900 mt-1">{review.favorite_track}</p>
              </div>
            )}

            {review.review_text && (
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Review:
                </span>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                  {review.review_text}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={onEdit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Edit
              </button>
              <button
                onClick={onDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
