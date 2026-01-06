"use client";

import { useState } from "react";

type SpotifyAlbumResult = {
  name: string;
  artist: string;
  year: number;
  url: string;
  imageUrl?: string;
};

type FixAlbumResult = {
  success: boolean;
  message: string;
  spotifyData: SpotifyAlbumResult;
  allResults: SpotifyAlbumResult[];
};

export default function FixAlbumPage() {
  const [rank, setRank] = useState("104");
  const [artist, setArtist] = useState("Ray Charles");
  const [album, setAlbum] = useState("Modern Sounds in Country and Western Music");
  const [year, setYear] = useState("1962");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FixAlbumResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFix = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/fix-rs500-album", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rank: parseInt(rank),
          artist,
          album,
          year: parseInt(year),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fix album");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Fix RS 500 Album Cover</h1>

        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rank</label>
              <input
                type="number"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Artist</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Album</label>
              <input
                type="text"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
              />
            </div>

            <button
              onClick={handleFix}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded"
            >
              {loading ? "Searching Spotify..." : "Fix Album Cover"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-900/50 border border-green-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-green-200">✅ Album Fixed!</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Selected Album:</h3>
                <div className="bg-gray-900 rounded p-4">
                  {result.spotifyData.imageUrl && (
                    <img
                      src={result.spotifyData.imageUrl}
                      alt={result.spotifyData.name}
                      className="w-48 h-48 object-cover rounded mb-4"
                    />
                  )}
                  <p><strong>Name:</strong> {result.spotifyData.name}</p>
                  <p><strong>Artist:</strong> {result.spotifyData.artist}</p>
                  <p><strong>Year:</strong> {result.spotifyData.year}</p>
                  <p>
                    <strong>Spotify:</strong>{" "}
                    <a
                      href={result.spotifyData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      Open in Spotify
                    </a>
                  </p>
                </div>
              </div>

              {result.allResults && result.allResults.length > 1 && (
                <div>
                  <h3 className="font-semibold mb-2">All Spotify Results Found:</h3>
                  <div className="space-y-2">
                    {result.allResults.map((r, i) => (
                      <div key={i} className="bg-gray-900 rounded p-3 text-sm">
                        <p><strong>{i + 1}.</strong> {r.name}</p>
                        <p className="text-gray-400">
                          {r.artist} ({r.year})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
