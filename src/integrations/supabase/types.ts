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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      americano_rounds: {
        Row: {
          id: string
          player1: string
          player2: string
          player3: string
          player4: string
          round_number: number
          session_id: string
          team_a_points: number
          team_b_points: number
          total_points: number
        }
        Insert: {
          id?: string
          player1: string
          player2: string
          player3: string
          player4: string
          round_number: number
          session_id: string
          team_a_points: number
          team_b_points: number
          total_points: number
        }
        Update: {
          id?: string
          player1?: string
          player2?: string
          player3?: string
          player4?: string
          round_number?: number
          session_id?: string
          team_a_points?: number
          team_b_points?: number
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "americano_rounds_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "americano_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      americano_sessions: {
        Row: {
          created_at: string
          hosted_by: string
          id: string
          played_at: string
          status: string
        }
        Insert: {
          created_at?: string
          hosted_by: string
          id?: string
          played_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          hosted_by?: string
          id?: string
          played_at?: string
          status?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          user_1_id: string
          user_2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          user_1_id: string
          user_2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          user_1_id?: string
          user_2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      club_announcements: {
        Row: {
          author_id: string
          club_id: string
          content: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          author_id: string
          club_id: string
          content: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          author_id?: string
          club_id?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_announcements_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_followers: {
        Row: {
          club_id: string
          created_at: string
          id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_followers_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          instagram_url: string | null
          is_private: boolean
          logo_url: string | null
          name: string
          num_courts: number | null
          owner_id: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_url?: string | null
          is_private?: boolean
          logo_url?: string | null
          name: string
          num_courts?: number | null
          owner_id: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_url?: string | null
          is_private?: boolean
          logo_url?: string | null
          name?: string
          num_courts?: number | null
          owner_id?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      conversation_preferences: {
        Row: {
          archived: boolean
          conversation_id: string
          created_at: string
          deleted: boolean
          id: string
          last_read_at: string | null
          muted: boolean
          pinned: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          conversation_id: string
          created_at?: string
          deleted?: boolean
          id?: string
          last_read_at?: string | null
          muted?: boolean
          pinned?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          conversation_id?: string
          created_at?: string
          deleted?: boolean
          id?: string
          last_read_at?: string | null
          muted?: boolean
          pinned?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      court_messages: {
        Row: {
          created_at: string
          game_id: string
          id: string
          message: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          message: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          message?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_messages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      elo_history: {
        Row: {
          created_at: string
          id: string
          match_id: string | null
          new_rating: number
          old_rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id?: string | null
          new_rating: number
          old_rating: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string | null
          new_rating?: number
          old_rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elo_history_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_messages: {
        Row: {
          created_at: string
          game_id: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_messages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          game_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          game_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          game_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          allow_substitutions: boolean
          booking_screenshot_url: string | null
          club_id: string | null
          court_number: string | null
          court_taken_by: string | null
          created_at: string
          date_time: string
          description: string | null
          end_date_time: string | null
          format: Database["public"]["Enums"]["game_format"]
          host_id: string
          host_is_playing: boolean
          id: string
          join_mode: string
          location: string
          max_players: number
          payment_deadline_hours: number | null
          payment_instructions: string | null
          payment_mode: string
          prefilled_players: Json
          price_mode: string
          price_per_player: number
          scoreboard: Json | null
          skill_level: number
          slug: string | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_type"]
        }
        Insert: {
          allow_substitutions?: boolean
          booking_screenshot_url?: string | null
          club_id?: string | null
          court_number?: string | null
          court_taken_by?: string | null
          created_at?: string
          date_time: string
          description?: string | null
          end_date_time?: string | null
          format?: Database["public"]["Enums"]["game_format"]
          host_id: string
          host_is_playing?: boolean
          id?: string
          join_mode?: string
          location: string
          max_players?: number
          payment_deadline_hours?: number | null
          payment_instructions?: string | null
          payment_mode?: string
          prefilled_players?: Json
          price_mode?: string
          price_per_player?: number
          scoreboard?: Json | null
          skill_level?: number
          slug?: string | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_type"]
        }
        Update: {
          allow_substitutions?: boolean
          booking_screenshot_url?: string | null
          club_id?: string | null
          court_number?: string | null
          court_taken_by?: string | null
          created_at?: string
          date_time?: string
          description?: string | null
          end_date_time?: string | null
          format?: Database["public"]["Enums"]["game_format"]
          host_id?: string
          host_is_playing?: boolean
          id?: string
          join_mode?: string
          location?: string
          max_players?: number
          payment_deadline_hours?: number | null
          payment_instructions?: string | null
          payment_mode?: string
          prefilled_players?: Json
          price_mode?: string
          price_per_player?: number
          scoreboard?: Json | null
          skill_level?: number
          slug?: string | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_type"]
        }
        Relationships: [
          {
            foreignKeyName: "games_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      interests: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          created_at: string
          game_id: string
          id: string
          note: string | null
          payment_due_at: string | null
          payment_screenshot_url: string | null
          payment_status: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          note?: string | null
          payment_due_at?: string | null
          payment_screenshot_url?: string | null
          payment_status?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          note?: string | null
          payment_due_at?: string | null
          payment_screenshot_url?: string | null
          payment_status?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      match_invites: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          game_id: string
          id: string
          token: string
          use_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          game_id: string
          id?: string
          token?: string
          use_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          game_id?: string
          id?: string
          token?: string
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_invites_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          created_at: string
          id: string
          match_id: string
          team: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          team: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          team?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_submissions: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          expires_at: string
          id: string
          match_type: string
          played_at: string
          rating_processed: boolean
          set1_a: number
          set1_b: number
          set2_a: number
          set2_b: number
          set3_a: number | null
          set3_b: number | null
          status: string
          submitted_by: string
          team_a_player1: string
          team_a_player2: string
          team_b_player1: string
          team_b_player2: string
          weight: number
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          match_type?: string
          played_at?: string
          rating_processed?: boolean
          set1_a: number
          set1_b: number
          set2_a: number
          set2_b: number
          set3_a?: number | null
          set3_b?: number | null
          status?: string
          submitted_by: string
          team_a_player1: string
          team_a_player2: string
          team_b_player1: string
          team_b_player2: string
          weight?: number
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          match_type?: string
          played_at?: string
          rating_processed?: boolean
          set1_a?: number
          set1_b?: number
          set2_a?: number
          set2_b?: number
          set3_a?: number | null
          set3_b?: number | null
          status?: string
          submitted_by?: string
          team_a_player1?: string
          team_a_player2?: string
          team_b_player1?: string
          team_b_player2?: string
          weight?: number
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          game_id: string
          id: string
          round_number: number
          set_scores: Json | null
          status: string
          team1_score: number | null
          team2_score: number | null
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          round_number?: number
          set_scores?: Json | null
          status?: string
          team1_score?: number | null
          team2_score?: number | null
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          round_number?: number
          set_scores?: Json | null
          status?: string
          team1_score?: number | null
          team2_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bank_details: string | null
          bank_qr_url: string | null
          bio: string | null
          birth_year: number | null
          created_at: string
          elo_rating: number
          friend_code: string | null
          games_played: number | null
          id: string
          name: string
          pdr_anchored: boolean
          pdr_internal_rating: number
          pdr_last_match_at: string | null
          pdr_matches_count: number
          pdr_phase: string
          pdr_rating: number | null
          pdr_rd: number
          pdr_reliability: number
          pdr_sigma: number
          preferred_hand: string | null
          preferred_position: string | null
          region: string | null
          sex: string | null
          skill_level: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bank_details?: string | null
          bank_qr_url?: string | null
          bio?: string | null
          birth_year?: number | null
          created_at?: string
          elo_rating?: number
          friend_code?: string | null
          games_played?: number | null
          id?: string
          name: string
          pdr_anchored?: boolean
          pdr_internal_rating?: number
          pdr_last_match_at?: string | null
          pdr_matches_count?: number
          pdr_phase?: string
          pdr_rating?: number | null
          pdr_rd?: number
          pdr_reliability?: number
          pdr_sigma?: number
          preferred_hand?: string | null
          preferred_position?: string | null
          region?: string | null
          sex?: string | null
          skill_level?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bank_details?: string | null
          bank_qr_url?: string | null
          bio?: string | null
          birth_year?: number | null
          created_at?: string
          elo_rating?: number
          friend_code?: string | null
          games_played?: number | null
          id?: string
          name?: string
          pdr_anchored?: boolean
          pdr_internal_rating?: number
          pdr_last_match_at?: string | null
          pdr_matches_count?: number
          pdr_phase?: string
          pdr_rating?: number | null
          pdr_rd?: number
          pdr_reliability?: number
          pdr_sigma?: number
          preferred_hand?: string | null
          preferred_position?: string | null
          region?: string | null
          sex?: string | null
          skill_level?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rating_history: {
        Row: {
          created_at: string
          id: string
          internal_rating_after: number | null
          match_id: string | null
          player_id: string
          rating_after: number
          rating_change: number
          rd_after: number
        }
        Insert: {
          created_at?: string
          id?: string
          internal_rating_after?: number | null
          match_id?: string | null
          player_id: string
          rating_after: number
          rating_change: number
          rd_after: number
        }
        Update: {
          created_at?: string
          id?: string
          internal_rating_after?: number | null
          match_id?: string | null
          player_id?: string
          rating_after?: number
          rating_change?: number
          rd_after?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_club_admin: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_club_member: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_game_admin: {
        Args: { _game_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      game_format: "casual_match" | "americano" | "team_americano"
      request_status: "pending" | "accepted" | "rejected"
      visibility_type: "public" | "private" | "club_only"
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
    Enums: {
      game_format: ["casual_match", "americano", "team_americano"],
      request_status: ["pending", "accepted", "rejected"],
      visibility_type: ["public", "private", "club_only"],
    },
  },
} as const
