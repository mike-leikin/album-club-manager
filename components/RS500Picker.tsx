"use client";

import { useState, useEffect } from "react";
import { RS500Album } from "@/lib/types/database";

type AlbumData = {
  title: string;
  artist: string;
  year: string;
  spotifyUrl: string;
  albumArtUrl: string;
  rollingStoneRank?: number;
};

type RS500PickerProps = {
  onSelectAlbum: (album: AlbumData) => void;
  placeholder?: string;
};

export default function RS500Picker({
  onSelectAlbum,
  placeholder = "Search Rolling Stone 500...",
}: RS500PickerProps) {
  const [search, setSearch] = useState("");
  const [albums, setAlbums] = useState<RS500Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyUncovered, setShowOnlyUncovered] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchAlbums = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          search,
          onlyUncovered: showOnlyUncovered.toString(),
        });
        const response = await fetch(`/api/rs500?${params}`);
        const data = await response.json();
        setAlbums(data.albums || []);
      } catch (error) {
        console.error("Error fetching RS 500 albums:", error);
        setAlbums([]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchAlbums();
    }
  }, [search, showOnlyUncovered, isOpen]);

  const handleSelectAlbum = async (album: RS500Album) => {
    // Auto-populate from RS 500 data
    onSelectAlbum({
      title: album.album,
      artist: album.artist,
      year: album.year?.toString() || "",
      spotifyUrl: album.spotify_url || "",
      albumArtUrl: album.album_art_url || "",
      rollingStoneRank: album.rank,
    });

    // Track usage
    try {
      await fetch(`/api/rs500/${album.rank}/track-usage`, {
        method: "PATCH",
      });
    } catch (error) {
      console.error("Error tracking usage:", error);
    }

    setIsOpen(false);
    setSearch("");
  };

  const uncoveredCount = albums.filter((a) => !a.already_covered).length;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
      >
        {isOpen ? "Close" : "Pick from Rolling Stone 500"}
      </button>

      {isOpen && (
        <div className="border border-zinc-700 rounded-lg p-4 bg-zinc-900 space-y-3">
          {/* Search Input */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          {/* Filter Toggle */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyUncovered}
                onChange={(e) => setShowOnlyUncovered(e.target.checked)}
                className="rounded bg-zinc-800 border-zinc-700 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-zinc-300">
                Show only uncovered albums ({uncoveredCount} available)
              </span>
            </label>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {loading && (
              <div className="text-center text-zinc-500 py-4">
                Loading albums...
              </div>
            )}

            {!loading && albums.length === 0 && (
              <div className="text-center text-zinc-500 py-4">
                No albums found
              </div>
            )}

            {!loading &&
              albums.map((album) => (
                <button
                  key={album.id}
                  type="button"
                  onClick={() => handleSelectAlbum(album)}
                  className="w-full flex items-center gap-3 p-3 bg-zinc-800 hover:bg-zinc-750 rounded-lg text-left transition-colors group"
                >
                  {/* Album Art */}
                  {album.album_art_url ? (
                    <img
                      src={album.album_art_url}
                      alt={album.album}
                      className="w-16 h-16 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">💿</span>
                    </div>
                  )}

                  {/* Album Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400 font-bold text-sm flex-shrink-0">
                        #{album.rank}
                      </span>
                      <span className="font-semibold text-white truncate">
                        {album.album}
                      </span>
                    </div>
                    <div className="text-zinc-400 text-sm truncate">
                      {album.artist}
                      {album.year && ` • ${album.year}`}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {album.already_covered && (
                        <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded">
                          Already Covered
                        </span>
                      )}
                      {album.times_used > 0 && (
                        <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded">
                          Used {album.times_used}x
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hover indicator */}
                  <div className="text-zinc-600 group-hover:text-purple-400 transition-colors flex-shrink-0">
                    →
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
