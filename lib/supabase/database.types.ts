// GENERATED. Never hand-edited.
// Regenerate with: npm run db:types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          clinic_name: string | null
          created_at: string
          doctor_name: string | null
          id: string
          location: string | null
          notes: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_name?: string | null
          created_at?: string
          doctor_name?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_name?: string | null
          created_at?: string
          doctor_name?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      baby_name_favorites: {
        Row: {
          baby_name_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          baby_name_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          baby_name_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "baby_name_favorites_baby_name_id_fkey"
            columns: ["baby_name_id"]
            isOneToOne: false
            referencedRelation: "baby_names"
            referencedColumns: ["id"]
          },
        ]
      }
      baby_names: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          meaning_en: string
          meaning_hi: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          meaning_en: string
          meaning_hi: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          meaning_en?: string
          meaning_hi?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          answer_kind: string | null
          body: string
          created_at: string
          id: string
          retrieved_passage_ids: string[]
          role: string
          user_id: string
        }
        Insert: {
          answer_kind?: string | null
          body: string
          created_at?: string
          id?: string
          retrieved_passage_ids?: string[]
          role: string
          user_id: string
        }
        Update: {
          answer_kind?: string | null
          body?: string
          created_at?: string
          id?: string
          retrieved_passage_ids?: string[]
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          body: string
          created_at: string
          feeling: string | null
          id: string
          input_method: string
          matched_rule_id: string | null
          pregnancy_id: string | null
          severity: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          feeling?: string | null
          id?: string
          input_method: string
          matched_rule_id?: string | null
          pregnancy_id?: string | null
          severity?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          feeling?: string | null
          id?: string
          input_method?: string
          matched_rule_id?: string | null
          pregnancy_id?: string | null
          severity?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_pregnancy_owned_by_same_user"
            columns: ["pregnancy_id", "user_id"]
            isOneToOne: false
            referencedRelation: "pregnancies"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          item_key: string
          label: string
          locale: string
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          item_key: string
          label: string
          locale: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          item_key?: string
          label?: string
          locale?: string
          sort_order?: number
        }
        Relationships: []
      }
      checklist_progress: {
        Row: {
          done: boolean
          id: string
          item_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          done?: boolean
          id?: string
          item_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          done?: boolean
          id?: string
          item_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          consent_key: string
          granted: boolean
          granted_at: string
          id: string
          locale: string
          seq: number
          user_id: string
          version: string
        }
        Insert: {
          consent_key: string
          granted: boolean
          granted_at?: string
          id?: string
          locale: string
          seq?: never
          user_id: string
          version: string
        }
        Update: {
          consent_key?: string
          granted?: boolean
          granted_at?: string
          id?: string
          locale?: string
          seq?: never
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      content_items: {
        Row: {
          body_md: string | null
          category: string | null
          citation: string
          created_at: string
          duration_seconds: number | null
          id: string
          is_published: boolean
          kind: string
          locale: string
          media_url: string | null
          narration_url: string | null
          slug: string
          summary: string | null
          tags: string[]
          title: string
          week_max: number | null
          week_min: number | null
        }
        Insert: {
          body_md?: string | null
          category?: string | null
          citation: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_published?: boolean
          kind: string
          locale: string
          media_url?: string | null
          narration_url?: string | null
          slug: string
          summary?: string | null
          tags?: string[]
          title: string
          week_max?: number | null
          week_min?: number | null
        }
        Update: {
          body_md?: string | null
          category?: string | null
          citation?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_published?: boolean
          kind?: string
          locale?: string
          media_url?: string | null
          narration_url?: string | null
          slug?: string
          summary?: string | null
          tags?: string[]
          title?: string
          week_max?: number | null
          week_min?: number | null
        }
        Relationships: []
      }
      content_passages: {
        Row: {
          body: string
          content_item_id: string
          created_at: string
          heading: string | null
          id: string
          locale: string
          search_tsv: unknown
        }
        Insert: {
          body: string
          content_item_id: string
          created_at?: string
          heading?: string | null
          id?: string
          locale: string
          search_tsv?: unknown
        }
        Update: {
          body?: string
          content_item_id?: string
          created_at?: string
          heading?: string | null
          id?: string
          locale?: string
          search_tsv?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "passage_locale_matches_item"
            columns: ["content_item_id", "locale"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id", "locale"]
          },
        ]
      }
      contraction_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contractions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          session_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          session_id: string
          started_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          session_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractions_session_owned_by_same_user"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "contraction_sessions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      custom_questions: {
        Row: {
          body: string
          created_at: string
          id: string
          is_marked: boolean
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_marked?: boolean
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_marked?: boolean
          user_id?: string
        }
        Relationships: []
      }
      doctor_advice: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          is_reminder: boolean
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          is_reminder?: boolean
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          is_reminder?: boolean
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advice_appointment_owned_by_same_user"
            columns: ["appointment_id", "user_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      doctor_advice_updates: {
        Row: {
          advice_id: string
          body: string
          created_at: string
          doctor_name: string | null
          id: string
          input_method: string
          user_id: string
        }
        Insert: {
          advice_id: string
          body: string
          created_at?: string
          doctor_name?: string | null
          id?: string
          input_method: string
          user_id: string
        }
        Update: {
          advice_id?: string
          body?: string
          created_at?: string
          doctor_name?: string | null
          id?: string
          input_method?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_advice_updates_owned_by_same_user"
            columns: ["advice_id", "user_id"]
            isOneToOne: false
            referencedRelation: "doctor_advice"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_safety_items: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          locale: string
          long_text: string
          name: string
          short_text: string
          sort_order: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          locale: string
          long_text: string
          name: string
          short_text: string
          sort_order?: number
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          locale?: string
          long_text?: string
          name?: string
          short_text?: string
          sort_order?: number
          status?: string
        }
        Relationships: []
      }
      guide_faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_active: boolean
          locale: string
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_active?: boolean
          locale: string
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          locale?: string
          question?: string
          sort_order?: number
        }
        Relationships: []
      }
      guide_schemes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          locale: string
          long_text: string
          name: string
          short_text: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          locale: string
          long_text: string
          name: string
          short_text: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          locale?: string
          long_text?: string
          name?: string
          short_text?: string
          sort_order?: number
        }
        Relationships: []
      }
      kick_events: {
        Row: {
          id: string
          occurred_at: string
          session_id: string
          tap_id: string
          user_id: string
        }
        Insert: {
          id?: string
          occurred_at?: string
          session_id: string
          tap_id: string
          user_id: string
        }
        Update: {
          id?: string
          occurred_at?: string
          session_id?: string
          tap_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kick_event_session_owned_by_same_user"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "kick_sessions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      kick_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          pregnancy_id: string | null
          started_at: string
          target_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          pregnancy_id?: string | null
          started_at?: string
          target_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          pregnancy_id?: string | null
          started_at?: string
          target_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kick_pregnancy_owned_by_same_user"
            columns: ["pregnancy_id", "user_id"]
            isOneToOne: false
            referencedRelation: "pregnancies"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      letters: {
        Row: {
          body: string
          created_at: string
          gestational_week: number
          id: string
          pregnancy_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          gestational_week: number
          id?: string
          pregnancy_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          gestational_week?: number
          id?: string
          pregnancy_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "letters_pregnancy_owned_by_same_user"
            columns: ["pregnancy_id", "user_id"]
            isOneToOne: false
            referencedRelation: "pregnancies"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      medicine_logs: {
        Row: {
          id: string
          logged_at: string
          medicine_id: string
          scheduled_date: string
          scheduled_time: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          logged_at?: string
          medicine_id: string
          scheduled_date: string
          scheduled_time: string
          status: string
          user_id: string
        }
        Update: {
          id?: string
          logged_at?: string
          medicine_id?: string
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicine_logs_medicine_owned_by_same_user"
            columns: ["medicine_id", "user_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      medicines: {
        Row: {
          created_at: string
          days_of_week: number[] | null
          dosage: string | null
          end_date: string | null
          form: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          schedule_times: string[]
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[] | null
          dosage?: string | null
          end_date?: string | null
          form?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          schedule_times?: string[]
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[] | null
          dosage?: string | null
          end_date?: string | null
          form?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          schedule_times?: string[]
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pregnancies: {
        Row: {
          baby_name: string[]
          birth_notes: string | null
          created_at: string
          edd: string
          edd_source: string
          ended_at: string | null
          ended_reason: string | null
          id: string
          lmp_date: string | null
          pregnancy_flags: string[]
          status: string
          twin_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          baby_name?: string[]
          birth_notes?: string | null
          created_at?: string
          edd: string
          edd_source: string
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          lmp_date?: string | null
          pregnancy_flags?: string[]
          status?: string
          twin_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          baby_name?: string[]
          birth_notes?: string | null
          created_at?: string
          edd?: string
          edd_source?: string
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          lmp_date?: string | null
          pregnancy_flags?: string[]
          status?: string
          twin_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_year: number | null
          city: string | null
          clinic_name: string | null
          created_at: string
          display_name: string
          doctor_name: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          height_cm: number | null
          id: string
          is_first_pregnancy: boolean | null
          locale: string
          notification_privacy: string
          onboarding_completed_at: string | null
          pre_pregnancy_weight_kg: number | null
          updated_at: string
        }
        Insert: {
          birth_year?: number | null
          city?: string | null
          clinic_name?: string | null
          created_at?: string
          display_name: string
          doctor_name?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          height_cm?: number | null
          id: string
          is_first_pregnancy?: boolean | null
          locale?: string
          notification_privacy?: string
          onboarding_completed_at?: string | null
          pre_pregnancy_weight_kg?: number | null
          updated_at?: string
        }
        Update: {
          birth_year?: number | null
          city?: string | null
          clinic_name?: string | null
          created_at?: string
          display_name?: string
          doctor_name?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          height_cm?: number | null
          id?: string
          is_first_pregnancy?: boolean | null
          locale?: string
          notification_privacy?: string
          onboarding_completed_at?: string | null
          pre_pregnancy_weight_kg?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      question_marks: {
        Row: {
          created_at: string
          id: string
          suggested_question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          suggested_question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          suggested_question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_marks_suggested_question_id_fkey"
            columns: ["suggested_question_id"]
            isOneToOne: false
            referencedRelation: "suggested_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          mime_type: string
          page_count: number | null
          report_date: string
          report_type: string | null
          size_bytes: number
          storage_path: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type: string
          page_count?: number | null
          report_date: string
          report_type?: string | null
          size_bytes: number
          storage_path: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string
          page_count?: number | null
          report_date?: string
          report_type?: string | null
          size_bytes?: number
          storage_path?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      suggested_questions: {
        Row: {
          body: string
          id: string
          is_active: boolean
          locale: string
          priority: number
          week_max: number
          week_min: number
        }
        Insert: {
          body: string
          id?: string
          is_active?: boolean
          locale: string
          priority?: number
          week_max: number
          week_min: number
        }
        Update: {
          body?: string
          id?: string
          is_active?: boolean
          locale?: string
          priority?: number
          week_max?: number
          week_min?: number
        }
        Relationships: []
      }
      symptom_rules: {
        Row: {
          created_at: string
          guidance_body: string
          guidance_title: string
          id: string
          is_active: boolean
          locale: string
          match_terms: string[]
          priority: number
          severity: string
        }
        Insert: {
          created_at?: string
          guidance_body: string
          guidance_title: string
          id?: string
          is_active?: boolean
          locale: string
          match_terms: string[]
          priority?: number
          severity: string
        }
        Update: {
          created_at?: string
          guidance_body?: string
          guidance_title?: string
          id?: string
          is_active?: boolean
          locale?: string
          match_terms?: string[]
          priority?: number
          severity?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          body: string | null
          created_at: string
          event_type: string
          id: string
          occurred_at: string
          pregnancy_id: string | null
          ref_id: string | null
          ref_table: string | null
          source: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_type: string
          id?: string
          occurred_at: string
          pregnancy_id?: string | null
          ref_id?: string | null
          ref_table?: string | null
          source: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          event_type?: string
          id?: string
          occurred_at?: string
          pregnancy_id?: string | null
          ref_id?: string | null
          ref_table?: string | null
          source?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_pregnancy_owned_by_same_user"
            columns: ["pregnancy_id", "user_id"]
            isOneToOne: false
            referencedRelation: "pregnancies"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      vitals: {
        Row: {
          created_at: string
          id: string
          kind: string
          measured_on: string
          notes: string | null
          user_id: string
          value_1: number
          value_2: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          measured_on: string
          notes?: string | null
          user_id: string
          value_1: number
          value_2?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          measured_on?: string
          notes?: string | null
          user_id?: string
          value_1?: number
          value_2?: number | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          consent: string
          consent_version: number
          created_at: string
          email: string
          id: string
          locale: string
          name: string
        }
        Insert: {
          consent?: string
          consent_version?: number
          created_at?: string
          email: string
          id?: string
          locale: string
          name: string
        }
        Update: {
          consent?: string
          consent_version?: number
          created_at?: string
          email?: string
          id?: string
          locale?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      current_consents: {
        Row: {
          consent_key: string | null
          granted: boolean | null
          granted_at: string | null
          locale: string | null
          user_id: string | null
          version: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      join_waitlist: {
        Args: { p_email: string; p_locale: string; p_name: string }
        Returns: undefined
      }
      search_passages: {
        Args: { in_locale: string; max_results?: number; query: string }
        Returns: {
          body: string
          content_item_id: string
          heading: string
          id: string
          rank: number
        }[]
      }
      tables_without_rls: { Args: never; Returns: string[] }
      valid_baby_names: { Args: { names: string[] }; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
