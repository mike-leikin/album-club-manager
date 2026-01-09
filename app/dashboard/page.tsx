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

type WeekWithReviewStatus = Week & {
  reviews: {
    contemporary: Review | null;
    classic: Review | null;
  };
  isPastDeadline: boolean;
  isCurrentWeek: boolean;
};

type MyReviewsResponse = {
  reviews: ReviewWithWeek[];
  allWeeks: WeekWithReviewStatus[];
  stats: ReviewStats;
  participant: {
    name: string;
    isCurator: boolean;
  };
};

const formatWeekLabel = (
  dateStr: string | null | undefined,
  fallbackWeekNumber?: number
) => {
  if (!dateStr) {
    return fallbackWeekNumber ? `Week ${fallbackWeekNumber}` : "Album Club";
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return fallbackWeekNumber ? `Week ${fallbackWeekNumber}` : "Album Club";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function DashboardPage() {
  const [allWeeks, setAllWeeks] = useState<WeekWithReviewStatus[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [addingReview, setAddingReview] = useState<{ weekNumber: number; albumType: 'contemporary' | 'classic' } | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isCurator, setIsCurator] = useState(false);
  const [participantEmail, setParticipantEmail] = useState<string>("");

  // Editing/adding form state
  const [formRating, setFormRating] = useState("");
  const [formFavoriteTrack, setFormFavoriteTrack] = useState("");
  const [formReviewText, setFormReviewText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadReviews();
    loadUserEmail();
  }, []);

  async function loadUserEmail() {
    const supabase = createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setParticipantEmail(user.email);
    }
  }

  async function loadReviews() {
    setIsLoading(true);
    try {
      // In development with ?dev=true, use email parameter
      const isDev = typeof window !== 'undefined' &&
                    new URLSearchParams(window.location.search).get('dev') === 'true';
      const devEmail = isDev ? new URLSearchParams(window.location.search).get('email') : null;

      const apiUrl = devEmail
        ? `/api/my-reviews?email=${encodeURIComponent(devEmail)}`
        : '/api/my-reviews';

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch reviews");
      }

      const { data } = await response.json() as { data: MyReviewsResponse };
      setAllWeeks(data.allWeeks || []);
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

  function startEditing(review: Review) {
    setEditingReviewId(review.id);
    setFormRating(String(review.rating));
    setFormFavoriteTrack(review.favorite_track || "");
    setFormReviewText(review.review_text || "");
  }

  function startAdding(weekNumber: number, albumType: 'contemporary' | 'classic') {
    setAddingReview({ weekNumber, albumType });
    setFormRating("");
    setFormFavoriteTrack("");
    setFormReviewText("");
  }

  function cancelForm() {
    setEditingReviewId(null);
    setAddingReview(null);
    setFormRating("");
    setFormFavoriteTrack("");
    setFormReviewText("");
  }

  async function saveEdit(reviewId: string) {
    const ratingValue = Number.parseFloat(formRating);
    if (!Number.isFinite(ratingValue) || ratingValue < 0 || ratingValue > 10) {
      toast.error("Rating must be between 0 and 10");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: ratingValue,
          favorite_track: formFavoriteTrack || null,
          review_text: formReviewText || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update review");
      }

      toast.success("Review updated successfully");
      cancelForm();
      await loadReviews();
    } catch (error) {
      toast.error("Failed to update review");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveNew(weekNumber: number, albumType: 'contemporary' | 'classic') {
    if (!participantEmail) {
      toast.error("Could not determine your email address");
      return;
    }

    const ratingValue = Number.parseFloat(formRating);
    if (!Number.isFinite(ratingValue) || ratingValue < 0 || ratingValue > 10) {
      toast.error("Rating must be between 0 and 10");
      return;
    }

    setIsSaving(true);
    try {
      const reviewData = {
        rating: ratingValue,
        favorite_track: formFavoriteTrack || null,
        review_text: formReviewText || null,
      };

      const payload: any = {
        week_number: weekNumber,
        participant_email: participantEmail,
      };

      if (albumType === 'contemporary') {
        payload.contemporary = reviewData;
      } else {
        payload.classic = reviewData;
      }

      const response = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to submit review");
      }

      toast.success("Review submitted successfully");
      cancelForm();
      await loadReviews();
    } catch (error) {
      toast.error("Failed to submit review");
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

  // Separate current and previous weeks
  const currentWeek = allWeeks.find(w => w.isCurrentWeek) || null;
  const previousWeeks = allWeeks.filter(w => !w.isCurrentWeek);

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
              <a
                href="/reviews"
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Browse Reviews
              </a>
              {isCurator && (
                <a
                  href="/admin"
                  className="px-4 py-2 text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Admin Panel
                </a>
              )}
              <a
                href="/settings"
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors inline-block text-center"
              >
                Settings
              </a>
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
                {Math.floor(stats.totalReviews / 2)} of {stats.totalWeeks} weeks
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

        {/* Current Week Section */}
        {currentWeek && (
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span>📅</span> Current Week
              </h2>
            </div>
            <WeekCard
              week={currentWeek}
              editingReviewId={editingReviewId}
              addingReview={addingReview}
              formRating={formRating}
              formFavoriteTrack={formFavoriteTrack}
              formReviewText={formReviewText}
              isSaving={isSaving}
              onStartEditing={startEditing}
              onStartAdding={startAdding}
              onCancelForm={cancelForm}
              onSaveEdit={saveEdit}
              onSaveNew={saveNew}
              onDeleteReview={deleteReview}
              onRatingChange={setFormRating}
              onFavoriteTrackChange={setFormFavoriteTrack}
              onReviewTextChange={setFormReviewText}
              isCurrentWeek={true}
            />
          </div>
        )}

        {/* Previous Weeks Section */}
        {previousWeeks.length > 0 && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span>📚</span> Previous Weeks
              </h2>
            </div>
            <div className="space-y-6">
              {previousWeeks.map((week) => (
                <WeekCard
                  key={week.week_number}
                  week={week}
                  editingReviewId={editingReviewId}
                  addingReview={addingReview}
                  formRating={formRating}
                  formFavoriteTrack={formFavoriteTrack}
                  formReviewText={formReviewText}
                  isSaving={isSaving}
                  onStartEditing={startEditing}
                  onStartAdding={startAdding}
                  onCancelForm={cancelForm}
                  onSaveEdit={saveEdit}
                  onSaveNew={saveNew}
                  onDeleteReview={deleteReview}
                  onRatingChange={setFormRating}
                  onFavoriteTrackChange={setFormFavoriteTrack}
                  onReviewTextChange={setFormReviewText}
                  isCurrentWeek={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {allWeeks.length === 0 && (
          <div className="bg-white rounded-lg shadow px-6 py-12 text-center">
            <p className="text-gray-500">
              No weeks have been created yet. Check back soon!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

type WeekCardProps = {
  week: WeekWithReviewStatus;
  editingReviewId: string | null;
  addingReview: { weekNumber: number; albumType: 'contemporary' | 'classic' } | null;
  formRating: string;
  formFavoriteTrack: string;
  formReviewText: string;
  isSaving: boolean;
  onStartEditing: (review: Review) => void;
  onStartAdding: (weekNumber: number, albumType: 'contemporary' | 'classic') => void;
  onCancelForm: () => void;
  onSaveEdit: (reviewId: string) => void;
  onSaveNew: (weekNumber: number, albumType: 'contemporary' | 'classic') => void;
  onDeleteReview: (reviewId: string) => void;
  onRatingChange: (value: string) => void;
  onFavoriteTrackChange: (value: string) => void;
  onReviewTextChange: (value: string) => void;
  isCurrentWeek: boolean;
};

function WeekCard({
  week,
  editingReviewId,
  addingReview,
  formRating,
  formFavoriteTrack,
  formReviewText,
  isSaving,
  onStartEditing,
  onStartAdding,
  onCancelForm,
  onSaveEdit,
  onSaveNew,
  onDeleteReview,
  onRatingChange,
  onFavoriteTrackChange,
  onReviewTextChange,
  isCurrentWeek,
}: WeekCardProps) {
  const borderClass = isCurrentWeek ? 'border-2 border-green-500' : 'border border-gray-200';

  return (
    <div className={`bg-white rounded-lg shadow ${borderClass}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              {formatWeekLabel(week.created_at, week.week_number)}
              {isCurrentWeek && (
                <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-800 rounded">
                  Current
                </span>
              )}
              {week.isPastDeadline && !isCurrentWeek && (
                <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-800 rounded">
                  ⚠️ Past Deadline
                </span>
              )}
            </h3>
            {week.response_deadline && (
              <p className="text-sm text-gray-500 mt-1">
                Deadline: {new Date(week.response_deadline).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contemporary Album */}
          <AlbumSlot
            week={week}
            albumType="contemporary"
            review={week.reviews.contemporary}
            isEditing={editingReviewId === week.reviews.contemporary?.id}
            isAdding={addingReview?.weekNumber === week.week_number && addingReview?.albumType === 'contemporary'}
            formRating={formRating}
            formFavoriteTrack={formFavoriteTrack}
            formReviewText={formReviewText}
            isSaving={isSaving}
            isPastDeadline={week.isPastDeadline}
            onStartEditing={onStartEditing}
            onStartAdding={() => onStartAdding(week.week_number, 'contemporary')}
            onCancelForm={onCancelForm}
            onSaveEdit={onSaveEdit}
            onSaveNew={() => onSaveNew(week.week_number, 'contemporary')}
            onDeleteReview={onDeleteReview}
            onRatingChange={onRatingChange}
            onFavoriteTrackChange={onFavoriteTrackChange}
            onReviewTextChange={onReviewTextChange}
          />

          {/* Classic Album */}
          <AlbumSlot
            week={week}
            albumType="classic"
            review={week.reviews.classic}
            isEditing={editingReviewId === week.reviews.classic?.id}
            isAdding={addingReview?.weekNumber === week.week_number && addingReview?.albumType === 'classic'}
            formRating={formRating}
            formFavoriteTrack={formFavoriteTrack}
            formReviewText={formReviewText}
            isSaving={isSaving}
            isPastDeadline={week.isPastDeadline}
            onStartEditing={onStartEditing}
            onStartAdding={() => onStartAdding(week.week_number, 'classic')}
            onCancelForm={onCancelForm}
            onSaveEdit={onSaveEdit}
            onSaveNew={() => onSaveNew(week.week_number, 'classic')}
            onDeleteReview={onDeleteReview}
            onRatingChange={onRatingChange}
            onFavoriteTrackChange={onFavoriteTrackChange}
            onReviewTextChange={onReviewTextChange}
          />
        </div>
      </div>
    </div>
  );
}

type AlbumSlotProps = {
  week: WeekWithReviewStatus;
  albumType: 'contemporary' | 'classic';
  review: Review | null;
  isEditing: boolean;
  isAdding: boolean;
  formRating: string;
  formFavoriteTrack: string;
  formReviewText: string;
  isSaving: boolean;
  isPastDeadline: boolean;
  onStartEditing: (review: Review) => void;
  onStartAdding: () => void;
  onCancelForm: () => void;
  onSaveEdit: (reviewId: string) => void;
  onSaveNew: () => void;
  onDeleteReview: (reviewId: string) => void;
  onRatingChange: (value: string) => void;
  onFavoriteTrackChange: (value: string) => void;
  onReviewTextChange: (value: string) => void;
};

function AlbumSlot({
  week,
  albumType,
  review,
  isEditing,
  isAdding,
  formRating,
  formFavoriteTrack,
  formReviewText,
  isSaving,
  isPastDeadline,
  onStartEditing,
  onStartAdding,
  onCancelForm,
  onSaveEdit,
  onSaveNew,
  onDeleteReview,
  onRatingChange,
  onFavoriteTrackChange,
  onReviewTextChange,
}: AlbumSlotProps) {
  const albumTitle = albumType === "contemporary" ? week.contemporary_title : week.classic_title;
  const albumArtist = albumType === "contemporary" ? week.contemporary_artist : week.classic_artist;
  const albumYear = albumType === "contemporary" ? week.contemporary_year : week.classic_year;
  const albumArtUrl = albumType === "contemporary" ? week.contemporary_album_art_url : week.classic_album_art_url;

  const badgeColor = albumType === "contemporary"
    ? "bg-purple-100 text-purple-800"
    : "bg-orange-100 text-orange-800";

  // If no album is set for this slot
  if (!albumTitle) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="font-medium">No album set</p>
          <p className="text-sm mt-1">
            {albumType === "contemporary" ? "Contemporary" : "Classic"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Album Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-start gap-3">
          {albumArtUrl && (
            <img
              src={albumArtUrl}
              alt={albumTitle}
              className="w-16 h-16 object-cover rounded"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate">
              {albumTitle}
            </h4>
            <p className="text-sm text-gray-600 truncate">{albumArtist}</p>
            {albumYear && <p className="text-xs text-gray-500">{albumYear}</p>}
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded ${badgeColor}`}>
            {albumType === "contemporary" ? "Contemporary" : "Classic"}
          </span>
        </div>
      </div>

      {/* Review Content */}
      <div className="px-4 py-4">
        {isEditing || isAdding ? (
          <div className="space-y-4">
            {isPastDeadline && isAdding && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                ⚠️ You're submitting past the deadline, but that's okay!
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating (0-10)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={formRating}
                onChange={(e) => onRatingChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Favorite Track (optional)
              </label>
              <input
                type="text"
                value={formFavoriteTrack}
                onChange={(e) => onFavoriteTrackChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review (optional)
              </label>
              <textarea
                value={formReviewText}
                onChange={(e) => onReviewTextChange(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                placeholder="Optional"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => isEditing ? onSaveEdit(review!.id) : onSaveNew()}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Submit Review"}
              </button>
              <button
                onClick={onCancelForm}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : review ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Rating:</span>
                <span className="ml-2 text-2xl font-bold text-blue-600">
                  {review.rating.toFixed(1)}
                </span>
                <span className="text-gray-500">/10</span>
              </div>
              {/* Status badges */}
              {review.moderation_status === 'pending' && (
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                  ⏳ Pending Approval
                </span>
              )}
              {review.moderation_status === 'hidden' && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                  👁️ Hidden
                </span>
              )}
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
                <span className="text-sm font-medium text-gray-700">Review:</span>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                  {review.review_text}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onStartEditing(review)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => onDeleteReview(review.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No review yet</p>
            <button
              onClick={onStartAdding}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Add Review
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
