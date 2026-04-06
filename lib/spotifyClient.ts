/**
 * Spotify API Client
 * Handles authentication, token management, and API requests
 */

// Types for Spotify API responses
export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyAlbumSimplified {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  release_date: string;
  images: SpotifyImage[];
  external_urls: {
    spotify: string;
  };
  uri: string;
}

export interface SpotifyAlbumFull extends SpotifyAlbumSimplified {
  genres: string[];
  label: string;
  popularity: number;
  total_tracks: number;
  tracks: {
    items: Array<{
      id: string;
      name: string;
      track_number: number;
      duration_ms: number;
    }>;
  };
}

export interface SpotifySearchResponse {
  albums: {
    items: SpotifyAlbumSimplified[];
    total: number;
    limit: number;
    offset: number;
  };
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

class SpotifyClient {
  private clientId: string;
  private clientSecret: string;
  private tokenCache: TokenCache | null = null;

  constructor() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        'Spotify credentials not found. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.'
      );
    }

    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Get a valid access token, either from cache or by requesting a new one
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 5 * 60 * 1000) {
      return this.tokenCache.accessToken;
    }

    // Request new token using Client Credentials flow
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Spotify access token: ${response.status} ${error}`);
    }

    const data = await response.json();

    // Cache the token
    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
  }

  /**
   * Make an authenticated request to the Spotify API
   */
  private async makeRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const token = await this.getAccessToken();

    const url = new URL(`https://api.spotify.com/v1${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(
          `Spotify API rate limit exceeded. Retry after ${retryAfter} seconds.`
        );
      }

      const error = await response.text();
      throw new Error(`Spotify API request failed: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Search for albums by query string
   * @param query - Search query (e.g., "Kind of Blue Miles Davis")
   * @param limit - Number of results to return (default: 10, max: 50)
   */
  async searchAlbums(query: string, limit: number = 10): Promise<SpotifyAlbumSimplified[]> {
    if (!query.trim()) {
      throw new Error('Search query cannot be empty');
    }

    const response = await this.makeRequest<SpotifySearchResponse>('/search', {
      q: query,
      type: 'album',
      limit: Math.min(limit, 50).toString(),
    });

    return response.albums.items;
  }

  /**
   * Get full album details by Spotify ID
   * @param id - Spotify album ID
   */
  async getAlbum(id: string): Promise<SpotifyAlbumFull> {
    if (!id) {
      throw new Error('Album ID is required');
    }

    return this.makeRequest<SpotifyAlbumFull>(`/albums/${id}`);
  }

  /**
   * Get multiple albums at once (more efficient than individual requests)
   * @param ids - Array of Spotify album IDs (max 20)
   */
  async getAlbums(ids: string[]): Promise<SpotifyAlbumFull[]> {
    if (ids.length === 0) {
      throw new Error('At least one album ID is required');
    }

    if (ids.length > 20) {
      throw new Error('Maximum 20 album IDs allowed per request');
    }

    const response = await this.makeRequest<{ albums: SpotifyAlbumFull[] }>('/albums', {
      ids: ids.join(','),
    });

    return response.albums;
  }

  /**
   * Get new album releases from Spotify's browse endpoint
   * @param limit - Number of results to return (default: 20, max: 50)
   */
  async getNewReleases(limit: number = 20): Promise<SpotifyAlbumSimplified[]> {
    const response = await this.makeRequest<{ albums: { items: SpotifyAlbumSimplified[] } }>(
      '/browse/new-releases',
      { limit: Math.min(limit, 50).toString() }
    );
    return response.albums.items;
  }

  /**
   * Extract year from Spotify release_date
   * Spotify returns dates in various formats: YYYY, YYYY-MM, YYYY-MM-DD
   */
  static extractYear(releaseDate: string): string {
    return releaseDate.split('-')[0];
  }

  /**
   * Get the best quality image URL from an array of images
   * Returns the largest image available
   */
  static getBestImage(images: SpotifyImage[]): string | null {
    if (!images || images.length === 0) return null;

    // Images are typically returned in descending size order
    return images[0]?.url || null;
  }

  /**
   * Get a thumbnail image URL (smaller size for lists/previews)
   */
  static getThumbnailImage(images: SpotifyImage[]): string | null {
    if (!images || images.length === 0) return null;

    // Return the smallest image, or medium if available
    return images[images.length - 1]?.url || images[1]?.url || images[0]?.url || null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Playlist creation (requires user-level OAuth)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Exchange the stored refresh token for a short-lived user access token.
   * Requires SPOTIFY_USER_REFRESH_TOKEN to be set in the environment.
   */
  async getUserAccessToken(): Promise<string> {
    const refreshToken = process.env.SPOTIFY_USER_REFRESH_TOKEN;
    if (!refreshToken) {
      throw new Error('SPOTIFY_USER_REFRESH_TOKEN environment variable is not set');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Spotify user token refresh failed: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.access_token as string;
  }

  /**
   * Search for a track by name, optionally constrained to a specific album/artist.
   * Uses the app-level token (no user auth needed for search).
   * Returns the Spotify track URI or null if no match found.
   */
  async searchTrack(
    trackName: string,
    albumTitle?: string,
    artistName?: string
  ): Promise<string | null> {
    if (!trackName.trim()) return null;

    const parts = [`track:${trackName.trim()}`];
    if (albumTitle?.trim()) parts.push(`album:${albumTitle.trim()}`);
    if (artistName?.trim()) parts.push(`artist:${artistName.trim()}`);

    const response = await this.makeRequest<{
      tracks: { items: Array<{ uri: string }> };
    }>('/search', {
      q: parts.join(' '),
      type: 'track',
      limit: '1',
    });

    return response.tracks.items[0]?.uri ?? null;
  }

  /**
   * Create a new public playlist on a user's account.
   * Requires a user-level access token (from getUserAccessToken).
   * Returns the playlist ID and its public Spotify URL.
   */
  async createPlaylist(
    name: string,
    description: string,
    userAccessToken: string,
    spotifyUserId: string
  ): Promise<{ id: string; url: string }> {
    const response = await fetch(
      `https://api.spotify.com/v1/users/${encodeURIComponent(spotifyUserId)}/playlists`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description, public: true }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Spotify playlist: ${response.status} ${error}`);
    }

    const data = await response.json();
    return {
      id: data.id as string,
      url: data.external_urls.spotify as string,
    };
  }

  /**
   * Add tracks to an existing playlist.
   * Handles Spotify's 100-URI-per-request limit automatically.
   * Requires a user-level access token.
   */
  async addTracksToPlaylist(
    playlistId: string,
    trackUris: string[],
    userAccessToken: string
  ): Promise<void> {
    for (let i = 0; i < trackUris.length; i += 100) {
      const chunk = trackUris.slice(i, i + 100);
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${userAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uris: chunk }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to add tracks to playlist: ${response.status} ${error}`);
      }
    }
  }
}

// Export a singleton instance
export const spotifyClient = new SpotifyClient();
