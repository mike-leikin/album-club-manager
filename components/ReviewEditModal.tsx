"use client";

import { useState } from "react";
import { toast } from "sonner";

type Review = {
  id: string;
  rating: number;
  favorite_track: string | null;
  review_text: string | null;
  moderation_notes: string | null;
  week_number: number;
  album_type: string;
  participant: {
    name: string;
    email: string;
  };
};

type ReviewEditModalProps = {
  review: Review;
  onSave: () => Promise<void>;
  onClose: () => void;
};

export default function ReviewEditModal({ review, onSave, onClose }: ReviewEditModalProps) {
  const [rating, setRating] = useState(review.rating.toString());
  const [favoriteTrack, setFavoriteTrack] = useState(review.favorite_track || '');
  const [reviewText, setReviewText] = useState(review.review_text || '');
  const [notes, setNotes] = useState(review.moderation_notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const ratingNum = parseFloat(rating);
      if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 10) {
        toast.error("Rating must be between 0 and 10");
        setIsSaving(false);
        return;
      }

      const response = await fetch(`/api/admin/reviews/${review.id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: 'approve', // Keep current status but update content
          rating: ratingNum,
          favorite_track: favoriteTrack.trim() || null,
          review_text: reviewText.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save review");
      }

      toast.success("Review updated successfully");
      await onSave();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save review");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-4 text-2xl font-bold text-white">
          Edit Review
        </h2>

        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="text-sm text-zinc-400">
            <div><span className="font-semibold">Participant:</span> {review.participant.name} ({review.participant.email})</div>
            <div><span className="font-semibold">Week:</span> #{review.week_number}</div>
            <div><span className="font-semibold">Album:</span> {review.album_type === 'contemporary' ? '🔊 Contemporary' : '💿 Classic'}</div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Rating */}
          <div>
            <label htmlFor="rating" className="mb-1 block text-sm font-medium text-zinc-300">
              Rating (0-10)
            </label>
            <input
              id="rating"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Favorite Track */}
          <div>
            <label htmlFor="favoriteTrack" className="mb-1 block text-sm font-medium text-zinc-300">
              Favorite Track (optional)
            </label>
            <input
              id="favoriteTrack"
              type="text"
              value={favoriteTrack}
              onChange={(e) => setFavoriteTrack(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
              placeholder="Track name"
            />
          </div>

          {/* Review Text */}
          <div>
            <label htmlFor="reviewText" className="mb-1 block text-sm font-medium text-zinc-300">
              Review Text (optional)
            </label>
            <textarea
              id="reviewText"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
              placeholder="Review comments..."
            />
          </div>

          {/* Moderation Notes */}
          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-zinc-300">
              Moderation Notes (internal only)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
              placeholder="Internal notes about this review..."
            />
            <p className="mt-1 text-xs text-zinc-500">
              These notes are only visible to curators, not participants
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
