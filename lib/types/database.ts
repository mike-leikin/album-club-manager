// lib/types/database.ts
// TypeScript types for Supabase database schema
// These types match the actual database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      weeks: {
        Row: {
          id: string
          week_number: number
          response_deadline: string | null
          contemporary_title: string | null
          contemporary_artist: string | null
          contemporary_year: string | null
          contemporary_spotify_url: string | null
          contemporary_album_art_url: string | null
          classic_title: string | null
          classic_artist: string | null
          classic_year: string | null
          classic_spotify_url: string | null
          classic_album_art_url: string | null
          rs_rank: number | null
          created_at: string
        }
        Insert: {
          id?: string
          week_number: number
          response_deadline?: string | null
          contemporary_title?: string | null
          contemporary_artist?: string | null
          contemporary_year?: string | null
          contemporary_spotify_url?: string | null
          contemporary_album_art_url?: string | null
          classic_title?: string | null
          classic_artist?: string | null
          classic_year?: string | null
          classic_spotify_url?: string | null
          classic_album_art_url?: string | null
          rs_rank?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          week_number?: number
          response_deadline?: string | null
          contemporary_title?: string | null
          contemporary_artist?: string | null
          contemporary_year?: string | null
          contemporary_spotify_url?: string | null
          contemporary_album_art_url?: string | null
          classic_title?: string | null
          classic_artist?: string | null
          classic_year?: string | null
          classic_spotify_url?: string | null
          classic_album_art_url?: string | null
          rs_rank?: number | null
          created_at?: string
        }
      }
      participants: {
        Row: {
          id: string
          name: string
          email: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      reviews: {
        Row: {
          id: string
          week_number: number
          participant_id: string
          album_type: 'contemporary' | 'classic'
          rating: number
          favorite_track: string | null
          review_text: string | null
          album_recommendation: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          week_number: number
          participant_id: string
          album_type: 'contemporary' | 'classic'
          rating: number
          favorite_track?: string | null
          review_text?: string | null
          album_recommendation?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          week_number?: number
          participant_id?: string
          album_type?: 'contemporary' | 'classic'
          rating?: number
          favorite_track?: string | null
          review_text?: string | null
          album_recommendation?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rs_500_albums: {
        Row: {
          id: string
          rank: number
          artist: string
          album: string
          year: number | null
          already_covered: boolean
          spotify_id: string | null
          spotify_url: string | null
          album_art_url: string | null
          times_used: number
          last_used_week: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rank: number
          artist: string
          album: string
          year?: number | null
          already_covered?: boolean
          spotify_id?: string | null
          spotify_url?: string | null
          album_art_url?: string | null
          times_used?: number
          last_used_week?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rank?: number
          artist?: string
          album?: string
          year?: number | null
          already_covered?: boolean
          spotify_id?: string | null
          spotify_url?: string | null
          album_art_url?: string | null
          times_used?: number
          last_used_week?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Week = Database['public']['Tables']['weeks']['Row']
export type WeekInsert = Database['public']['Tables']['weeks']['Insert']
export type WeekUpdate = Database['public']['Tables']['weeks']['Update']

export type Participant = Database['public']['Tables']['participants']['Row']
export type ParticipantInsert = Database['public']['Tables']['participants']['Insert']
export type ParticipantUpdate = Database['public']['Tables']['participants']['Update']

export type Review = Database['public']['Tables']['reviews']['Row']
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert']
export type ReviewUpdate = Database['public']['Tables']['reviews']['Update']

export type RS500Album = Database['public']['Tables']['rs_500_albums']['Row']
export type RS500AlbumInsert = Database['public']['Tables']['rs_500_albums']['Insert']
export type RS500AlbumUpdate = Database['public']['Tables']['rs_500_albums']['Update']

// Joined types for common queries
export type ReviewWithParticipant = Review & {
  participant: Participant
}

export type WeekWithReviews = Week & {
  reviews?: ReviewWithParticipant[]
}

// Stats types
export type AlbumStats = {
  album_type: 'contemporary' | 'classic'
  count: number
  avg_rating: number
  min_rating: number
  max_rating: number
}

export type WeekStats = {
  week_number: number
  contemporary_stats: AlbumStats | null
  classic_stats: AlbumStats | null
}
