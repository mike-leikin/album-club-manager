"use client";

import { useEffect, useState } from "react";
import type { Participant } from "@/lib/types/database";

export default function ParticipantsManager() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load participants
  const loadParticipants = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/participants");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load participants");
      }

      setParticipants(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load participants");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  // Handle add/edit submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: formName.trim(),
        email: formEmail.trim(),
      };

      const response = editingId
        ? await fetch(`/api/participants/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/participants", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save participant");
      }

      // Reset form and reload
      setFormName("");
      setFormEmail("");
      setShowAddForm(false);
      setEditingId(null);
      await loadParticipants();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save participant");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the club?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/participants/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete participant");
      }

      await loadParticipants();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete participant");
    }
  };

  // Handle edit click
  const handleEditClick = (participant: Participant) => {
    setEditingId(participant.id);
    setFormName(participant.name);
    setFormEmail(participant.email);
    setShowAddForm(true);
    setFormError(null);
  };

  // Handle cancel
  const handleCancel = () => {
    setFormName("");
    setFormEmail("");
    setShowAddForm(false);
    setEditingId(null);
    setFormError(null);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
        <p className="text-zinc-400">Loading participants...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Club Participants</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-md border border-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            + Add Participant
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
          <h3 className="text-sm font-semibold text-zinc-300">
            {editingId ? "Edit Participant" : "Add New Participant"}
          </h3>

          {formError && (
            <div className="rounded-md border border-red-500/50 bg-red-500/10 p-2 text-sm text-red-400">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300">Email</label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
              placeholder="john@example.com"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : editingId ? "Update" : "Add"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Participants List */}
      {participants.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No participants yet. Add your first club member above!
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full">
            <thead className="bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Email
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {participants.map((participant) => (
                <tr key={participant.id} className="hover:bg-zinc-900/30">
                  <td className="px-4 py-3 text-sm text-zinc-100">{participant.name}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{participant.email}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => handleEditClick(participant)}
                      className="mr-2 text-emerald-400 hover:text-emerald-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(participant.id, participant.name)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-500">
        {participants.length} {participants.length === 1 ? "participant" : "participants"} in the club
      </p>
    </div>
  );
}
