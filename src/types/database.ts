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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      currencies: {
        Row: {
          code: string
          created_at: string
          flag_emoji: string
          has_official: boolean
          is_active: boolean
          name: string
          sort_order: number
          tracked_parallel: boolean
        }
        Insert: {
          code: string
          created_at?: string
          flag_emoji: string
          has_official?: boolean
          is_active?: boolean
          name: string
          sort_order: number
          tracked_parallel?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          flag_emoji?: string
          has_official?: boolean
          is_active?: boolean
          name?: string
          sort_order?: number
          tracked_parallel?: boolean
        }
        Relationships: []
      }
      currency_source_labels: {
        Row: {
          created_at: string
          currency_code: string
          upstream_label: string
        }
        Insert: {
          created_at?: string
          currency_code: string
          upstream_label: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          upstream_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "currency_source_labels_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      news_items: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          is_active: boolean
          published_at: string | null
          sort_order: number
          source_domain: string
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          published_at?: string | null
          sort_order?: number
          source_domain: string
          title: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          published_at?: string | null
          sort_order?: number
          source_domain?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_items_source_domain_fkey"
            columns: ["source_domain"]
            isOneToOne: false
            referencedRelation: "news_sources"
            referencedColumns: ["domain"]
          },
        ]
      }
      news_sources: {
        Row: {
          created_at: string
          domain: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          domain: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          domain?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
        }
        Insert: {
          created_at?: string
          id: string
          is_admin?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
        }
        Relationships: []
      }
      rate_alerts: {
        Row: {
          active: boolean
          created_at: string
          currency_code: string
          direction: Database["public"]["Enums"]["alert_direction"]
          expo_push_token: string
          id: string
          last_fired_at: string | null
          last_seen_rate: number | null
          market: Database["public"]["Enums"]["market"]
          threshold: number
          user_id: string
          watched_side: Database["public"]["Enums"]["watched_side"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency_code: string
          direction: Database["public"]["Enums"]["alert_direction"]
          expo_push_token: string
          id?: string
          last_fired_at?: string | null
          last_seen_rate?: number | null
          market: Database["public"]["Enums"]["market"]
          threshold: number
          user_id: string
          watched_side: Database["public"]["Enums"]["watched_side"]
        }
        Update: {
          active?: boolean
          created_at?: string
          currency_code?: string
          direction?: Database["public"]["Enums"]["alert_direction"]
          expo_push_token?: string
          id?: string
          last_fired_at?: string | null
          last_seen_rate?: number | null
          market?: Database["public"]["Enums"]["market"]
          threshold?: number
          user_id?: string
          watched_side?: Database["public"]["Enums"]["watched_side"]
        }
        Relationships: [
          {
            foreignKeyName: "rate_alerts_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      rates: {
        Row: {
          buy: number | null
          central: number | null
          created_at: string
          created_by: string | null
          currency_code: string
          id: string
          market: Database["public"]["Enums"]["market"]
          rate_date: string | null
          sell: number | null
          source_label: Database["public"]["Enums"]["rate_source"]
        }
        Insert: {
          buy?: number | null
          central?: number | null
          created_at?: string
          created_by?: string | null
          currency_code: string
          id?: string
          market: Database["public"]["Enums"]["market"]
          rate_date?: string | null
          sell?: number | null
          source_label: Database["public"]["Enums"]["rate_source"]
        }
        Update: {
          buy?: number | null
          central?: number | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          market?: Database["public"]["Enums"]["market"]
          rate_date?: string | null
          sell?: number | null
          source_label?: Database["public"]["Enums"]["rate_source"]
        }
        Relationships: [
          {
            foreignKeyName: "rates_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      system_events: {
        Row: {
          created_at: string
          detail: Json | null
          id: string
          kind: string
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          id?: string
          kind: string
        }
        Update: {
          created_at?: string
          detail?: Json | null
          id?: string
          kind?: string
        }
        Relationships: []
      }
    }
    Views: {
      latest_rates: {
        Row: {
          buy: number | null
          central: number | null
          created_at: string | null
          currency_code: string | null
          id: string | null
          market: Database["public"]["Enums"]["market"] | null
          rate_date: string | null
          sell: number | null
          source_label: Database["public"]["Enums"]["rate_source"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rates_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      purge_abandoned_anonymous_users: { Args: never; Returns: number }
    }
    Enums: {
      alert_direction: "above" | "below"
      market: "parallel" | "official"
      rate_source:
        | "Parallel market survey"
        | "Central Bank of Nigeria"
        | "Central Bank of Nigeria (manual entry)"
      watched_side: "buy" | "central" | "sell"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      alert_direction: ["above", "below"],
      market: ["parallel", "official"],
      rate_source: [
        "Parallel market survey",
        "Central Bank of Nigeria",
        "Central Bank of Nigeria (manual entry)",
      ],
      watched_side: ["buy", "central", "sell"],
    },
  },
} as const
