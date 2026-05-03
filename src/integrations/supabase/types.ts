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
      ai_studio_workflows: {
        Row: {
          clinic_id: string
          created_at: string
          descricao: string | null
          edges_data: Json
          id: string
          nodes_data: Json
          nome: string
          thumbnail: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          descricao?: string | null
          edges_data?: Json
          id?: string
          nodes_data?: Json
          nome: string
          thumbnail?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          descricao?: string | null
          edges_data?: Json
          id?: string
          nodes_data?: Json
          nome?: string
          thumbnail?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blood_exams: {
        Row: {
          alerts: Json
          collected_at: string | null
          created_at: string
          diet_recommendations: Json
          file_name: string | null
          file_url: string | null
          id: string
          lab_name: string | null
          markers: Json
          raw_text: string | null
          status: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts?: Json
          collected_at?: string | null
          created_at?: string
          diet_recommendations?: Json
          file_name?: string | null
          file_url?: string | null
          id?: string
          lab_name?: string | null
          markers?: Json
          raw_text?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts?: Json
          collected_at?: string | null
          created_at?: string
          diet_recommendations?: Json
          file_name?: string | null
          file_url?: string | null
          id?: string
          lab_name?: string | null
          markers?: Json
          raw_text?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_analyses: {
        Row: {
          created_at: string
          extracted: Json
          goal: string | null
          id: string
          image_url: string | null
          measured_at: string | null
          plan: Json
          profile_label: string | null
          score: number | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted?: Json
          goal?: string | null
          id?: string
          image_url?: string | null
          measured_at?: string | null
          plan?: Json
          profile_label?: string | null
          score?: number | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted?: Json
          goal?: string | null
          id?: string
          image_url?: string | null
          measured_at?: string | null
          plan?: Json
          profile_label?: string | null
          score?: number | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bookable_slot_equipment: {
        Row: {
          bookable_slot_id: string
          clinic_id: string
          created_at: string
          created_by: string | null
          equipment_id: string
          id: string
        }
        Insert: {
          bookable_slot_id: string
          clinic_id: string
          created_at?: string
          created_by?: string | null
          equipment_id: string
          id?: string
        }
        Update: {
          bookable_slot_id?: string
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          equipment_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookable_slot_equipment_bookable_slot_id_fkey"
            columns: ["bookable_slot_id"]
            isOneToOne: false
            referencedRelation: "bookable_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookable_slot_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "clinic_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      bookable_slots: {
        Row: {
          active: boolean
          blocked: boolean
          capacity: number
          clinic_id: string
          created_at: string
          created_by: string
          duration_minutes: number
          equipment_id: string | null
          id: string
          instructor_id: string | null
          notes: string | null
          room_id: string | null
          scheduled_at: string
          series_id: string | null
        }
        Insert: {
          active?: boolean
          blocked?: boolean
          capacity?: number
          clinic_id: string
          created_at?: string
          created_by: string
          duration_minutes?: number
          equipment_id?: string | null
          id?: string
          instructor_id?: string | null
          notes?: string | null
          room_id?: string | null
          scheduled_at: string
          series_id?: string | null
        }
        Update: {
          active?: boolean
          blocked?: boolean
          capacity?: number
          clinic_id?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number
          equipment_id?: string | null
          id?: string
          instructor_id?: string | null
          notes?: string | null
          room_id?: string | null
          scheduled_at?: string
          series_id?: string | null
        }
        Relationships: []
      }
      class_appointments: {
        Row: {
          bookable_slot_id: string | null
          booked_by_student: boolean
          cancelled_at: string | null
          cancelled_by: string | null
          checked_in_at: string | null
          clinic_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          duration_minutes: number
          equipment_id: string | null
          id: string
          instructor_id: string | null
          notes: string | null
          origin: Database["public"]["Enums"]["appointment_origin"]
          prescription_id: string | null
          recurring_schedule_id: string | null
          recurring_week_id: string | null
          scheduled_at: string
          sequence_id: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          bookable_slot_id?: string | null
          booked_by_student?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in_at?: string | null
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          duration_minutes?: number
          equipment_id?: string | null
          id?: string
          instructor_id?: string | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["appointment_origin"]
          prescription_id?: string | null
          recurring_schedule_id?: string | null
          recurring_week_id?: string | null
          scheduled_at: string
          sequence_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          bookable_slot_id?: string | null
          booked_by_student?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in_at?: string | null
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          duration_minutes?: number
          equipment_id?: string | null
          id?: string
          instructor_id?: string | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["appointment_origin"]
          prescription_id?: string | null
          recurring_schedule_id?: string | null
          recurring_week_id?: string | null
          scheduled_at?: string
          sequence_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_appointments_recurring_week_id_fkey"
            columns: ["recurring_week_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedule_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_blocked_period_exceptions: {
        Row: {
          blocked_period_id: string
          clinic_id: string
          created_at: string
          created_by: string
          exception_date: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_period_id: string
          clinic_id: string
          created_at?: string
          created_by: string
          exception_date: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_period_id?: string
          clinic_id?: string
          created_at?: string
          created_by?: string
          exception_date?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_blocked_period_exceptions_blocked_period_id_fkey"
            columns: ["blocked_period_id"]
            isOneToOne: false
            referencedRelation: "clinic_blocked_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_blocked_periods: {
        Row: {
          active: boolean
          clinic_id: string
          color: string | null
          created_at: string
          created_by: string
          day_of_week: number
          end_time: string
          id: string
          name: string
          room_id: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          clinic_id: string
          color?: string | null
          created_at?: string
          created_by: string
          day_of_week: number
          end_time: string
          id?: string
          name: string
          room_id?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          color?: string | null
          created_at?: string
          created_by?: string
          day_of_week?: number
          end_time?: string
          id?: string
          name?: string
          room_id?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinic_equipment: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          equipment_type: string
          id: string
          identifier: string | null
          maintenance_notes: string | null
          maintenance_until: string | null
          name: string
          room_id: string | null
          station_token: string
          status: string
        }
        Insert: {
          active?: boolean
          clinic_id: string
          created_at?: string
          equipment_type?: string
          id?: string
          identifier?: string | null
          maintenance_notes?: string | null
          maintenance_until?: string | null
          name: string
          room_id?: string | null
          station_token?: string
          status?: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          equipment_type?: string
          id?: string
          identifier?: string | null
          maintenance_notes?: string | null
          maintenance_until?: string | null
          name?: string
          room_id?: string | null
          station_token?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_equipment_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_equipment_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "clinic_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_global_categories: {
        Row: {
          category_id: string
          clinic_id: string
          created_at: string
          created_by: string
          id: string
        }
        Insert: {
          category_id: string
          clinic_id: string
          created_at?: string
          created_by: string
          id?: string
        }
        Update: {
          category_id?: string
          clinic_id?: string
          created_at?: string
          created_by?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_global_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_global_categories_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_invites: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          clinic_id: string
          created_at: string
          created_by: string
          email: string
          full_name: string
          id: string
          invite_token: string
          must_change_password: boolean
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invite_status"]
          temp_password: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          clinic_id: string
          created_at?: string
          created_by: string
          email: string
          full_name: string
          id?: string
          invite_token?: string
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          temp_password?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string
          email?: string
          full_name?: string
          id?: string
          invite_token?: string
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          temp_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_invites_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_rooms: {
        Row: {
          active: boolean
          capacity: number | null
          clinic_id: string
          color: string | null
          created_at: string
          equipment_mode: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          capacity?: number | null
          clinic_id: string
          color?: string | null
          created_at?: string
          equipment_mode?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          capacity?: number | null
          clinic_id?: string
          color?: string | null
          created_at?: string
          equipment_mode?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinic_settings: {
        Row: {
          allow_login_as_student: boolean
          booking_open_days_ahead: number
          cancellation_min_hours: number
          clinic_id: string
          updated_at: string
          wizard_completed_at: string | null
        }
        Insert: {
          allow_login_as_student?: boolean
          booking_open_days_ahead?: number
          cancellation_min_hours?: number
          clinic_id: string
          updated_at?: string
          wizard_completed_at?: string | null
        }
        Update: {
          allow_login_as_student?: boolean
          booking_open_days_ahead?: number
          cancellation_min_hours?: number
          clinic_id?: string
          updated_at?: string
          wizard_completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_skill_levels: {
        Row: {
          clinic_id: string
          color: string | null
          created_at: string
          id: string
          name: string
          rank: number
        }
        Insert: {
          clinic_id: string
          color?: string | null
          created_at?: string
          id?: string
          name: string
          rank?: number
        }
        Update: {
          clinic_id?: string
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinic_skill_levels_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_students: {
        Row: {
          active: boolean
          avatar_url: string | null
          birth_date: string | null
          clinic_id: string
          contract_classes_total: number | null
          contract_classes_used: number
          contract_end_date: string | null
          contract_start_date: string | null
          contract_type: string
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          goals: string | null
          height_cm: number | null
          id: string
          injuries: string | null
          medical_conditions: string | null
          medications: string | null
          notes: string | null
          phone: string | null
          restrictions: string | null
          skill_level_id: string | null
          updated_at: string
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          birth_date?: string | null
          clinic_id: string
          contract_classes_total?: number | null
          contract_classes_used?: number
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_type?: string
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          goals?: string | null
          height_cm?: number | null
          id?: string
          injuries?: string | null
          medical_conditions?: string | null
          medications?: string | null
          notes?: string | null
          phone?: string | null
          restrictions?: string | null
          skill_level_id?: string | null
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          birth_date?: string | null
          clinic_id?: string
          contract_classes_total?: number | null
          contract_classes_used?: number
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_type?: string
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          goals?: string | null
          height_cm?: number | null
          id?: string
          injuries?: string | null
          medical_conditions?: string | null
          medications?: string | null
          notes?: string | null
          phone?: string | null
          restrictions?: string | null
          skill_level_id?: string | null
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_students_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_students_skill_level_id_fkey"
            columns: ["skill_level_id"]
            isOneToOne: false
            referencedRelation: "clinic_skill_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          clinic_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          cycle: Database["public"]["Enums"]["billing_cycle"] | null
          id: string
          last_event_at: string | null
          last_payment_at: string | null
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          plan_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          clinic_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          id?: string
          last_event_at?: string | null
          last_payment_at?: string | null
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          clinic_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          id?: string
          last_event_at?: string | null
          last_payment_at?: string | null
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_user_permissions: {
        Row: {
          can_create_exercises: boolean
          can_create_sequences: boolean
          can_prescribe_workouts: boolean
          clinic_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create_exercises?: boolean
          can_create_sequences?: boolean
          can_prescribe_workouts?: boolean
          clinic_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create_exercises?: boolean
          can_create_sequences?: boolean
          can_prescribe_workouts?: boolean
          clinic_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clinics: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          logo_url: string | null
          name: string
          owner_user_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          logo_url?: string | null
          name: string
          owner_user_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_products: {
        Row: {
          barcode: string
          brand: string | null
          calories: number
          carbs: number
          created_at: string
          fat: number
          fiber: number | null
          id: string
          image_url: string | null
          is_liquid: boolean
          is_natural: boolean
          name: string
          package_total_units: number | null
          package_total_weight: number | null
          package_volume_ml: number | null
          protein: number
          reference_quantity: number
          reference_unit: string
          saturated_fat: number | null
          sodium: number | null
          trans_fat: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          barcode: string
          brand?: string | null
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          fiber?: number | null
          id?: string
          image_url?: string | null
          is_liquid?: boolean
          is_natural?: boolean
          name: string
          package_total_units?: number | null
          package_total_weight?: number | null
          package_volume_ml?: number | null
          protein?: number
          reference_quantity?: number
          reference_unit?: string
          saturated_fat?: number | null
          sodium?: number | null
          trans_fat?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          barcode?: string
          brand?: string | null
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          fiber?: number | null
          id?: string
          image_url?: string | null
          is_liquid?: boolean
          is_natural?: boolean
          name?: string
          package_total_units?: number | null
          package_total_weight?: number | null
          package_volume_ml?: number | null
          protein?: number
          reference_quantity?: number
          reference_unit?: string
          saturated_fat?: number | null
          sodium?: number | null
          trans_fat?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      execution_log: {
        Row: {
          clinic_id: string
          context: Database["public"]["Enums"]["prescription_context"]
          created_at: string
          exercise_name: string
          id: string
          notes: string | null
          performed_at: string
          prescription_id: string | null
          sequence_id: string | null
          sequence_item_id: string | null
          student_id: string
        }
        Insert: {
          clinic_id: string
          context?: Database["public"]["Enums"]["prescription_context"]
          created_at?: string
          exercise_name: string
          id?: string
          notes?: string | null
          performed_at?: string
          prescription_id?: string | null
          sequence_id?: string | null
          sequence_item_id?: string | null
          student_id: string
        }
        Update: {
          clinic_id?: string
          context?: Database["public"]["Enums"]["prescription_context"]
          created_at?: string
          exercise_name?: string
          id?: string
          notes?: string | null
          performed_at?: string
          prescription_id?: string | null
          sequence_id?: string | null
          sequence_item_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_log_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_log_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "exercise_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_log_sequence_item_id_fkey"
            columns: ["sequence_item_id"]
            isOneToOne: false
            referencedRelation: "exercise_sequence_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "clinic_students"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_categories: {
        Row: {
          clinic_id: string | null
          created_at: string
          id: string
          is_global: boolean
          name: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          is_global?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          is_global?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_categories_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_entries: {
        Row: {
          calories_burned: number
          created_at: string
          duration_minutes: number
          exercise_type: string
          id: string
          name: string
          performed_at: string
          user_id: string
        }
        Insert: {
          calories_burned?: number
          created_at?: string
          duration_minutes?: number
          exercise_type?: string
          id?: string
          name: string
          performed_at?: string
          user_id: string
        }
        Update: {
          calories_burned?: number
          created_at?: string
          duration_minutes?: number
          exercise_type?: string
          id?: string
          name?: string
          performed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_library: {
        Row: {
          aesthetic_analysis: Json | null
          body_analysis: Json | null
          body_analyzed_at: string | null
          category_id: string | null
          clinic_id: string | null
          created_at: string
          default_reps: number
          default_sets: number
          id: string
          image_urls: string[] | null
          is_global: boolean
          mobility_analysis: Json | null
          name: string
          skill_level_id: string | null
          updated_at: string
          user_id: string
          video_end_seconds: number | null
          video_optimized_at: string | null
          video_start_seconds: number | null
          video_type: string | null
          video_url: string | null
        }
        Insert: {
          aesthetic_analysis?: Json | null
          body_analysis?: Json | null
          body_analyzed_at?: string | null
          category_id?: string | null
          clinic_id?: string | null
          created_at?: string
          default_reps?: number
          default_sets?: number
          id?: string
          image_urls?: string[] | null
          is_global?: boolean
          mobility_analysis?: Json | null
          name: string
          skill_level_id?: string | null
          updated_at?: string
          user_id: string
          video_end_seconds?: number | null
          video_optimized_at?: string | null
          video_start_seconds?: number | null
          video_type?: string | null
          video_url?: string | null
        }
        Update: {
          aesthetic_analysis?: Json | null
          body_analysis?: Json | null
          body_analyzed_at?: string | null
          category_id?: string | null
          clinic_id?: string | null
          created_at?: string
          default_reps?: number
          default_sets?: number
          id?: string
          image_urls?: string[] | null
          is_global?: boolean
          mobility_analysis?: Json | null
          name?: string
          skill_level_id?: string | null
          updated_at?: string
          user_id?: string
          video_end_seconds?: number | null
          video_optimized_at?: string | null
          video_start_seconds?: number | null
          video_type?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_library_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_library_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library_categories: {
        Row: {
          category_id: string
          created_at: string
          exercise_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          exercise_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_library_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exercise_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_library_categories_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_sequence_items: {
        Row: {
          created_at: string
          duration_seconds: number | null
          exercise_library_id: string | null
          id: string
          image_urls: string[] | null
          name: string
          notes: string | null
          order_index: number
          reps: number
          rest_seconds: number | null
          sequence_id: string
          sets: number
          video_end_seconds: number | null
          video_start_seconds: number | null
          video_type: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          exercise_library_id?: string | null
          id?: string
          image_urls?: string[] | null
          name: string
          notes?: string | null
          order_index?: number
          reps?: number
          rest_seconds?: number | null
          sequence_id: string
          sets?: number
          video_end_seconds?: number | null
          video_start_seconds?: number | null
          video_type?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          exercise_library_id?: string | null
          id?: string
          image_urls?: string[] | null
          name?: string
          notes?: string | null
          order_index?: number
          reps?: number
          rest_seconds?: number | null
          sequence_id?: string
          sets?: number
          video_end_seconds?: number | null
          video_start_seconds?: number | null
          video_type?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sequence_items_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "exercise_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_sequences: {
        Row: {
          clinic_id: string | null
          created_at: string
          created_by: string
          description: string | null
          equipment_id: string | null
          equipment_type: string | null
          estimated_minutes: number | null
          id: string
          is_global: boolean
          name: string
          skill_level_id: string | null
          skill_level_label: string | null
          updated_at: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          equipment_id?: string | null
          equipment_type?: string | null
          estimated_minutes?: number | null
          id?: string
          is_global?: boolean
          name: string
          skill_level_id?: string | null
          skill_level_label?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          equipment_id?: string | null
          equipment_type?: string | null
          estimated_minutes?: number | null
          id?: string
          is_global?: boolean
          name?: string
          skill_level_id?: string | null
          skill_level_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sequences_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sequences_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "clinic_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sequences_skill_level_id_fkey"
            columns: ["skill_level_id"]
            isOneToOne: false
            referencedRelation: "clinic_skill_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      external_pass_checkins: {
        Row: {
          amount: number | null
          appointment_id: string | null
          checkin_at: string
          clinic_id: string
          created_at: string
          currency: string | null
          dedupe_key: string
          external_user_id: string | null
          id: string
          import_id: string
          payment_status: string | null
          platform: Database["public"]["Enums"]["external_pass_platform"]
          raw_row: Json | null
          student_document: string | null
          student_email: string | null
          student_id: string | null
          student_name: string | null
        }
        Insert: {
          amount?: number | null
          appointment_id?: string | null
          checkin_at: string
          clinic_id: string
          created_at?: string
          currency?: string | null
          dedupe_key: string
          external_user_id?: string | null
          id?: string
          import_id: string
          payment_status?: string | null
          platform: Database["public"]["Enums"]["external_pass_platform"]
          raw_row?: Json | null
          student_document?: string | null
          student_email?: string | null
          student_id?: string | null
          student_name?: string | null
        }
        Update: {
          amount?: number | null
          appointment_id?: string | null
          checkin_at?: string
          clinic_id?: string
          created_at?: string
          currency?: string | null
          dedupe_key?: string
          external_user_id?: string | null
          id?: string
          import_id?: string
          payment_status?: string | null
          platform?: Database["public"]["Enums"]["external_pass_platform"]
          raw_row?: Json | null
          student_document?: string | null
          student_email?: string | null
          student_id?: string | null
          student_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_pass_checkins_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "class_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_pass_checkins_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_pass_checkins_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "external_pass_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_pass_checkins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "clinic_students"
            referencedColumns: ["id"]
          },
        ]
      }
      external_pass_column_mappings: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string
          id: string
          mapping: Json
          platform: Database["public"]["Enums"]["external_pass_platform"]
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by: string
          id?: string
          mapping: Json
          platform: Database["public"]["Enums"]["external_pass_platform"]
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          id?: string
          mapping?: Json
          platform?: Database["public"]["Enums"]["external_pass_platform"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_pass_column_mappings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      external_pass_imports: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string
          duplicate_rows: number
          file_hash: string | null
          file_name: string
          id: string
          imported_rows: number
          matched_rows: number
          notes: string | null
          platform: Database["public"]["Enums"]["external_pass_platform"]
          raw_columns: Json | null
          reference_period: string | null
          total_amount: number | null
          total_rows: number
          unmatched_rows: number
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by: string
          duplicate_rows?: number
          file_hash?: string | null
          file_name: string
          id?: string
          imported_rows?: number
          matched_rows?: number
          notes?: string | null
          platform: Database["public"]["Enums"]["external_pass_platform"]
          raw_columns?: Json | null
          reference_period?: string | null
          total_amount?: number | null
          total_rows?: number
          unmatched_rows?: number
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          duplicate_rows?: number
          file_hash?: string | null
          file_name?: string
          id?: string
          imported_rows?: number
          matched_rows?: number
          notes?: string | null
          platform?: Database["public"]["Enums"]["external_pass_platform"]
          raw_columns?: Json | null
          reference_period?: string | null
          total_amount?: number | null
          total_rows?: number
          unmatched_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "external_pass_imports_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      food_entries: {
        Row: {
          calories: number
          carbs: number
          consumed_at: string
          created_at: string
          fat: number
          fiber: number | null
          id: string
          image_url: string | null
          is_liquid: boolean | null
          liquid_ml: number | null
          name: string
          original_items: Json | null
          product_id: string | null
          protein: number
          quantity: number
          saturated_fat: number | null
          sodium: number | null
          source: string
          trans_fat: number | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number
          consumed_at?: string
          created_at?: string
          fat?: number
          fiber?: number | null
          id?: string
          image_url?: string | null
          is_liquid?: boolean | null
          liquid_ml?: number | null
          name: string
          original_items?: Json | null
          product_id?: string | null
          protein?: number
          quantity?: number
          saturated_fat?: number | null
          sodium?: number | null
          source?: string
          trans_fat?: number | null
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number
          consumed_at?: string
          created_at?: string
          fat?: number
          fiber?: number | null
          id?: string
          image_url?: string | null
          is_liquid?: boolean | null
          liquid_ml?: number | null
          name?: string
          original_items?: Json | null
          product_id?: string | null
          protein?: number
          quantity?: number
          saturated_fat?: number | null
          sodium?: number | null
          source?: string
          trans_fat?: number | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "custom_products"
            referencedColumns: ["id"]
          },
        ]
      }
      food_kit_items: {
        Row: {
          created_at: string
          id: string
          kit_id: string
          product_id: string
          quantity: number
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          kit_id: string
          product_id: string
          quantity?: number
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          kit_id?: string
          product_id?: string
          quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "food_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_kit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "custom_products"
            referencedColumns: ["id"]
          },
        ]
      }
      food_kits: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_preferences: {
        Row: {
          created_at: string
          disliked_foods: string[]
          favorite_foods: string[]
          id: string
          notes: string | null
          restrictions: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disliked_foods?: string[]
          favorite_foods?: string[]
          id?: string
          notes?: string | null
          restrictions?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disliked_foods?: string[]
          favorite_foods?: string[]
          id?: string
          notes?: string | null
          restrictions?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      glycemia_entries: {
        Row: {
          created_at: string
          glucose_mg_dl: number
          id: string
          measured_at: string
          measurement_type: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          glucose_mg_dl: number
          id?: string
          measured_at?: string
          measurement_type?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          glucose_mg_dl?: number
          id?: string
          measured_at?: string
          measurement_type?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      impersonation_log: {
        Row: {
          actor_user_id: string
          clinic_id: string | null
          created_at: string
          id: string
          mode: string
          student_id: string | null
          target_user_id: string
        }
        Insert: {
          actor_user_id: string
          clinic_id?: string | null
          created_at?: string
          id?: string
          mode: string
          student_id?: string | null
          target_user_id: string
        }
        Update: {
          actor_user_id?: string
          clinic_id?: string | null
          created_at?: string
          id?: string
          mode?: string
          student_id?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      instructor_availability: {
        Row: {
          active: boolean
          clinic_id: string
          color: string | null
          created_at: string
          created_by: string
          day_of_week: number
          end_time: string
          id: string
          instructor_id: string
          notes: string | null
          room_id: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          clinic_id: string
          color?: string | null
          created_at?: string
          created_by: string
          day_of_week: number
          end_time: string
          id?: string
          instructor_id: string
          notes?: string | null
          room_id?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          color?: string | null
          created_at?: string
          created_by?: string
          day_of_week?: number
          end_time?: string
          id?: string
          instructor_id?: string
          notes?: string | null
          room_id?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      instructor_colors: {
        Row: {
          clinic_id: string
          color: string
          created_at: string
          id: string
          instructor_id: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          color: string
          created_at?: string
          id?: string
          instructor_id: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          color?: string
          created_at?: string
          id?: string
          instructor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      liquid_entries: {
        Row: {
          amount_ml: number
          consumed_at: string
          created_at: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount_ml?: number
          consumed_at?: string
          created_at?: string
          id?: string
          type?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          consumed_at?: string
          created_at?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      live_session_students: {
        Row: {
          current_item_id: string | null
          current_item_index: number
          equipment_id: string | null
          finished_at: string | null
          id: string
          joined_at: string
          live_session_id: string
          prescription_id: string | null
          student_id: string
          total_items: number
        }
        Insert: {
          current_item_id?: string | null
          current_item_index?: number
          equipment_id?: string | null
          finished_at?: string | null
          id?: string
          joined_at?: string
          live_session_id: string
          prescription_id?: string | null
          student_id: string
          total_items?: number
        }
        Update: {
          current_item_id?: string | null
          current_item_index?: number
          equipment_id?: string | null
          finished_at?: string | null
          id?: string
          joined_at?: string
          live_session_id?: string
          prescription_id?: string | null
          student_id?: string
          total_items?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_session_students_current_item_id_fkey"
            columns: ["current_item_id"]
            isOneToOne: false
            referencedRelation: "exercise_sequence_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_session_students_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "clinic_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_session_students_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_session_students_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_session_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "clinic_students"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          clinic_id: string
          created_at: string
          finished_at: string | null
          id: string
          instructor_id: string
          notes: string | null
          scheduled_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["live_session_status"]
        }
        Insert: {
          clinic_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          instructor_id: string
          notes?: string | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["live_session_status"]
        }
        Update: {
          clinic_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          instructor_id?: string
          notes?: string | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["live_session_status"]
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_ai_api_keys: {
        Row: {
          api_key: string | null
          api_secret: string | null
          base_url: string | null
          clinic_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          organization_id: string | null
          project_id: string | null
          provider: string
          provider_display_name: string
          updated_at: string
          validation_status: string
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          base_url?: string | null
          clinic_id: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          project_id?: string | null
          provider: string
          provider_display_name: string
          updated_at?: string
          validation_status?: string
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          base_url?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          project_id?: string | null
          provider?: string
          provider_display_name?: string
          updated_at?: string
          validation_status?: string
        }
        Relationships: []
      }
      marketing_ai_creations: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string
          creation_type: string
          id: string
          metadata: Json | null
          model: string | null
          prompt: string
          result_text: string | null
          result_url: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by: string
          creation_type?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          prompt: string
          result_text?: string | null
          result_url?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          creation_type?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          prompt?: string
          result_text?: string | null
          result_url?: string | null
        }
        Relationships: []
      }
      marketing_automations: {
        Row: {
          action_config: Json | null
          action_type: string
          active: boolean
          clinic_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          last_run_at: string | null
          name: string
          run_count: number
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          action_config?: Json | null
          action_type?: string
          active?: boolean
          clinic_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          run_count?: number
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          active?: boolean
          clinic_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          run_count?: number
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      marketing_bulk_sends: {
        Row: {
          channel: string
          clinic_id: string
          created_at: string
          created_by: string
          id: string
          message: string
          recipient_count: number
          recipient_filter: Json | null
          scheduled_for: string | null
          status: string
          webhook_url: string | null
        }
        Insert: {
          channel?: string
          clinic_id: string
          created_at?: string
          created_by: string
          id?: string
          message: string
          recipient_count?: number
          recipient_filter?: Json | null
          scheduled_for?: string | null
          status?: string
          webhook_url?: string | null
        }
        Update: {
          channel?: string
          clinic_id?: string
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          recipient_count?: number
          recipient_filter?: Json | null
          scheduled_for?: string | null
          status?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          budget: number | null
          channel: string | null
          clinic_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          goal: string | null
          id: string
          name: string
          notes: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          channel?: string | null
          clinic_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          channel?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_catalogs: {
        Row: {
          clinic_id: string
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          items: Json
          name: string
          pdf_url: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          items?: Json
          name: string
          pdf_url?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          items?: Json
          name?: string
          pdf_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketing_integration_credentials: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string
          credentials_json: Json
          display_name: string
          id: string
          integration_name: string
          integration_type: string
          is_active: boolean
          updated_at: string
          validation_status: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by: string
          credentials_json?: Json
          display_name: string
          id?: string
          integration_name: string
          integration_type: string
          is_active?: boolean
          updated_at?: string
          validation_status?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          credentials_json?: Json
          display_name?: string
          id?: string
          integration_name?: string
          integration_type?: string
          is_active?: boolean
          updated_at?: string
          validation_status?: string
        }
        Relationships: []
      }
      marketing_landing_pages: {
        Row: {
          blocks: Json
          clinic_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          slug: string
          status: string
          theme: Json | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          blocks?: Json
          clinic_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          slug: string
          status?: string
          theme?: Json | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          blocks?: Json
          clinic_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          slug?: string
          status?: string
          theme?: Json | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      marketing_media: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string
          description: string | null
          folder: string | null
          id: string
          media_type: string
          name: string
          public_url: string
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by: string
          description?: string | null
          folder?: string | null
          id?: string
          media_type?: string
          name: string
          public_url: string
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          folder?: string | null
          id?: string
          media_type?: string
          name?: string
          public_url?: string
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: []
      }
      marketing_strategies: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string
          goal: string | null
          id: string
          name: string
          plan: Json | null
          status: string
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by: string
          goal?: string | null
          id?: string
          name: string
          plan?: Json | null
          status?: string
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          goal?: string | null
          id?: string
          name?: string
          plan?: Json | null
          status?: string
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      master_settings: {
        Row: {
          id: number
          payments_mode: string
          trial_days: number
          updated_at: string
        }
        Insert: {
          id?: number
          payments_mode?: string
          trial_days?: number
          updated_at?: string
        }
        Update: {
          id?: number
          payments_mode?: string
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          clinic_id: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          clinic_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          clinic_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          clinic_id: string
          completed_at: string | null
          context: Database["public"]["Enums"]["prescription_context"]
          created_at: string
          created_by: string
          id: string
          notes: string | null
          scheduled_for: string | null
          sequence_id: string
          status: Database["public"]["Enums"]["prescription_status"]
          student_id: string
        }
        Insert: {
          clinic_id: string
          completed_at?: string | null
          context?: Database["public"]["Enums"]["prescription_context"]
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          scheduled_for?: string | null
          sequence_id: string
          status?: Database["public"]["Enums"]["prescription_status"]
          student_id: string
        }
        Update: {
          clinic_id?: string
          completed_at?: string | null
          context?: Database["public"]["Enums"]["prescription_context"]
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          scheduled_for?: string | null
          sequence_id?: string
          status?: Database["public"]["Enums"]["prescription_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "exercise_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "clinic_students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: string | null
          birth_date: string | null
          created_at: string
          daily_calories: number | null
          daily_calories_override: number | null
          daily_carbs: number | null
          daily_carbs_override: number | null
          daily_fat: number | null
          daily_fat_override: number | null
          daily_fiber: number | null
          daily_fiber_override: number | null
          daily_liquid_ml: number | null
          daily_liquid_ml_override: number | null
          daily_protein: number | null
          daily_protein_override: number | null
          daily_saturated_fat: number | null
          daily_sodium: number | null
          daily_trans_fat: number | null
          email: string | null
          gender: string | null
          goal: string | null
          height_cm: number | null
          id: string
          movement_analysis_enabled: boolean
          name: string
          nutrition_override_set_at: string | null
          nutrition_override_source: string | null
          onboarding_completed: boolean
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          birth_date?: string | null
          created_at?: string
          daily_calories?: number | null
          daily_calories_override?: number | null
          daily_carbs?: number | null
          daily_carbs_override?: number | null
          daily_fat?: number | null
          daily_fat_override?: number | null
          daily_fiber?: number | null
          daily_fiber_override?: number | null
          daily_liquid_ml?: number | null
          daily_liquid_ml_override?: number | null
          daily_protein?: number | null
          daily_protein_override?: number | null
          daily_saturated_fat?: number | null
          daily_sodium?: number | null
          daily_trans_fat?: number | null
          email?: string | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          movement_analysis_enabled?: boolean
          name: string
          nutrition_override_set_at?: string | null
          nutrition_override_source?: string | null
          onboarding_completed?: boolean
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          birth_date?: string | null
          created_at?: string
          daily_calories?: number | null
          daily_calories_override?: number | null
          daily_carbs?: number | null
          daily_carbs_override?: number | null
          daily_fat?: number | null
          daily_fat_override?: number | null
          daily_fiber?: number | null
          daily_fiber_override?: number | null
          daily_liquid_ml?: number | null
          daily_liquid_ml_override?: number | null
          daily_protein?: number | null
          daily_protein_override?: number | null
          daily_saturated_fat?: number | null
          daily_sodium?: number | null
          daily_trans_fat?: number | null
          email?: string | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          movement_analysis_enabled?: boolean
          name?: string
          nutrition_override_set_at?: string | null
          nutrition_override_source?: string | null
          onboarding_completed?: boolean
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          angle: string
          created_at: string
          id: string
          image_url: string
          notes: string | null
          taken_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          angle: string
          created_at?: string
          id?: string
          image_url: string
          notes?: string | null
          taken_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          angle?: string
          created_at?: string
          id?: string
          image_url?: string
          notes?: string | null
          taken_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      recurring_schedule_weeks: {
        Row: {
          created_at: string
          day_of_week: number
          duration_minutes: number
          equipment_id: string | null
          id: string
          instructor_id: string | null
          recurring_schedule_id: string
          room_id: string | null
          start_time: string
          week_of_month: number
        }
        Insert: {
          created_at?: string
          day_of_week: number
          duration_minutes?: number
          equipment_id?: string | null
          id?: string
          instructor_id?: string | null
          recurring_schedule_id: string
          room_id?: string | null
          start_time: string
          week_of_month: number
        }
        Update: {
          created_at?: string
          day_of_week?: number
          duration_minutes?: number
          equipment_id?: string | null
          id?: string
          instructor_id?: string | null
          recurring_schedule_id?: string
          room_id?: string | null
          start_time?: string
          week_of_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedule_weeks_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "clinic_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedule_weeks_recurring_schedule_id_fkey"
            columns: ["recurring_schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedule_weeks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "clinic_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_schedules: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          created_by: string
          day_of_week: number
          duration_minutes: number
          end_date: string | null
          equipment_id: string | null
          id: string
          instructor_id: string | null
          notes: string | null
          room_id: string | null
          start_date: string
          start_time: string
          student_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          clinic_id: string
          created_at?: string
          created_by: string
          day_of_week: number
          duration_minutes?: number
          end_date?: string | null
          equipment_id?: string | null
          id?: string
          instructor_id?: string | null
          notes?: string | null
          room_id?: string | null
          start_date?: string
          start_time: string
          student_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          created_by?: string
          day_of_week?: number
          duration_minutes?: number
          end_date?: string | null
          equipment_id?: string | null
          id?: string
          instructor_id?: string | null
          notes?: string | null
          room_id?: string | null
          start_date?: string
          start_time?: string
          student_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "clinic_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_equipment: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          equipment_id: string
          id: string
          room_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          equipment_id: string
          id?: string
          room_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          equipment_id?: string
          id?: string
          room_id?: string
        }
        Relationships: []
      }
      sequence_share_links: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          sequence_id: string
          student_id: string | null
          token: string
          view_count: number
        }
        Insert: {
          active?: boolean
          clinic_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          sequence_id: string
          student_id?: string | null
          token?: string
          view_count?: number
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          sequence_id?: string
          student_id?: string | null
          token?: string
          view_count?: number
        }
        Relationships: []
      }
      share_summaries: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_viewed_at: string | null
          period_days: number
          revoked: boolean
          token: string
          user_id: string
          view_count: number
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          last_viewed_at?: string | null
          period_days?: number
          revoked?: boolean
          token?: string
          user_id: string
          view_count?: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_viewed_at?: string | null
          period_days?: number
          revoked?: boolean
          token?: string
          user_id?: string
          view_count?: number
        }
        Relationships: []
      }
      share_summary_views: {
        Row: {
          id: string
          ip_hash: string
          share_id: string
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          ip_hash: string
          share_id: string
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          ip_hash?: string
          share_id?: string
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_summary_views_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "share_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      student_external_identities: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          external_document: string | null
          external_email: string | null
          external_name: string | null
          external_user_id: string | null
          id: string
          linked_at: string
          linked_by: string | null
          notes: string | null
          platform: Database["public"]["Enums"]["appointment_origin"]
          student_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          clinic_id: string
          created_at?: string
          external_document?: string | null
          external_email?: string | null
          external_name?: string | null
          external_user_id?: string | null
          id?: string
          linked_at?: string
          linked_by?: string | null
          notes?: string | null
          platform: Database["public"]["Enums"]["appointment_origin"]
          student_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          external_document?: string | null
          external_email?: string | null
          external_name?: string | null
          external_user_id?: string | null
          id?: string
          linked_at?: string
          linked_by?: string | null
          notes?: string | null
          platform?: Database["public"]["Enums"]["appointment_origin"]
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_instructors: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string
          id: string
          instructor_user_id: string
          student_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by: string
          id?: string
          instructor_user_id: string
          student_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          id?: string
          instructor_user_id?: string
          student_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description: string | null
          id: string
          max_students: number | null
          name: string
          paddle_price_id_monthly: string | null
          paddle_price_id_yearly: string | null
          price_monthly_cents: number
          price_yearly_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          max_students?: number | null
          name: string
          paddle_price_id_monthly?: string | null
          paddle_price_id_yearly?: string | null
          price_monthly_cents?: number
          price_yearly_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          max_students?: number | null
          name?: string
          paddle_price_id_monthly?: string | null
          paddle_price_id_yearly?: string | null
          price_monthly_cents?: number
          price_yearly_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          clinic_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_security_flags: {
        Row: {
          must_change_password: boolean
          password_changed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          must_change_password?: boolean
          password_changed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          must_change_password?: boolean
          password_changed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          instagram_api_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_api_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram_api_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_projects: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          nome: string
          thumbnail: string | null
          timeline_data: Json
          updated_at: string
          user_id: string
          video_config: Json
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          nome?: string
          thumbnail?: string | null
          timeline_data?: Json
          updated_at?: string
          user_id: string
          video_config?: Json
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          nome?: string
          thumbnail?: string | null
          timeline_data?: Json
          updated_at?: string
          user_id?: string
          video_config?: Json
        }
        Relationships: []
      }
      weekly_checkins: {
        Row: {
          adherence_score: number | null
          created_at: string
          highlights: Json | null
          id: string
          metrics: Json
          period_end: string
          period_start: string
          recommendations: Json | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adherence_score?: number | null
          created_at?: string
          highlights?: Json | null
          id?: string
          metrics?: Json
          period_end: string
          period_start: string
          recommendations?: Json | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adherence_score?: number | null
          created_at?: string
          highlights?: Json | null
          id?: string
          metrics?: Json
          period_end?: string
          period_start?: string
          recommendations?: Json | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weight_history: {
        Row: {
          created_at: string
          id: string
          recorded_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          recorded_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          recorded_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_library_id: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          name: string
          order_index: number
          reps: number
          sets: number
          video_end_seconds: number | null
          video_start_seconds: number | null
          video_type: string | null
          video_url: string | null
          workout_plan_id: string
        }
        Insert: {
          created_at?: string
          exercise_library_id?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          name: string
          order_index?: number
          reps?: number
          sets?: number
          video_end_seconds?: number | null
          video_start_seconds?: number | null
          video_type?: string | null
          video_url?: string | null
          workout_plan_id: string
        }
        Update: {
          created_at?: string
          exercise_library_id?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          name?: string
          order_index?: number
          reps?: number
          sets?: number
          video_end_seconds?: number | null
          video_start_seconds?: number | null
          video_type?: string | null
          video_url?: string | null
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_library_id_fkey"
            columns: ["exercise_library_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          days_of_week: number[]
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clinic_has_access: { Args: { _clinic_id: string }; Returns: boolean }
      copy_global_sequence_to_clinic: {
        Args: { _clinic_id: string; _sequence_id: string }
        Returns: string
      }
      has_clinic_permission: {
        Args: { _clinic_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_clinic_admin: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      is_clinic_admin_or_instructor: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      is_clinic_member: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      is_clinic_staff: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      is_fixed_instructor_of_student: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      is_master_admin: { Args: { _user_id: string }; Returns: boolean }
      register_share_link_view: { Args: { _token: string }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "clinic_admin"
        | "instructor"
        | "receptionist"
        | "student"
        | "station"
        | "master_admin"
      appointment_origin:
        | "particular"
        | "gympass"
        | "totalpass"
        | "classpass"
        | "outro"
      appointment_status:
        | "scheduled"
        | "checked_in"
        | "in_progress"
        | "completed"
        | "no_show"
        | "cancelled"
      billing_cycle: "monthly" | "yearly"
      external_pass_platform: "gympass" | "totalpass" | "classpass" | "outro"
      invite_status: "pending" | "accepted" | "revoked"
      live_session_status:
        | "scheduled"
        | "in_progress"
        | "finished"
        | "cancelled"
      notification_type:
        | "appointment_reminder"
        | "home_prescription"
        | "progress"
        | "general"
      prescription_context: "in_class" | "at_home"
      prescription_status: "pending" | "in_progress" | "completed" | "skipped"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "cancelled"
        | "expired"
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
      app_role: [
        "super_admin",
        "clinic_admin",
        "instructor",
        "receptionist",
        "student",
        "station",
        "master_admin",
      ],
      appointment_origin: [
        "particular",
        "gympass",
        "totalpass",
        "classpass",
        "outro",
      ],
      appointment_status: [
        "scheduled",
        "checked_in",
        "in_progress",
        "completed",
        "no_show",
        "cancelled",
      ],
      billing_cycle: ["monthly", "yearly"],
      external_pass_platform: ["gympass", "totalpass", "classpass", "outro"],
      invite_status: ["pending", "accepted", "revoked"],
      live_session_status: [
        "scheduled",
        "in_progress",
        "finished",
        "cancelled",
      ],
      notification_type: [
        "appointment_reminder",
        "home_prescription",
        "progress",
        "general",
      ],
      prescription_context: ["in_class", "at_home"],
      prescription_status: ["pending", "in_progress", "completed", "skipped"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "cancelled",
        "expired",
      ],
    },
  },
} as const
