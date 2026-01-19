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
          curator_message: string | null
          published_at: string | null
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
          curator_message?: string | null
          published_at?: string | null
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
          curator_message?: string | null
          published_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          id: string
          name: string
          email: string
          auth_user_id: string | null
          is_curator: boolean
          email_subscribed: boolean
          unsubscribe_token: string
          reminder_email_subscribed: boolean
          reminder_unsubscribe_token: string
          referred_by: string | null
          referral_count: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          auth_user_id?: string | null
          is_curator?: boolean
          email_subscribed?: boolean
          unsubscribe_token?: string
          reminder_email_subscribed?: boolean
          reminder_unsubscribe_token?: string
          referred_by?: string | null
          referral_count?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          auth_user_id?: string | null
          is_curator?: boolean
          email_subscribed?: boolean
          unsubscribe_token?: string
          reminder_email_subscribed?: boolean
          reminder_unsubscribe_token?: string
          referred_by?: string | null
          referral_count?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
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
          moderation_status: 'pending' | 'approved' | 'hidden'
          moderated_at: string | null
          moderated_by: string | null
          moderation_notes: string | null
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
          moderation_status?: 'pending' | 'approved' | 'hidden'
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
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
          moderation_status?: 'pending' | 'approved' | 'hidden'
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      email_logs: {
        Row: {
          id: number
          week_number: number
          participant_id: string | null
          participant_email: string
          status: string
          sent_at: string | null
          resend_id: string | null
          error_message: string | null
        }
        Insert: {
          id?: number
          week_number: number
          participant_id?: string | null
          participant_email: string
          status: string
          sent_at?: string | null
          resend_id?: string | null
          error_message?: string | null
        }
        Update: {
          id?: number
          week_number?: number
          participant_id?: string | null
          participant_email?: string
          status?: string
          sent_at?: string | null
          resend_id?: string | null
          error_message?: string | null
        }
        Relationships: []
      }
      email_sends: {
        Row: {
          id: string
          week_number: number
          email_type: string
          subject: string
          html_body: string
          text_body: string
          created_by: string | null
          source_send_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          week_number: number
          email_type: string
          subject: string
          html_body: string
          text_body: string
          created_by?: string | null
          source_send_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          week_number?: number
          email_type?: string
          subject?: string
          html_body?: string
          text_body?: string
          created_by?: string | null
          source_send_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      email_send_recipients: {
        Row: {
          id: string
          send_id: string
          participant_id: string | null
          participant_email: string
          status: 'queued' | 'sent' | 'failed'
          sent_at: string | null
          resend_id: string | null
          error_message: string | null
        }
        Insert: {
          id?: string
          send_id: string
          participant_id?: string | null
          participant_email: string
          status: 'queued' | 'sent' | 'failed'
          sent_at?: string | null
          resend_id?: string | null
          error_message?: string | null
        }
        Update: {
          id?: string
          send_id?: string
          participant_id?: string | null
          participant_email?: string
          status?: 'queued' | 'sent' | 'failed'
          sent_at?: string | null
          resend_id?: string | null
          error_message?: string | null
        }
        Relationships: []
      }
      review_submission_logs: {
        Row: {
          id: string
          request_id: string
          week_number: number | null
          participant_email: string | null
          participant_id: string | null
          status: 'validation_failed' | 'participant_not_found' | 'db_error' | 'unexpected_error'
          error_message: string | null
          error_code: string | null
          error_details: Json | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          week_number?: number | null
          participant_email?: string | null
          participant_id?: string | null
          status: 'validation_failed' | 'participant_not_found' | 'db_error' | 'unexpected_error'
          error_message?: string | null
          error_code?: string | null
          error_details?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          week_number?: number | null
          participant_email?: string | null
          participant_id?: string | null
          status?: 'validation_failed' | 'participant_not_found' | 'db_error' | 'unexpected_error'
          error_message?: string | null
          error_code?: string | null
          error_details?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      _migrations: {
        Row: {
          id: number
          name: string
          applied_at: string
          checksum: string
          execution_time_ms: number | null
          success: boolean
          error_message: string | null
        }
        Insert: {
          id?: number
          name: string
          applied_at?: string
          checksum: string
          execution_time_ms?: number | null
          success?: boolean
          error_message?: string | null
        }
        Update: {
          id?: number
          name?: string
          applied_at?: string
          checksum?: string
          execution_time_ms?: number | null
          success?: boolean
          error_message?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          id: string
          referrer_id: string
          invitee_email: string
          invitee_name: string | null
          invite_token: string
          status: 'pending' | 'approved' | 'rejected' | 'accepted'
          reviewed_by: string | null
          reviewed_at: string | null
          review_notes: string | null
          accepted_at: string | null
          invitee_participant_id: string | null
          invite_method: 'email' | 'weekly_email_forward'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          invitee_email: string
          invitee_name?: string | null
          invite_token?: string
          status?: 'pending' | 'approved' | 'rejected' | 'accepted'
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          accepted_at?: string | null
          invitee_participant_id?: string | null
          invite_method: 'email' | 'weekly_email_forward'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          invitee_email?: string
          invitee_name?: string | null
          invite_token?: string
          status?: 'pending' | 'approved' | 'rejected' | 'accepted'
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          accepted_at?: string | null
          invitee_participant_id?: string | null
          invite_method?: 'email' | 'weekly_email_forward'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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

export type Invitation = Database['public']['Tables']['invitations']['Row']
export type InvitationInsert = Database['public']['Tables']['invitations']['Insert']
export type InvitationUpdate = Database['public']['Tables']['invitations']['Update']

// Joined types for common queries
export type ReviewWithParticipant = Review & {
  participant: Participant
}

export type ReviewWithModeration = Review & {
  participant?: Participant
  moderator?: Participant | null
}

export type WeekWithReviews = Week & {
  reviews?: ReviewWithParticipant[]
}

export type InvitationWithReferrer = Invitation & {
  referrer: Participant
  reviewer?: Participant | null
  invitee?: Participant | null
}

// Moderation types
export type ModerationAction = 'approve' | 'hide' | 'unhide'
export type ModerationStatus = 'pending' | 'approved' | 'hidden'

// Invitation types
export type InvitationStatus = 'pending' | 'approved' | 'rejected' | 'accepted'
export type InviteMethod = 'email' | 'weekly_email_forward'

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
