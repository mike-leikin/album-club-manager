"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getFirstName } from "@/lib/utils/names";
import type { Week, Review, Participant } from "@/lib/types/database";

type ReviewWithParticipant = Review & {
  participant: Participant;
};

type AlbumReviews = {
  avgRating: number | null;
  reviewCount: number;
  reviews: ReviewWithParticipant[];
};

type WeekReviewsData = {
  contemporary: AlbumReviews;
  classic: AlbumReviews;
};

type WeekWithReviews = Week & {
  reviewsData?: WeekReviewsData;
  isLoading?: boolean;
};

type BrowseReviewsProps = {
  variant?: "page" | "embedded";
  enabled?: boolean;
  weeksOverride?: Week[];
  lockMode?: "deadline" | "none";
};

function mergeWeeks(
  prev: WeekWithReviews[],
  incoming: Week[]
): WeekWithReviews[] {
  const prevMap = new Map(prev.map(week => [week.week_number, week]));
  return incoming.map(week => {
    const existing = prevMap.get(week.week_number);
    if (!existing) return { ...week };
    return {
      ...week,
      reviewsData: existing.reviewsData,
      isLoading: existing.isLoading,
    };
  });
}

export default function BrowseReviews({
  variant = "embedded",
  enabled = true,
  weeksOverride,
  lockMode = "deadline",
}: BrowseReviewsProps) {
  const [weeks, setWeeks] = useState<WeekWithReviews[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const weeksKey = useMemo(
    () =>
      weeksOverride
        ? weeksOverride.map(week => week.week_number).join(",")
        : "",
    [weeksOverride]
  );

  const loadWeeks = useCallback(async () => {
    if (weeksOverride) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/weeks?all=true");
      const result = await response.json();

      if (response.ok && result.data) {
        // API now returns array when ?all=true
        const weeksData = Array.isArray(result.data) ? result.data : [];
        setWeeks(weeksData);
      } else {
        setLoadError("Unable to load weeks.");
      }
    } catch (error) {
      console.error("Failed to load weeks:", error);
      setLoadError("Unable to load weeks.");
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [weeksOverride]);

  useEffect(() => {
    if (!enabled || hasLoaded || weeksOverride) return;
    loadWeeks();
  }, [enabled, hasLoaded, loadWeeks, weeksOverride]);

  useEffect(() => {
    if (!weeksOverride) return;
    setWeeks(prev => mergeWeeks(prev, weeksOverride));
    setHasLoaded(true);
    setIsLoading(false);
    setLoadError(null);
  }, [weeksKey, weeksOverride]);

  async function loadWeekReviews(weekNumber: number) {
    // Mark week as loading
    setWeeks(prev =>
      prev.map(w =>
        w.week_number === weekNumber ? { ...w, isLoading: true } : w
      )
    );

    try {
      const response = await fetch(`/api/reviews?week_number=${weekNumber}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setWeeks(prev =>
          prev.map(w =>
            w.week_number === weekNumber
              ? { ...w, reviewsData: result.data, isLoading: false }
              : w
          )
        );
      }
    } catch (error) {
      console.error(`Failed to load reviews for week ${weekNumber}:`, error);
      setWeeks(prev =>
        prev.map(w =>
          w.week_number === weekNumber ? { ...w, isLoading: false } : w
        )
      );
    }
  }

  function toggleWeek(weekNumber: number, isLocked: boolean) {
    if (isLocked) return;

    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekNumber)) {
      newExpanded.delete(weekNumber);
    } else {
      newExpanded.add(weekNumber);
      // Load reviews if not already loaded
      const week = weeks.find(w => w.week_number === weekNumber);
      if (week && !week.reviewsData && !week.isLoading) {
        loadWeekReviews(weekNumber);
      }
    }
    setExpandedWeeks(newExpanded);
  }

  function isWeekLocked(week: Week): boolean {
    if (lockMode === "none") return false;
    if (!week.response_deadline) return false;
    return new Date(week.response_deadline) > new Date();
  }

  if (!enabled && !hasLoaded) {
    return null;
  }

  const content = (() => {
    const isLoadingView = isLoading || (enabled && !hasLoaded);
    if (isLoadingView) {
      return (
        <div className="bg-white rounded-lg shadow px-6 py-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reviews...</p>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="bg-white rounded-lg shadow px-6 py-12 text-center">
          <p className="text-gray-600">{loadError}</p>
          <button
            onClick={loadWeeks}
            className="mt-4 px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    if (weeks.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow px-6 py-12 text-center">
          <p className="text-gray-500">
            No weeks have been created yet. Check back soon!
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {weeks.map(week => {
          const locked = isWeekLocked(week);
          const expanded = expandedWeeks.has(week.week_number);

          return (
            <WeekSection
              key={week.week_number}
              week={week}
              isLocked={locked}
              isExpanded={expanded}
              onToggle={() => toggleWeek(week.week_number, locked)}
            />
          );
        })}
      </div>
    );
  })();

  if (variant === "page") {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  🎵 Album Club Reviews
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                  Browse past weeks and read what others thought
                </p>
              </div>
              <Link
                href="/"
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Home
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {content}
        </main>
      </div>
    );
  }

  return content;
}

type WeekSectionProps = {
  week: WeekWithReviews;
  isLocked: boolean;
  isExpanded: boolean;
  onToggle: () => void;
};

function WeekSection({ week, isLocked, isExpanded, onToggle }: WeekSectionProps) {
  const totalReviews = week.reviewsData
    ? week.reviewsData.contemporary.reviewCount + week.reviewsData.classic.reviewCount
    : 0;

  const avgContemp = week.reviewsData?.contemporary.avgRating;
  const avgClassic = week.reviewsData?.classic.avgRating;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        disabled={isLocked}
        className={`w-full px-6 py-4 text-left transition-colors ${
          isLocked
            ? "cursor-not-allowed bg-gray-50"
            : "hover:bg-gray-50 cursor-pointer"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">
                Week {week.week_number}
              </h2>
              {isLocked && (
                <span className="text-xs font-medium px-2 py-1 bg-gray-200 text-gray-600 rounded">
                  🔒 Locked
                </span>
              )}
            </div>
            {week.response_deadline && (
              <p className="text-sm text-gray-500 mt-1">
                {isLocked ? "Deadline: " : "Ended: "}
                {new Date(week.response_deadline).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            {!isLocked && isExpanded && totalReviews > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
                {avgContemp && avgClassic && (
                  <span className="ml-2">
                    • Avg: {avgContemp.toFixed(1)} / {avgClassic.toFixed(1)}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="text-gray-400">
            {isLocked ? (
              <span className="text-sm">Reviews locked until deadline</span>
            ) : (
              <span className="text-2xl">{isExpanded ? "▼" : "▶"}</span>
            )}
          </div>
        </div>
      </button>

      {isExpanded && !isLocked && (
        <div className="border-t border-gray-200 px-6 py-6">
          {week.isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading reviews...</p>
            </div>
          ) : week.reviewsData ? (
            <div className="space-y-8">
              {week.contemporary_title && (
                <AlbumReviewsSection
                  albumType="contemporary"
                  title={week.contemporary_title}
                  artist={week.contemporary_artist}
                  year={week.contemporary_year}
                  albumArtUrl={week.contemporary_album_art_url}
                  reviewsData={week.reviewsData.contemporary}
                />
              )}

              {week.classic_title && (
                <AlbumReviewsSection
                  albumType="classic"
                  title={week.classic_title}
                  artist={week.classic_artist}
                  year={week.classic_year}
                  albumArtUrl={week.classic_album_art_url}
                  reviewsData={week.reviewsData.classic}
                />
              )}

              {!week.contemporary_title && !week.classic_title && (
                <p className="text-center text-gray-500">
                  No albums configured for this week
                </p>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500">Failed to load reviews</p>
          )}
        </div>
      )}
    </div>
  );
}

type AlbumReviewsSectionProps = {
  albumType: "contemporary" | "classic";
  title: string | null;
  artist: string | null;
  year: string | number | null;
  albumArtUrl: string | null;
  reviewsData: AlbumReviews;
};

function AlbumReviewsSection({
  albumType,
  title,
  artist,
  year,
  albumArtUrl,
  reviewsData,
}: AlbumReviewsSectionProps) {
  const bgColor = albumType === "contemporary" ? "bg-purple-50" : "bg-orange-50";
  const borderColor = albumType === "contemporary" ? "border-purple-200" : "border-orange-200";
  const textColor = albumType === "contemporary" ? "text-purple-800" : "text-orange-800";
  const badgeColor =
    albumType === "contemporary"
      ? "bg-purple-100 text-purple-800"
      : "bg-orange-100 text-orange-800";

  return (
    <div className={`rounded-lg border-2 ${borderColor} overflow-hidden`}>
      <div className={`${bgColor} px-4 py-3 border-b ${borderColor}`}>
        <div className="flex items-start gap-4">
          {albumArtUrl && (
            <img
              src={albumArtUrl}
              alt={title || "Album"}
              className="w-20 h-20 object-cover rounded shadow-md"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-1 text-xs font-medium rounded ${badgeColor}`}>
                {albumType === "contemporary" ? "Contemporary" : "Classic"}
              </span>
            </div>
            <h3 className={`text-lg font-bold ${textColor}`}>{title}</h3>
            <p className="text-sm text-gray-700">
              {artist}
              {year && ` • ${year}`}
            </p>
            {reviewsData.avgRating !== null && (
              <p className="text-sm font-medium text-gray-800 mt-1">
                Average Rating: <span className="text-lg font-bold">{reviewsData.avgRating.toFixed(1)}</span>/10
                <span className="text-gray-600 ml-2">
                  ({reviewsData.reviewCount} {reviewsData.reviewCount === 1 ? "review" : "reviews"})
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-4">
        {reviewsData.reviews.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            No reviews submitted for this album yet
          </p>
        ) : (
          <div className="space-y-4">
            {reviewsData.reviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type ReviewCardProps = {
  review: ReviewWithParticipant;
};

function ReviewCard({ review }: ReviewCardProps) {
  const firstName = getFirstName(review.participant.name);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-semibold text-gray-900">{firstName}</span>
          <span className="ml-3 text-2xl font-bold text-blue-600">
            {review.rating.toFixed(1)}
          </span>
          <span className="text-gray-500">/10</span>
        </div>
        <span className="text-xs text-gray-400">
          {new Date(review.created_at).toLocaleDateString()}
        </span>
      </div>

      {review.favorite_track && (
        <div className="mb-2">
          <span className="text-sm font-medium text-gray-700">Favorite Track:</span>
          <p className="text-sm text-gray-900">{review.favorite_track}</p>
        </div>
      )}

      {review.review_text && (
        <div>
          <span className="text-sm font-medium text-gray-700">Review:</span>
          <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
            {review.review_text}
          </p>
        </div>
      )}
    </div>
  );
}
