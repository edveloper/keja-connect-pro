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
      charges: {
        Row: {
          amount: number
          charge_month: string
          created_at: string
          id: string
          note: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          amount: number
          charge_month: string
          created_at?: string
          id?: string
          note?: string | null
          tenant_id: string
          type?: string
        }
        Update: {
          amount?: number
          charge_month?: string
          created_at?: string
          id?: string
          note?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          is_preset: boolean
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_preset?: boolean
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_preset?: boolean
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          description: string | null
          expense_date: string
          expense_month: string
          id: string
          property_id: string
          unit_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          description?: string | null
          expense_date?: string
          expense_month: string
          id?: string
          property_id: string
          unit_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          expense_month?: string
          id?: string
          property_id?: string
          unit_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          applied_month: string
          created_at: string
          id: string
          payment_id: string
        }
        Insert: {
          amount: number
          applied_month: string
          created_at?: string
          id?: string
          payment_id: string
        }
        Update: {
          amount?: number
          applied_month?: string
          created_at?: string
          id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          payload_json: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          payload_json?: Json
          user_id?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          payload_json?: Json
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          mpesa_code: string | null
          note: string | null
          payment_date: string
          payment_month: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          mpesa_code?: string | null
          note?: string | null
          payment_date?: string
          payment_month: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mpesa_code?: string | null
          note?: string | null
          payment_date?: string
          payment_month?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
        reminder_queue: {
          Row: {
            channel: string
            created_at: string
            id: string
            metadata_json: Json
            month_key: string
            notes: string | null
            priority: number
            scheduled_for: string | null
            sent_at: string | null
            status: string
            tenant_id: string
          updated_at: string
          user_id: string
        }
          Insert: {
            channel?: string
            created_at?: string
            id?: string
            metadata_json?: Json
            month_key: string
            notes?: string | null
            priority?: number
            scheduled_for?: string | null
            sent_at?: string | null
            status?: string
            tenant_id: string
          updated_at?: string
          user_id?: string
        }
          Update: {
            channel?: string
            created_at?: string
            id?: string
            metadata_json?: Json
            month_key?: string
            notes?: string | null
            priority?: number
            scheduled_for?: string | null
            sent_at?: string | null
            status?: string
            tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_narratives: {
        Row: {
          created_at: string
          id: string
          input_json: Json
          model: string
          month_key: string
          narrative_text: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_json?: Json
          model?: string
          month_key: string
          narrative_text: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          input_json?: Json
          model?: string
          month_key?: string
          narrative_text?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
        properties: {
          Row: {
            address: string | null
            county: string | null
            created_at: string
            id: string
            landmark: string | null
            name: string
            neighborhood: string | null
            numbering_style: string
            postal_code: string | null
            street_address: string | null
            town_city: string | null
            updated_at: string
            user_id: string | null
          }
          Insert: {
            address?: string | null
            county?: string | null
            created_at?: string
            id?: string
            landmark?: string | null
            name: string
            neighborhood?: string | null
            numbering_style?: string
            postal_code?: string | null
            street_address?: string | null
            town_city?: string | null
            updated_at?: string
            user_id?: string | null
          }
          Update: {
            address?: string | null
            county?: string | null
            created_at?: string
            id?: string
            landmark?: string | null
            name?: string
            neighborhood?: string | null
            numbering_style?: string
            postal_code?: string | null
            street_address?: string | null
            town_city?: string | null
            updated_at?: string
            user_id?: string | null
          }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          first_month_override: number | null
          id: string
          is_prorated: boolean | null
          lease_start: string | null
          name: string
          opening_balance: number | null
          phone: string
          rent_amount: number
          security_deposit: number | null
          unit_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          first_month_override?: number | null
          id?: string
          is_prorated?: boolean | null
          lease_start?: string | null
          name: string
          opening_balance?: number | null
          phone: string
          rent_amount?: number
          security_deposit?: number | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          first_month_override?: number | null
          id?: string
          is_prorated?: boolean | null
          lease_start?: string | null
          name?: string
          opening_balance?: number | null
          phone?: string
          rent_amount?: number
          security_deposit?: number | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_risk_snapshots: {
        Row: {
          created_at: string
          factors_json: Json
          id: string
          month_key: string
          risk_level: string
          risk_score: number
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          factors_json?: Json
          id?: string
          month_key: string
          risk_level: string
          risk_score: number
          tenant_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          factors_json?: Json
          id?: string
          month_key?: string
          risk_level?: string
          risk_score?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_risk_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          property_id: string
          unit_number: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          property_id: string
          unit_number: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          property_id?: string
          unit_number?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_migrations: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          migration_key: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          migration_key: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          migration_key?: string
          started_at?: string | null
          status?: string
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
      calculate_tenant_risk: {
        Args: {
          p_month_key: string
        }
        Returns: number
      }
      create_opening_balance_charge: {
        Args: {
          p_amount: number
          p_effective_month: string
          p_note?: string | null
          p_tenant_id: string
        }
        Returns: string
      }
      delete_tenant_cascade: {
        Args: {
          p_tenant_id: string
        }
        Returns: undefined
      }
      enqueue_risk_reminders: {
        Args: {
          p_month_key: string
        }
        Returns: number
      }
      get_financial_statements: {
        Args: {
          p_month?: string | null
          p_user_id?: string | null
        }
        Returns: {
          balance: number
          charge_month: string
          property_name: string
          tenant_name: string
          total_charges: number
          total_collected: number
          unit_number: string
        }[]
      }
      insert_payment_with_allocations: {
        Args: {
          p_allocations?: Json | null
          p_amount: number
          p_mpesa_code?: string | null
          p_note?: string | null
          p_payment_month: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          payment_id: string
        }[]
      }
      record_payment_with_smart_allocation: {
        Args: {
          p_amount: number
          p_mpesa_code?: string | null
          p_note?: string | null
          p_payment_date?: string | null
          p_payment_month: string
          p_tenant_id: string
          p_user_id?: string | null
        }
        Returns: string
      }
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
