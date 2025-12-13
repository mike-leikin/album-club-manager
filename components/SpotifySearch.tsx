"use client";

import React, { useState } from "react";
import { SpotifyAlbumSimplified } from "@/lib/spotifyClient";

type AlbumData = {
  title: string;
  artist: string;
  year: string;
  spotifyUrl: string;
  albumArtUrl: string;
};

type SpotifySearchProps = {
  onSelectAlbum: (album: AlbumData) => void;
  placeholder?: string;
};

export default function SpotifySearch({
  onSelectAlbum,
  placeholder = "Search Spotify (e.g., \"Kind of Blue Miles Davis\")",
}: SpotifySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyAlbumSimplified[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to search Spotify");
      }

      const data = await response.json();
      setResults(data.results || []);
      setShowResults(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectAlbum = (album: SpotifyAlbumSimplified) => {
    // Extract year from release_date (format: YYYY, YYYY-MM, or YYYY-MM-DD)
    const year = album.release_date.split("-")[0];

    // Get the best quality image
    const albumArtUrl = album.images[0]?.url || "";

    onSelectAlbum({
      title: album.name,
      artist: album.artists.map((a) => a.name).join(", "),
      year,
      spotifyUrl: album.external_urls.spotify,
      albumArtUrl,
    });

    // Clear search after selection
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative mb-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch(query);
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-emerald-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => handleSearch(query)}
          disabled={isSearching || !query.trim()}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <div className="mt-2 rounded-md bg-red-900/20 border border-red-800 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-10 mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 shadow-lg max-h-96 overflow-y-auto">
          {results.map((album) => (
            <button
              key={album.id}
              type="button"
              onClick={() => handleSelectAlbum(album)}
              className="flex w-full items-center gap-3 border-b border-zinc-800 p-3 text-left transition hover:bg-zinc-800 last:border-b-0"
            >
              {album.images[2]?.url || album.images[album.images.length - 1]?.url ? (
                <img
                  src={album.images[2]?.url || album.images[album.images.length - 1]?.url}
                  alt={`${album.name} cover`}
                  className="h-12 w-12 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded bg-zinc-800 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-zinc-50 truncate">
                  {album.name}
                </div>
                <div className="text-sm text-zinc-400 truncate">
                  {album.artists.map((a) => a.name).join(", ")} •{" "}
                  {album.release_date.split("-")[0]}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && !isSearching && (
        <div className="mt-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400">
          No results found. Try a different search.
        </div>
      )}
    </div>
  );
}
