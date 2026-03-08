"use client";

import { useEffect, useState } from "react";
import type { DiscoveryResult } from "@/app/api/albums/discover/route";

interface SelectedAlbum {
  title: string;
  artist: string;
  year: string;
  spotifyUrl: string;
  albumArtUrl: string;
}

interface AlbumDiscoveryProps {
  onSelect: (album: SelectedAlbum) => void;
}

type WeeksOption = 1 | 2 | 4;
type SourceFilter = "all" | "pitchfork" | "spotify";

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 aspect-square w-full rounded-lg bg-gray-200" />
      <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
      <div className="mb-3 h-3 w-1/2 rounded bg-gray-200" />
      <div className="mb-2 h-3 w-full rounded bg-gray-200" />
      <div className="h-3 w-5/6 rounded bg-gray-200" />
    </div>
  );
}

function SourceBadge({ source }: { source: DiscoveryResult["source"] }) {
  if (source === "both") {
    return (
      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700">
        Pitchfork + Spotify
      </span>
    );
  }
  if (source === "pitchfork") {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
        Pitchfork
      </span>
    );
  }
  return (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
      Spotify New
    </span>
  );
}

function FitScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? "bg-emerald-100 text-emerald-800"
      : score >= 6
      ? "bg-yellow-100 text-yellow-800"
      : "bg-gray-100 text-gray-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      Fit: {score}/10
    </span>
  );
}

export default function AlbumDiscovery({ onSelect }: AlbumDiscoveryProps) {
  const [results, setResults] = useState<DiscoveryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeks, setWeeks] = useState<WeeksOption>(2);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/albums/discover?weeks=${weeks}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Request failed: ${res.status}`);
        }
        return res.json() as Promise<{ results: DiscoveryResult[] }>;
      })
      .then((data) => {
        setResults(data.results ?? []);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [weeks]);

  const filtered = results.filter((r) => {
    if (sourceFilter === "pitchfork") return r.source === "pitchfork" || r.source === "both";
    if (sourceFilter === "spotify") return r.source === "spotify-new-releases" || r.source === "both";
    return true;
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Album Discovery</h2>
          <p className="mt-1 text-sm text-gray-500">
            Critically acclaimed new releases ranked by predicted fit for your club.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Weeks filter */}
          <div className="flex rounded-lg border border-gray-200 text-sm">
            {([1, 2, 4] as WeeksOption[]).map((w) => (
              <button
                key={w}
                onClick={() => setWeeks(w)}
                className={`px-3 py-1.5 transition first:rounded-l-lg last:rounded-r-lg ${
                  weeks === w
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {w}w
              </button>
            ))}
          </div>

          {/* Source filter */}
          <div className="flex rounded-lg border border-gray-200 text-sm">
            {(["all", "pitchfork", "spotify"] as SourceFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={`px-3 py-1.5 capitalize transition first:rounded-l-lg last:rounded-r-lg ${
                  sourceFilter === s
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
          No albums found for the selected filters. Try expanding the time range.
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((album) => (
            <div
              key={`${album.artist}|||${album.title}`}
              className="group flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md"
            >
              {/* Album art */}
              <div className="relative aspect-square overflow-hidden rounded-t-xl bg-gray-100">
                {album.albumArtUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={album.albumArtUrl}
                    alt={`${album.title} by ${album.artist}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
                    ♪
                  </div>
                )}
                {album.isBestNewMusic && (
                  <div className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                    BNM
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div>
                  <div className="font-semibold leading-tight text-gray-900 line-clamp-1">
                    {album.title}
                  </div>
                  <div className="text-sm text-gray-500 line-clamp-1">{album.artist}</div>
                  <div className="text-xs text-gray-400">{album.year}</div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1">
                  <SourceBadge source={album.source} />
                  <FitScoreBadge score={album.claudeFitScore} />
                  {album.pitchforkScore !== null && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                      P4K: {album.pitchforkScore}
                    </span>
                  )}
                </div>

                {/* Claude explanation */}
                <p className="flex-1 text-xs leading-relaxed text-gray-600">
                  {album.claudeExplanation}
                </p>

                {/* Links + action */}
                <div className="mt-auto flex items-center gap-2 pt-1">
                  {album.spotifyUrl && (
                    <a
                      href={album.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50"
                    >
                      Spotify
                    </a>
                  )}
                  {album.pitchforkReviewUrl && (
                    <a
                      href={album.pitchforkReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50"
                    >
                      Review
                    </a>
                  )}
                  <button
                    onClick={() =>
                      onSelect({
                        title: album.title,
                        artist: album.artist,
                        year: album.year,
                        spotifyUrl: album.spotifyUrl ?? "",
                        albumArtUrl: album.albumArtUrl ?? "",
                      })
                    }
                    className="ml-auto rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-600"
                  >
                    Select
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
