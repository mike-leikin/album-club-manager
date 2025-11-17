"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Album = {
  title: string;
  artist: string;
  year?: string;
  spotifyUrl?: string;
  rollingStoneRank?: string;
};

const { data } = await supabase
  .from('weeks')
  .select('*')
  .order('week_number', { ascending: false })
  .limit(1);

export default function AdminPage() {
  // Basic setup
  const [weekNumber, setWeekNumber] = useState("1");
  const [responseDeadline, setResponseDeadline] = useState("Friday, Nov 1");

  // Contemporary album
  const [contemporary, setContemporary] = useState<Album>({
    title: "",
    artist: "",
    year: "",
    spotifyUrl: "",
  });

  // Classic album
  const [classic, setClassic] = useState<Album>({
    title: "",
    artist: "",
    year: "",
    spotifyUrl: "",
    rollingStoneRank: "",
  });

  // ---- Derived email content ----
  const subject = `Album Club – Week ${weekNumber || ""}`.trim();

  const bodyLines: string[] = [];

  bodyLines.push("Hi all,");
  bodyLines.push("");
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
    if (classic.spotifyUrl) {
      bodyLines.push(`Listen: ${classic.spotifyUrl}`);
    }
    bodyLines.push("");
  }

  bodyLines.push("Please rate each album on a 1.0–10.0 scale and share any quick thoughts.");
  if (responseDeadline) {
    bodyLines.push(`Responses by: ${responseDeadline}`);
  }
  bodyLines.push("");
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

  return (
    <main className="min-h-screen bg-black text-gray-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
        {/* Left: Curator form */}
        <section className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-lg md:w-1/2">
          <h1 className="mb-4 text-2xl font-semibold">Curator Dashboard</h1>

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
                Response Deadline (e.g. &quot;Friday, Nov 21&quot;)
              </label>
              <input
                type="text"
                value={responseDeadline}
                onChange={(e) => setResponseDeadline(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
                placeholder='Friday, Nov 21'
              />
            </div>
          </div>

          {/* Contemporary album */}
          <div className="mb-6 space-y-3">
            <h2 className="text-lg font-semibold">Contemporary Album</h2>

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
          </div>
        </section>
      </div>
    </main>
  );
}
