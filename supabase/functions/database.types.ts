export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookmarks: {
        Row: {
          created_at: string | null
          fact_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fact_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          fact_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_fact_id_fkey"
            columns: ["fact_id"]
            isOneToOne: false
            referencedRelation: "facts"
            referencedColumns: ["id"]
          },
        ]
      }
      facts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          locale: string
          source_name: string | null
          source_url: string | null
          topic_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          locale?: string
          source_name?: string | null
          source_url?: string | null
          topic_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          locale?: string
          source_name?: string | null
          source_url?: string | null
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          last_active_date: string | null
          onboarding_complete: boolean | null
          preferred_locale: string
          quiz_last_active_date: string | null
          quiz_streak_count: number
          streak_count: number | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          last_active_date?: string | null
          onboarding_complete?: boolean | null
          preferred_locale?: string
          quiz_last_active_date?: string | null
          quiz_streak_count?: number
          streak_count?: number | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          last_active_date?: string | null
          onboarding_complete?: boolean | null
          preferred_locale?: string
          quiz_last_active_date?: string | null
          quiz_streak_count?: number
          streak_count?: number | null
          username?: string | null
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          session_id: string
          time_ms: number
          user_answer: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          session_id: string
          time_ms?: number
          user_answer: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          session_id?: string
          time_ms?: number
          user_answer?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["quiz_difficulty"]
          fact_id: string | null
          id: string
          locale: string
          options: Json
          question_text: string
          question_type: Database["public"]["Enums"]["quiz_question_type"]
          source: Database["public"]["Enums"]["quiz_question_source"]
          topic_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          fact_id?: string | null
          id?: string
          locale?: string
          options?: Json
          question_text: string
          question_type: Database["public"]["Enums"]["quiz_question_type"]
          source?: Database["public"]["Enums"]["quiz_question_source"]
          topic_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          fact_id?: string | null
          id?: string
          locale?: string
          options?: Json
          question_text?: string
          question_type?: Database["public"]["Enums"]["quiz_question_type"]
          source?: Database["public"]["Enums"]["quiz_question_source"]
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_fact_id_fkey"
            columns: ["fact_id"]
            isOneToOne: false
            referencedRelation: "facts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_session_questions: {
        Row: {
          question_id: string
          session_id: string
          sort_order: number
        }
        Insert: {
          question_id: string
          session_id: string
          sort_order: number
        }
        Update: {
          question_id?: string
          session_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_session_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_session_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_session_topics: {
        Row: {
          session_id: string
          topic_id: string
        }
        Insert: {
          session_id: string
          topic_id: string
        }
        Update: {
          session_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_session_topics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_session_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          completed_at: string | null
          composite_score: number
          difficulty: Database["public"]["Enums"]["quiz_difficulty"]
          duration_ms: number
          id: string
          include_bookmarks: boolean
          question_count: number
          score_correct: number
          started_at: string
          status: Database["public"]["Enums"]["quiz_session_status"]
          topic_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          composite_score?: number
          difficulty: Database["public"]["Enums"]["quiz_difficulty"]
          duration_ms?: number
          id?: string
          include_bookmarks?: boolean
          question_count: number
          score_correct?: number
          started_at?: string
          status?: Database["public"]["Enums"]["quiz_session_status"]
          topic_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          composite_score?: number
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          duration_ms?: number
          id?: string
          include_bookmarks?: boolean
          question_count?: number
          score_correct?: number
          started_at?: string
          status?: Database["public"]["Enums"]["quiz_session_status"]
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          color: string
          created_at: string | null
          description: string | null
          icon: string
          id: string
          name: string
        }
        Insert: {
          color: string
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_topics: {
        Row: {
          created_at: string | null
          id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      quiz_difficulty: "easy" | "medium" | "hard"
      quiz_question_source: "ai" | "user" | "bookmark"
      quiz_question_type: "mcq" | "true_false"
      quiz_session_status: "loading" | "active" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
