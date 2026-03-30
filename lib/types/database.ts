export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      _migrations: {
        Row: {
          applied_at: string
          checksum: string
          error_message: string | null
          execution_time_ms: number | null
          id: number
          name: string
          success: boolean
        }
        Insert: {
          applied_at?: string
          checksum: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: number
          name: string
          success?: boolean
        }
        Update: {
          applied_at?: string
          checksum?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: number
          name?: string
          success?: boolean
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          error_message: string | null
          id: number
          participant_email: string
          participant_id: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
          week_number: number
        }
        Insert: {
          error_message?: string | null
          id?: number
          participant_email: string
          participant_id?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status: string
          week_number: number
        }
        Update: {
          error_message?: string | null
          id?: number
          participant_email?: string
          participant_id?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_participant"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "active_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_participant"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_week"
            columns: ["week_number"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["week_number"]
          },
        ]
      }
      email_send_recipients: {
        Row: {
          clicked_at: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          participant_email: string
          participant_id: string | null
          resend_id: string | null
          send_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          clicked_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          participant_email: string
          participant_id?: string | null
          resend_id?: string | null
          send_id: string
          sent_at?: string | null
          status: string
        }
        Update: {
          clicked_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          participant_email?: string
          participant_id?: string | null
          resend_id?: string | null
          send_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_send_recipients_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "active_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_recipients_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_recipients_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          created_at: string
          created_by: string | null
          email_type: string
          engagement_summary_sent_at: string | null
          html_body: string
          id: string
          source_send_id: string | null
          subject: string
          text_body: string
          week_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email_type: string
          engagement_summary_sent_at?: string | null
          html_body: string
          id?: string
          source_send_id?: string | null
          subject: string
          text_body: string
          week_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email_type?: string
          engagement_summary_sent_at?: string | null
          html_body?: string
          id?: string
          source_send_id?: string | null
          subject?: string
          text_body?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "active_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_source_send_id_fkey"
            columns: ["source_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_week_number_fkey"
            columns: ["week_number"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["week_number"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invite_method: string
          invite_token: string
          invitee_email: string
          invitee_name: string | null
          invitee_participant_id: string | null
          referrer_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_method: string
          invite_token?: string
          invitee_email: string
          invitee_name?: string | null
          invitee_participant_id?: string | null
          referrer_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_method?: string
          invite_token?: string
          invitee_email?: string
          invitee_name?: string | null
          invitee_participant_id?: string | null
          referrer_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invitee_participant_id_fkey"
            columns: ["invitee_participant_id"]
            isOneToOne: false
            referencedRelation: "active_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invitee_participant_id_fkey"
            columns: ["invitee_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "active_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "active_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          auth_user_id: string | null
          created_at: string
          deleted_at: string | null
          email: string
          email_subscribed: boolean | null
          id: string
          is_curator: boolean
          name: string
          referral_count: number
          referred_by: string | null
          reminder_email_subscribed: boolean | null
          reminder_unsubscribe_token: string | null
          unsubscribe_token: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          email_subscribed?: boolean | null
          id?: string
          is_curator?: boolean
          name: string
          referral_count?: number
          referred_by?: string | null
          reminder_email_subscribed?: boolean | null
          reminder_unsubscribe_token?: string | null
          unsubscribe_token?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          email_subscribed?: boolean | null
          id?: string
          is_curator?: boolean
          name?: string
          referral_count?: number
          referred_by?: string | null
          reminder_email_subscribed?: boolean | null
          reminder_unsubscribe_token?: string | null
          unsubscribe_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "active_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      review_submission_logs: {
        Row: {
          created_at: string
          error_code: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          metadata: Json | null
          participant_email: string | null
          participant_id: string | null
          request_id: string
          status: string
          week_number: number | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          participant_email?: string | null
          participant_id?: string | null
          request_id: string
          status: string
          week_number?: number | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          participant_email?: string | null
          participant_id?: string | null
          request_id?: string
          status?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "review_submission_logs_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "active_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_submission_logs_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          album_recommendation: string | null
          album_type: string
          created_at: string
          favorite_track: string | null
          id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_notes: string | null
          moderation_status: string
          participant_id: string
          rating: number
          review_text: string | null
          updated_at: string
          week_number: number
        }
        Insert: {
          album_recommendation?: string | null
          album_type: string
          created_at?: string
          favorite_track?: string | null
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          moderation_status?: string
          participant_id: string
          rating: number
          review_text?: string | null
          updated_at?: string
          week_number: number
        }
        Update: {
          album_recommendation?: string | null
          album_type?: string
          created_at?: string
          favorite_track?: string | null
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          moderation_status?: string
          participant_id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "active_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "active_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_500_albums: {
        Row: {
          album: string
          album_art_url: string | null
          already_covered: boolean | null
          artist: string
          created_at: string
          id: string
          last_used_week: number | null
          rank: number
          spotify_id: string | null
          spotify_url: string | null
          times_used: number | null
          updated_at: string
          year: number | null
        }
        Insert: {
          album: string
          album_art_url?: string | null
          already_covered?: boolean | null
          artist: string
          created_at?: string
          id?: string
          last_used_week?: number | null
          rank: number
          spotify_id?: string | null
          spotify_url?: string | null
          times_used?: number | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          album?: string
          album_art_url?: string | null
          already_covered?: boolean | null
          artist?: string
          created_at?: string
          id?: string
          last_used_week?: number | null
          rank?: number
          spotify_id?: string | null
          spotify_url?: string | null
          times_used?: number | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      weeks: {
        Row: {
          classic_album_art_url: string | null
          classic_artist: string | null
          classic_spotify_url: string | null
          classic_title: string | null
          classic_year: string | null
          contemporary_album_art_url: string | null
          contemporary_artist: string | null
          contemporary_spotify_url: string | null
          contemporary_title: string | null
          contemporary_year: string | null
          created_at: string
          curator_message: string | null
          id: number
          published_at: string | null
          response_deadline: string | null
          rs_rank: number | null
          week_number: number
        }
        Insert: {
          classic_album_art_url?: string | null
          classic_artist?: string | null
          classic_spotify_url?: string | null
          classic_title?: string | null
          classic_year?: string | null
          contemporary_album_art_url?: string | null
          contemporary_artist?: string | null
          contemporary_spotify_url?: string | null
          contemporary_title?: string | null
          contemporary_year?: string | null
          created_at?: string
          curator_message?: string | null
          id?: number
          published_at?: string | null
          response_deadline?: string | null
          rs_rank?: number | null
          week_number: number
        }
        Update: {
          classic_album_art_url?: string | null
          classic_artist?: string | null
          classic_spotify_url?: string | null
          classic_title?: string | null
          classic_year?: string | null
          contemporary_album_art_url?: string | null
          contemporary_artist?: string | null
          contemporary_spotify_url?: string | null
          contemporary_title?: string | null
          contemporary_year?: string | null
          created_at?: string
          curator_message?: string | null
          id?: number
          published_at?: string | null
          response_deadline?: string | null
          rs_rank?: number | null
          week_number?: number
        }
        Relationships: []
      }
    }
    Views: {
      active_participants: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          email_subscribed: boolean | null
          id: string | null
          is_curator: boolean | null
          name: string | null
          unsubscribe_token: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_subscribed?: boolean | null
          id?: string | null
          is_curator?: boolean | null
          name?: string | null
          unsubscribe_token?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_subscribed?: boolean | null
          id?: string | null
          is_curator?: boolean | null
          name?: string | null
          unsubscribe_token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_curator:
        | { Args: never; Returns: boolean }
        | { Args: { user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

export type Review = Tables<"reviews">
export type Week = Tables<"weeks">
export type Participant = Tables<"participants">
export type ParticipantInsert = TablesInsert<"participants">
export type RS500Album = Tables<"rs_500_albums">
