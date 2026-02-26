"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import ReviewEditModal from "./ReviewEditModal";

type Review = {
  id: string;
  week_number: number;
  album_type: 'contemporary' | 'classic';
  rating: number;
  favorite_track: string | null;
  review_text: string | null;
  moderation_status: 'pending' | 'approved' | 'hidden';
  moderated_at: string | null;
  moderation_notes: string | null;
  created_at: string;
  participant: {
    id: string;
    name: string;
    email: string;
  };
  moderator?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type Stats = {
  total: number;
  pending: number;
  approved: number;
  hidden: number;
};

export default function AdminReviewsTab() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, hidden: 0 });
  const [filterWeek, setFilterWeek] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'hidden'>('all');
  const [filterAlbumType, setFilterAlbumType] = useState<'all' | 'contemporary' | 'classic'>('all');
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterWeek) params.append('week_number', filterWeek);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterAlbumType !== 'all') params.append('album_type', filterAlbumType);

      const response = await fetch(`/api/admin/reviews?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load reviews");
      }

      setReviews(result.data.reviews || []);
      setStats(result.data.stats || { total: 0, pending: 0, approved: 0, hidden: 0 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load reviews");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [filterWeek, filterStatus, filterAlbumType]);

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedReviews);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedReviews(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedReviews.size === reviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(reviews.map(r => r.id)));
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/reviews/${id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'approve' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to approve review");
      }

      toast.success("Review approved");
      await loadReviews();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve review");
    }
  };

  const handleHide = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/reviews/${id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'hide' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to hide review");
      }

      toast.success("Review hidden");
      await loadReviews();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to hide review");
    }
  };

  const handleUnhide = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/reviews/${id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: 'unhide' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to unhide review");
      }

      toast.success("Review unhidden (approved)");
      await loadReviews();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unhide review");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this review? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/reviews/${id}/moderate`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete review");
      }

      toast.success("Review deleted permanently");
      await loadReviews();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete review");
    }
  };

  const handleBulkAction = async (action: 'approve' | 'hide' | 'delete') => {
    if (selectedReviews.size === 0) {
      toast.error("No reviews selected");
      return;
    }

    if (action === 'delete') {
      if (!confirm(`Are you sure you want to permanently delete ${selectedReviews.size} review(s)? This cannot be undone.`)) {
        return;
      }
    }

    try {
      const response = await fetch('/api/admin/reviews/bulk', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewIds: Array.from(selectedReviews),
          action,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to perform bulk action");
      }

      toast.success(result.message);
      setSelectedReviews(new Set());
      await loadReviews();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to perform bulk action");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-medium text-yellow-400">⏳ Pending</span>;
      case 'approved':
        return <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-400">✓ Approved</span>;
      case 'hidden':
        return <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400">👁️ Hidden</span>;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
      <h2 className="mb-6 text-2xl font-bold text-white">Review Moderation</h2>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-zinc-400">Total Reviews</div>
        </div>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
          <div className="text-sm text-yellow-400/70">Pending Approval</div>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="text-2xl font-bold text-emerald-400">{stats.approved}</div>
          <div className="text-sm text-emerald-400/70">Approved</div>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="text-2xl font-bold text-red-400">{stats.hidden}</div>
          <div className="text-sm text-red-400/70">Hidden</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-400">Filter by Week</label>
          <input
            type="number"
            placeholder="Week #"
            value={filterWeek}
            onChange={(e) => setFilterWeek(e.target.value)}
            className="w-32 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-400">Album Type</label>
          <select
            value={filterAlbumType}
            onChange={(e) => setFilterAlbumType(e.target.value as any)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="contemporary">Contemporary</option>
            <option value="classic">Classic</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-400">Status</label>
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'approved', 'hidden'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  filterStatus === status
                    ? 'bg-emerald-600 text-white'
                    : 'border border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filterWeek || filterStatus !== 'all' || filterAlbumType !== 'all' ? (
          <button
            onClick={() => {
              setFilterWeek('');
              setFilterStatus('all');
              setFilterAlbumType('all');
            }}
            className="self-end rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Clear Filters
          </button>
        ) : null}
      </div>

      {/* Bulk Actions Bar */}
      {selectedReviews.size > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium text-emerald-400">
            {selectedReviews.size} review(s) selected
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBulkAction('approve')}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Approve
            </button>
            <button
              onClick={() => handleBulkAction('hide')}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Hide
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="rounded-lg border border-red-500 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedReviews(new Set())}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="py-12 text-center text-zinc-400">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="py-12 text-center text-zinc-400">
          No reviews found. {filterWeek || filterStatus !== 'all' || filterAlbumType !== 'all' ? 'Try clearing filters.' : ''}
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-3 sm:hidden">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedReviews.has(review.id)}
                      onChange={() => handleToggleSelect(review.id)}
                      className="cursor-pointer"
                    />
                    {getStatusBadge(review.moderation_status)}
                  </div>
                  <span className="text-xs text-zinc-500">
                    Wk #{review.week_number} · {review.album_type === 'contemporary' ? '🔊' : '💿'}
                  </span>
                </div>
                <div className="mb-1">
                  <div className="text-sm font-medium text-white">{review.participant.name}</div>
                  <div className="text-xs text-zinc-500">{review.participant.email}</div>
                </div>
                <div className="mb-2 text-sm font-semibold text-white">{review.rating.toFixed(1)}/10</div>
                {review.favorite_track && (
                  <div className="mb-1 text-xs text-zinc-500">♪ {review.favorite_track}</div>
                )}
                {review.review_text && (
                  <div className="mb-3 line-clamp-2 text-sm text-zinc-400">{review.review_text}</div>
                )}
                <div className="flex flex-wrap gap-2">
                  {review.moderation_status === 'pending' && (
                    <button
                      onClick={() => handleApprove(review.id)}
                      className="rounded px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20"
                    >
                      Approve
                    </button>
                  )}
                  {review.moderation_status === 'approved' && (
                    <button
                      onClick={() => handleHide(review.id)}
                      className="rounded px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
                    >
                      Hide
                    </button>
                  )}
                  {review.moderation_status === 'hidden' && (
                    <button
                      onClick={() => handleUnhide(review.id)}
                      className="rounded px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20"
                    >
                      Unhide
                    </button>
                  )}
                  <button
                    onClick={() => setEditingReview(review)}
                    className="rounded px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="rounded px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full">
              <thead className="bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedReviews.size === reviews.length && reviews.length > 0}
                      onChange={handleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-400">Week</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-400">Participant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-400">Album</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-400">Rating</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-400">Review Preview</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-zinc-900/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedReviews.has(review.id)}
                        onChange={() => handleToggleSelect(review.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300">#{review.week_number}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{review.participant.name}</div>
                      <div className="text-xs text-zinc-500">{review.participant.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      {review.album_type === 'contemporary' ? '🔊 Contemporary' : '💿 Classic'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{review.rating.toFixed(1)}/10</td>
                    <td className="px-4 py-3">
                      <div className="max-w-md">
                        {review.favorite_track && (
                          <div className="mb-1 text-xs text-zinc-500">♪ {review.favorite_track}</div>
                        )}
                        {review.review_text && (
                          <div className="truncate text-sm text-zinc-400">{review.review_text}</div>
                        )}
                        {!review.favorite_track && !review.review_text && (
                          <div className="text-xs italic text-zinc-600">No text review</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(review.moderation_status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {review.moderation_status === 'pending' && (
                          <button
                            onClick={() => handleApprove(review.id)}
                            className="rounded px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20"
                          >
                            Approve
                          </button>
                        )}
                        {review.moderation_status === 'approved' && (
                          <button
                            onClick={() => handleHide(review.id)}
                            className="rounded px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20"
                          >
                            Hide
                          </button>
                        )}
                        {review.moderation_status === 'hidden' && (
                          <button
                            onClick={() => handleUnhide(review.id)}
                            className="rounded px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20"
                          >
                            Unhide
                          </button>
                        )}
                        <button
                          onClick={() => setEditingReview(review)}
                          className="rounded px-2 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(review.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingReview && (
        <ReviewEditModal
          review={editingReview}
          onSave={loadReviews}
          onClose={() => setEditingReview(null)}
        />
      )}
    </div>
  );
}
