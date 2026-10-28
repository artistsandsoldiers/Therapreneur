// Generated from the Supabase schema with the Supabase connector (generate_typescript_types).
// Regenerate after each migration. One hand edit: save_capture's p_session_id may be null.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      billing_codes: {
        Row: {
          code: string
          description: string
          id: string
          is_no_show: boolean
          profession: Database["public"]["Enums"]["profession"]
        }
        Insert: {
          code: string
          description: string
          id?: string
          is_no_show?: boolean
          profession: Database["public"]["Enums"]["profession"]
        }
        Update: {
          code?: string
          description?: string
          id?: string
          is_no_show?: boolean
          profession?: Database["public"]["Enums"]["profession"]
        }
        Relationships: []
      }
      claim_batches: {
        Row: {
          created_at: string
          id: string
          medical_aid_id: string
          practice_id: string
          reference_number: string | null
          sent_at: string | null
          sent_to: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          medical_aid_id: string
          practice_id: string
          reference_number?: string | null
          sent_at?: string | null
          sent_to?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          medical_aid_id?: string
          practice_id?: string
          reference_number?: string | null
          sent_at?: string | null
          sent_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_batches_medical_aid_id_fkey"
            columns: ["medical_aid_id"]
            isOneToOne: false
            referencedRelation: "medical_aids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_batches_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          hint: string | null
          id: string
          name: string
          position: number
          practice_id: string | null
        }
        Insert: {
          created_at?: string
          hint?: string | null
          id?: string
          name: string
          position?: number
          practice_id?: string | null
        }
        Update: {
          created_at?: string
          hint?: string | null
          id?: string
          name?: string
          position?: number
          practice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_cents: number
          category_id: string
          created_at: string
          id: string
          note: string | null
          practice_id: string
          receipt_path: string | null
          spent_on: string
          supplier: string
        }
        Insert: {
          amount_cents: number
          category_id: string
          created_at?: string
          id?: string
          note?: string | null
          practice_id: string
          receipt_path?: string | null
          spent_on: string
          supplier: string
        }
        Update: {
          amount_cents?: number
          category_id?: string
          created_at?: string
          id?: string
          note?: string | null
          practice_id?: string
          receipt_path?: string | null
          spent_on?: string
          supplier?: string
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
            foreignKeyName: "expenses_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          billing_code_id: string | null
          code: string
          description: string
          icd10_codes: string[]
          id: string
          invoice_id: string
          position: number
          quantity: number
          unit_price_cents: number
        }
        Insert: {
          billing_code_id?: string | null
          code: string
          description: string
          icd10_codes?: string[]
          id?: string
          invoice_id: string
          position: number
          quantity: number
          unit_price_cents: number
        }
        Update: {
          billing_code_id?: string | null
          code?: string
          description?: string
          icd10_codes?: string[]
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_billing_code_id_fkey"
            columns: ["billing_code_id"]
            isOneToOne: false
            referencedRelation: "billing_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          claim_batch_id: string | null
          claimed_details: Json | null
          bill_to: Database["public"]["Enums"]["bill_to"]
          created_at: string
          due_on: string
          id: string
          issued_on: string
          number: number
          paid_on: string | null
          practice_id: string
          remittance_id: string | null
          session_id: string
        }
        Insert: {
          claim_batch_id?: string | null
          claimed_details?: Json | null
          bill_to: Database["public"]["Enums"]["bill_to"]
          created_at?: string
          due_on: string
          id?: string
          issued_on: string
          number: number
          paid_on?: string | null
          practice_id: string
          remittance_id?: string | null
          session_id: string
        }
        Update: {
          claim_batch_id?: string | null
          claimed_details?: Json | null
          bill_to?: Database["public"]["Enums"]["bill_to"]
          created_at?: string
          due_on?: string
          id?: string
          issued_on?: string
          number?: number
          paid_on?: string | null
          practice_id?: string
          remittance_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_claim_batch_id_fkey"
            columns: ["claim_batch_id"]
            isOneToOne: false
            referencedRelation: "claim_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_remittance_id_fkey"
            columns: ["remittance_id"]
            isOneToOne: false
            referencedRelation: "remittances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_aid_rates: {
        Row: {
          billing_code_id: string
          effective_from: string
          medical_aid_id: string
          rate_cents: number | null
        }
        Insert: {
          billing_code_id: string
          effective_from: string
          medical_aid_id: string
          rate_cents?: number | null
        }
        Update: {
          billing_code_id?: string
          effective_from?: string
          medical_aid_id?: string
          rate_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_aid_rates_billing_code_id_fkey"
            columns: ["billing_code_id"]
            isOneToOne: false
            referencedRelation: "billing_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_aid_rates_medical_aid_id_fkey"
            columns: ["medical_aid_id"]
            isOneToOne: false
            referencedRelation: "medical_aids"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_aids: {
        Row: {
          claims_email: string | null
          id: string
          name: string
        }
        Insert: {
          claims_email?: string | null
          id?: string
          name: string
        }
        Update: {
          claims_email?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          bill_to: Database["public"]["Enums"]["bill_to"]
          date_of_birth: string | null
          dependant_code: string | null
          referring_doctor_name: string | null
          referring_doctor_practice_number: string | null
          created_at: string
          first_name: string
          icd10_codes: string[]
          id: string
          last_name: string
          main_member_name: string | null
          medical_aid_id: string | null
          member_number: string | null
          past_since: string | null
          plan: string | null
          practice_id: string
        }
        Insert: {
          bill_to: Database["public"]["Enums"]["bill_to"]
          date_of_birth?: string | null
          dependant_code?: string | null
          referring_doctor_name?: string | null
          referring_doctor_practice_number?: string | null
          created_at?: string
          first_name: string
          icd10_codes?: string[]
          id?: string
          last_name: string
          main_member_name?: string | null
          medical_aid_id?: string | null
          member_number?: string | null
          past_since?: string | null
          plan?: string | null
          practice_id: string
        }
        Update: {
          bill_to?: Database["public"]["Enums"]["bill_to"]
          date_of_birth?: string | null
          dependant_code?: string | null
          referring_doctor_name?: string | null
          referring_doctor_practice_number?: string | null
          created_at?: string
          first_name?: string
          icd10_codes?: string[]
          id?: string
          last_name?: string
          main_member_name?: string | null
          medical_aid_id?: string | null
          member_number?: string | null
          past_since?: string | null
          plan?: string | null
          practice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_medical_aid_id_fkey"
            columns: ["medical_aid_id"]
            isOneToOne: false
            referencedRelation: "medical_aids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practices: {
        Row: {
          hpcsa_number: string | null
          address: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_branch_code: string | null
          bank_name: string | null
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          date_of_birth: string | null
          email: string | null
          id: string
          invite_email: string
          logo_path: string | null
          name: string | null
          no_show_price_cents: number | null
          phone: string | null
          practice_number: string | null
          practitioner_id: string | null
          price_adjustment_percent: number
          profession: Database["public"]["Enums"]["profession"] | null
          setup_completed_at: string | null
          tax_estimate_on: boolean
        }
        Insert: {
          hpcsa_number?: string | null
          address?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          id?: string
          invite_email: string
          logo_path?: string | null
          name?: string | null
          no_show_price_cents?: number | null
          phone?: string | null
          practice_number?: string | null
          practitioner_id?: string | null
          price_adjustment_percent?: number
          profession?: Database["public"]["Enums"]["profession"] | null
          setup_completed_at?: string | null
          tax_estimate_on?: boolean
        }
        Update: {
          hpcsa_number?: string | null
          address?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          id?: string
          invite_email?: string
          logo_path?: string | null
          name?: string | null
          no_show_price_cents?: number | null
          phone?: string | null
          practice_number?: string | null
          practitioner_id?: string | null
          price_adjustment_percent?: number
          profession?: Database["public"]["Enums"]["profession"] | null
          setup_completed_at?: string | null
          tax_estimate_on?: boolean
        }
        Relationships: []
      }
      remittances: {
        Row: {
          created_at: string
          id: string
          medical_aid_id: string
          paid_on: string
          practice_id: string
          reference: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          medical_aid_id: string
          paid_on: string
          practice_id: string
          reference?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          medical_aid_id?: string
          paid_on?: string
          practice_id?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remittances_medical_aid_id_fkey"
            columns: ["medical_aid_id"]
            isOneToOne: false
            referencedRelation: "medical_aids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remittances_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          id: string
          note: string | null
          outcome: Database["public"]["Enums"]["session_outcome"]
          patient_id: string
          practice_id: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          outcome: Database["public"]["Enums"]["session_outcome"]
          patient_id: string
          practice_id: string
          starts_at: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          outcome?: Database["public"]["Enums"]["session_outcome"]
          patient_id?: string
          practice_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_other_income: {
        Row: {
          created_at: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["other_income_kind"]
          paye_cents: number
          practice_id: string
          tax_year: number
          yearly_cents: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["other_income_kind"]
          paye_cents?: number
          practice_id: string
          tax_year: number
          yearly_cents: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["other_income_kind"]
          paye_cents?: number
          practice_id?: string
          tax_year?: number
          yearly_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_other_income_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          paid_on: string
          practice_id: string
          tax_year: number
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          paid_on: string
          practice_id: string
          tax_year: number
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          paid_on?: string
          practice_id?: string
          tax_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_payments_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_years: {
        Row: {
          created_at: string
          expenses_before_cents: number
          id: string
          income_before_cents: number
          last_taxable_income_cents: number | null
          medical_aid_members: number
          practice_id: string
          profit_override_cents: number | null
          records_from: string
          retirement_annuity_monthly_cents: number
          tax_year: number
        }
        Insert: {
          created_at?: string
          expenses_before_cents?: number
          id?: string
          income_before_cents?: number
          last_taxable_income_cents?: number | null
          medical_aid_members?: number
          practice_id: string
          profit_override_cents?: number | null
          records_from: string
          retirement_annuity_monthly_cents?: number
          tax_year: number
        }
        Update: {
          created_at?: string
          expenses_before_cents?: number
          id?: string
          income_before_cents?: number
          last_taxable_income_cents?: number | null
          medical_aid_members?: number
          practice_id?: string
          profit_override_cents?: number | null
          records_from?: string
          retirement_annuity_monthly_cents?: number
          tax_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_years_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          occupation: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          occupation: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          occupation?: string
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_practice: { Args: never; Returns: string }
      current_practice_id: { Args: never; Returns: string }
      invoice_is_claimed: { Args: { p_invoice_id: string }; Returns: boolean }
      is_invited: { Args: { email: string }; Returns: boolean }
      record_remittance: {
        Args: {
          p_invoice_ids: string[]
          p_medical_aid_id: string
          p_paid_on: string
          p_reference: string
        }
        Returns: string
      }
      save_capture: {
        Args: {
          p_bill_to: Database["public"]["Enums"]["bill_to"]
          p_lines: Json
          p_note: string
          p_outcome: Database["public"]["Enums"]["session_outcome"]
          p_patient_id: string
          p_session_id: string | null
          p_starts_at: string
        }
        Returns: string
      }
      start_claim_batch: {
        Args: { p_invoice_ids: string[]; p_medical_aid_id: string }
        Returns: string
      }
    }
    Enums: {
      bill_to: "medical_aid" | "patient"
      business_type: "sole_proprietor" | "inc"
      other_income_kind: "salary" | "interest" | "rent" | "other"
      profession: "occupational_therapy" | "physiotherapy" | "speech_therapy"
      session_outcome: "attended" | "no_show"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
export type Profession = Enums<"profession">
