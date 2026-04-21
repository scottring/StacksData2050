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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      _migration_id_map: {
        Row: {
          bubble_id: string
          created_at: string | null
          entity_type: string
          id: string
          supabase_id: string
        }
        Insert: {
          bubble_id: string
          created_at?: string | null
          entity_type: string
          id?: string
          supabase_id: string
        }
        Update: {
          bubble_id?: string
          created_at?: string | null
          entity_type?: string
          id?: string
          supabase_id?: string
        }
        Relationships: []
      }
      answer_documents: {
        Row: {
          answer_id: string | null
          document_type: string | null
          file_size: number | null
          file_url: string
          filename: string | null
          id: string
          mime_type: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          answer_id?: string | null
          document_type?: string | null
          file_size?: number | null
          file_url: string
          filename?: string | null
          id?: string
          mime_type?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          answer_id?: string | null
          document_type?: string | null
          file_size?: number | null
          file_url?: string
          filename?: string | null
          id?: string
          mime_type?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_documents_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_flags: {
        Row: {
          answer_id: string
          flagged_at: string | null
          flagged_by: string | null
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          sheet_id: string
          status: string | null
        }
        Insert: {
          answer_id: string
          flagged_at?: string | null
          flagged_by?: string | null
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          sheet_id: string
          status?: string | null
        }
        Update: {
          answer_id?: string
          flagged_at?: string | null
          flagged_by?: string | null
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sheet_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_flags_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_flags_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_flags_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_packets: {
        Row: {
          answer_id: string
          packet_id: string
        }
        Insert: {
          answer_id: string
          packet_id: string
        }
        Update: {
          answer_id?: string
          packet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_packets_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_packets_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "packets"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_rejections: {
        Row: {
          answer_id: string | null
          bubble_id: string | null
          created_at: string | null
          id: string
          reason: string | null
          rejected_by: string | null
        }
        Insert: {
          answer_id?: string | null
          bubble_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          rejected_by?: string | null
        }
        Update: {
          answer_id?: string | null
          bubble_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          rejected_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_rejections_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_rejections_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_shareable_companies: {
        Row: {
          answer_id: string
          company_id: string
        }
        Insert: {
          answer_id: string
          company_id: string
        }
        Update: {
          answer_id?: string
          company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_shareable_companies_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_shareable_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_text_choices: {
        Row: {
          answer_id: string
          id: string
          order_number: number | null
          text_choice: string
        }
        Insert: {
          answer_id: string
          id?: string
          order_number?: number | null
          text_choice: string
        }
        Update: {
          answer_id?: string
          id?: string
          order_number?: number | null
          text_choice?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_text_choices_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          additional_notes: string | null
          answer_id_number: number | null
          answer_name: string | null
          boolean_value: boolean | null
          bubble_id: string | null
          choice_id: string | null
          clarification: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          custom_comment_text: string | null
          custom_row_text: string | null
          customer_id: string | null
          date_value: string | null
          file_url: string | null
          id: string
          import_double_check: string | null
          list_table_column_id: string | null
          list_table_row_id: string | null
          modified_at: string | null
          number_value: number | null
          order_number: number | null
          originating_question_id: string | null
          parent_question_id: string | null
          parent_subsection_id: string | null
          question_id: string | null
          sheet_id: string | null
          slug: string | null
          stack_id: string | null
          supplier_id: string | null
          support_file_url: string | null
          support_text: string | null
          text_area_value: string | null
          text_value: string | null
          version_copied: boolean | null
          version_in_sheet: number | null
        }
        Insert: {
          additional_notes?: string | null
          answer_id_number?: number | null
          answer_name?: string | null
          boolean_value?: boolean | null
          bubble_id?: string | null
          choice_id?: string | null
          clarification?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_comment_text?: string | null
          custom_row_text?: string | null
          customer_id?: string | null
          date_value?: string | null
          file_url?: string | null
          id?: string
          import_double_check?: string | null
          list_table_column_id?: string | null
          list_table_row_id?: string | null
          modified_at?: string | null
          number_value?: number | null
          order_number?: number | null
          originating_question_id?: string | null
          parent_question_id?: string | null
          parent_subsection_id?: string | null
          question_id?: string | null
          sheet_id?: string | null
          slug?: string | null
          stack_id?: string | null
          supplier_id?: string | null
          support_file_url?: string | null
          support_text?: string | null
          text_area_value?: string | null
          text_value?: string | null
          version_copied?: boolean | null
          version_in_sheet?: number | null
        }
        Update: {
          additional_notes?: string | null
          answer_id_number?: number | null
          answer_name?: string | null
          boolean_value?: boolean | null
          bubble_id?: string | null
          choice_id?: string | null
          clarification?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_comment_text?: string | null
          custom_row_text?: string | null
          customer_id?: string | null
          date_value?: string | null
          file_url?: string | null
          id?: string
          import_double_check?: string | null
          list_table_column_id?: string | null
          list_table_row_id?: string | null
          modified_at?: string | null
          number_value?: number | null
          order_number?: number | null
          originating_question_id?: string | null
          parent_question_id?: string | null
          parent_subsection_id?: string | null
          question_id?: string | null
          sheet_id?: string | null
          slug?: string | null
          stack_id?: string | null
          supplier_id?: string | null
          support_file_url?: string | null
          support_text?: string | null
          text_area_value?: string | null
          text_value?: string | null
          version_copied?: boolean | null
          version_in_sheet?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_list_table_column_id_fkey"
            columns: ["list_table_column_id"]
            isOneToOne: false
            referencedRelation: "list_table_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_originating_question_id_fkey"
            columns: ["originating_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_parent_subsection_id_fkey"
            columns: ["parent_subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_stack_id_fkey"
            columns: ["stack_id"]
            isOneToOne: false
            referencedRelation: "stacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      association_companies: {
        Row: {
          association_id: string
          company_id: string
        }
        Insert: {
          association_id: string
          company_id: string
        }
        Update: {
          association_id?: string
          company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "association_companies_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "association_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      associations: {
        Row: {
          active: boolean | null
          bubble_id: string | null
          created_at: string | null
          id: string
          modified_at: string | null
          name: string
        }
        Insert: {
          active?: boolean | null
          bubble_id?: string | null
          created_at?: string | null
          id?: string
          modified_at?: string | null
          name: string
        }
        Update: {
          active?: boolean | null
          bubble_id?: string | null
          created_at?: string | null
          id?: string
          modified_at?: string | null
          name?: string
        }
        Relationships: []
      }
      canonical_answer_links: {
        Row: {
          answer_id: string | null
          canonical_parameter_id: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          answer_id?: string | null
          canonical_parameter_id?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          answer_id?: string | null
          canonical_parameter_id?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canonical_answer_links_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canonical_answer_links_canonical_parameter_id_fkey"
            columns: ["canonical_parameter_id"]
            isOneToOne: false
            referencedRelation: "canonical_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_parameter_tags: {
        Row: {
          canonical_parameter_id: string
          created_at: string | null
          tag_id: string
        }
        Insert: {
          canonical_parameter_id: string
          created_at?: string | null
          tag_id: string
        }
        Update: {
          canonical_parameter_id?: string
          created_at?: string | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canonical_parameter_tags_canonical_parameter_id_fkey"
            columns: ["canonical_parameter_id"]
            isOneToOne: false
            referencedRelation: "canonical_parameters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canonical_parameter_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_parameters: {
        Row: {
          code: string
          created_at: string | null
          data_type: string | null
          description: string | null
          id: string
          is_active: boolean | null
          legacy_question_id: string | null
          name: string
          polarity: string | null
          section: string | null
          sort_order: number | null
          subsection: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          data_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          legacy_question_id?: string | null
          name: string
          polarity?: string | null
          section?: string | null
          sort_order?: number | null
          subsection?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          data_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          legacy_question_id?: string | null
          name?: string
          polarity?: string | null
          section?: string | null
          sort_order?: number | null
          subsection?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canonical_parameters_legacy_question_id_fkey"
            columns: ["legacy_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      chemical_inventory: {
        Row: {
          cas_number: string
          chemical_name: string | null
          created_at: string | null
          data_source: string | null
          hazards: string[] | null
          id: string
          inchi_key: string | null
          is_epa_tosca: boolean | null
          is_food_contact_restricted: boolean | null
          is_pfas: boolean | null
          is_prop65: boolean | null
          is_reach_svhc: boolean | null
          is_rohs: boolean | null
          iupac_name: string | null
          last_updated: string | null
          molecular_formula: string | null
          molecular_weight: number | null
          pubchem_cid: number | null
          restrictions: string[] | null
          risk_level: string | null
          synonyms: string[] | null
          warnings: string[] | null
        }
        Insert: {
          cas_number: string
          chemical_name?: string | null
          created_at?: string | null
          data_source?: string | null
          hazards?: string[] | null
          id?: string
          inchi_key?: string | null
          is_epa_tosca?: boolean | null
          is_food_contact_restricted?: boolean | null
          is_pfas?: boolean | null
          is_prop65?: boolean | null
          is_reach_svhc?: boolean | null
          is_rohs?: boolean | null
          iupac_name?: string | null
          last_updated?: string | null
          molecular_formula?: string | null
          molecular_weight?: number | null
          pubchem_cid?: number | null
          restrictions?: string[] | null
          risk_level?: string | null
          synonyms?: string[] | null
          warnings?: string[] | null
        }
        Update: {
          cas_number?: string
          chemical_name?: string | null
          created_at?: string | null
          data_source?: string | null
          hazards?: string[] | null
          id?: string
          inchi_key?: string | null
          is_epa_tosca?: boolean | null
          is_food_contact_restricted?: boolean | null
          is_pfas?: boolean | null
          is_prop65?: boolean | null
          is_reach_svhc?: boolean | null
          is_rohs?: boolean | null
          iupac_name?: string | null
          last_updated?: string | null
          molecular_formula?: string | null
          molecular_weight?: number | null
          pubchem_cid?: number | null
          restrictions?: string[] | null
          risk_level?: string | null
          synonyms?: string[] | null
          warnings?: string[] | null
        }
        Relationships: []
      }
      choices: {
        Row: {
          bubble_id: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          import_map: string | null
          modified_at: string | null
          order_number: number | null
          parent_question_id: string | null
          question_id: string | null
        }
        Insert: {
          bubble_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          import_map?: string | null
          modified_at?: string | null
          order_number?: number | null
          parent_question_id?: string | null
          question_id?: string | null
        }
        Update: {
          bubble_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          import_map?: string | null
          modified_at?: string | null
          order_number?: number | null
          parent_question_id?: string | null
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "choices_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          parent_id: string
          parent_type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          parent_id: string
          parent_type: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          parent_id?: string
          parent_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean | null
          bubble_id: string | null
          created_at: string | null
          email_domain: string | null
          email_suffix: string | null
          hide_hq_import: boolean | null
          id: string
          is_zapier: boolean | null
          list_emails_prefix: string[] | null
          location_text: string | null
          logo_url: string | null
          modified_at: string | null
          name: string
          name_lower_case: string | null
          patch_status_applied: boolean | null
          plan_started_at: string | null
          premium_features_requested: string[] | null
          show_as_supplier: boolean | null
          slug: string | null
          subscription_anniversary_date: string | null
          subscription_cancel_at_trial: boolean | null
          subscription_canceled: boolean | null
          subscription_expired: boolean | null
          subscription_sheets_allowed: number | null
          subscription_trial_ends: string | null
          type: string | null
        }
        Insert: {
          active?: boolean | null
          bubble_id?: string | null
          created_at?: string | null
          email_domain?: string | null
          email_suffix?: string | null
          hide_hq_import?: boolean | null
          id?: string
          is_zapier?: boolean | null
          list_emails_prefix?: string[] | null
          location_text?: string | null
          logo_url?: string | null
          modified_at?: string | null
          name: string
          name_lower_case?: string | null
          patch_status_applied?: boolean | null
          plan_started_at?: string | null
          premium_features_requested?: string[] | null
          show_as_supplier?: boolean | null
          slug?: string | null
          subscription_anniversary_date?: string | null
          subscription_cancel_at_trial?: boolean | null
          subscription_canceled?: boolean | null
          subscription_expired?: boolean | null
          subscription_sheets_allowed?: number | null
          subscription_trial_ends?: string | null
          type?: string | null
        }
        Update: {
          active?: boolean | null
          bubble_id?: string | null
          created_at?: string | null
          email_domain?: string | null
          email_suffix?: string | null
          hide_hq_import?: boolean | null
          id?: string
          is_zapier?: boolean | null
          list_emails_prefix?: string[] | null
          location_text?: string | null
          logo_url?: string | null
          modified_at?: string | null
          name?: string
          name_lower_case?: string | null
          patch_status_applied?: boolean | null
          plan_started_at?: string | null
          premium_features_requested?: string[] | null
          show_as_supplier?: boolean | null
          slug?: string | null
          subscription_anniversary_date?: string | null
          subscription_cancel_at_trial?: boolean | null
          subscription_canceled?: boolean | null
          subscription_expired?: boolean | null
          subscription_sheets_allowed?: number | null
          subscription_trial_ends?: string | null
          type?: string | null
        }
        Relationships: []
      }
      company_employees: {
        Row: {
          company_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          company_id: string | null
          company_name: string | null
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string | null
          id: string
          invitation_type: string | null
          notes: string | null
          request_id: string | null
          sent_at: string | null
          token: string
          trial_batch_id: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invitation_type?: string | null
          notes?: string | null
          request_id?: string | null
          sent_at?: string | null
          token: string
          trial_batch_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invitation_type?: string | null
          notes?: string | null
          request_id?: string | null
          sent_at?: string | null
          token?: string
          trial_batch_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invitations_trial_batch"
            columns: ["trial_batch_id"]
            isOneToOne: false
            referencedRelation: "trial_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approved_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "pending_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      list_table_columns: {
        Row: {
          bubble_id: string | null
          choice_options: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          modified_at: string | null
          name: string
          order_number: number | null
          parent_table_id: string | null
          question_id: string | null
          response_type: string | null
        }
        Insert: {
          bubble_id?: string | null
          choice_options?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          modified_at?: string | null
          name: string
          order_number?: number | null
          parent_table_id?: string | null
          question_id?: string | null
          response_type?: string | null
        }
        Update: {
          bubble_id?: string | null
          choice_options?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          modified_at?: string | null
          name?: string
          order_number?: number | null
          parent_table_id?: string | null
          question_id?: string | null
          response_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "list_table_columns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_table_columns_parent_table_id_fkey"
            columns: ["parent_table_id"]
            isOneToOne: false
            referencedRelation: "list_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_table_columns_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      list_table_rows: {
        Row: {
          bubble_id: string | null
          created_at: string | null
          id: string
          modified_at: string | null
          row_id: number | null
          table_id: string | null
        }
        Insert: {
          bubble_id?: string | null
          created_at?: string | null
          id?: string
          modified_at?: string | null
          row_id?: number | null
          table_id?: string | null
        }
        Update: {
          bubble_id?: string | null
          created_at?: string | null
          id?: string
          modified_at?: string | null
          row_id?: number | null
          table_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "list_table_rows_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "list_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      list_tables: {
        Row: {
          bubble_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          modified_at: string | null
          name: string | null
        }
        Insert: {
          bubble_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          modified_at?: string | null
          name?: string | null
        }
        Update: {
          bubble_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          modified_at?: string | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "list_tables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      normalization_mappings: {
        Row: {
          canonical_parameter_id: string | null
          created_at: string | null
          id: string
          legacy_question_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          canonical_parameter_id?: string | null
          created_at?: string | null
          id?: string
          legacy_question_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          canonical_parameter_id?: string | null
          created_at?: string | null
          id?: string
          legacy_question_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "normalization_mappings_canonical_parameter_id_fkey"
            columns: ["canonical_parameter_id"]
            isOneToOne: false
            referencedRelation: "canonical_parameters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "normalization_mappings_legacy_question_id_fkey"
            columns: ["legacy_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string | null
          event_type: string
          id: string
          read_at: string | null
          sent_at: string | null
          sheet_id: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          read_at?: string | null
          sent_at?: string | null
          sheet_id?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          read_at?: string | null
          sent_at?: string | null
          sheet_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      packets: {
        Row: {
          bubble_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          modified_at: string | null
          name: string | null
        }
        Insert: {
          bubble_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          modified_at?: string | null
          name?: string | null
        }
        Update: {
          bubble_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          modified_at?: string | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      question_choices: {
        Row: {
          choice_id: string
          order_number: number | null
          question_id: string
        }
        Insert: {
          choice_id: string
          order_number?: number | null
          question_id: string
        }
        Update: {
          choice_id?: string
          order_number?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_choices_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          question_id: string
          sheet_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          question_id: string
          sheet_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          question_id?: string
          sheet_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_comments_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_comments_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      question_companies: {
        Row: {
          company_id: string
          question_id: string
        }
        Insert: {
          company_id: string
          question_id: string
        }
        Update: {
          company_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_companies_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_tags: {
        Row: {
          created_at: string | null
          id: string
          question_id: string | null
          tag_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id?: string | null
          tag_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string | null
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_tags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          a_q_help: string | null
          bubble_id: string | null
          clarification: string | null
          clarification_yes_no: boolean | null
          company_id: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          dependent_no_show: boolean | null
          highlight: boolean | null
          id: string
          list_table_id: string | null
          lock: boolean | null
          modified_at: string | null
          name: string | null
          optional_question: boolean | null
          order_number: number | null
          parent_choice_id: string | null
          parent_section_id: string | null
          parent_subsection_id: string | null
          question_description: string | null
          question_id_number: number | null
          question_type: string | null
          required: boolean | null
          response_type: string | null
          section_name_sort: string | null
          section_sort_number: number | null
          slug: string | null
          static_text: string | null
          subsection_id: string | null
          subsection_name_sort: string | null
          subsection_sort_number: number | null
          support_file_reason: string | null
          support_file_requested: boolean | null
        }
        Insert: {
          a_q_help?: string | null
          bubble_id?: string | null
          clarification?: string | null
          clarification_yes_no?: boolean | null
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          dependent_no_show?: boolean | null
          highlight?: boolean | null
          id?: string
          list_table_id?: string | null
          lock?: boolean | null
          modified_at?: string | null
          name?: string | null
          optional_question?: boolean | null
          order_number?: number | null
          parent_choice_id?: string | null
          parent_section_id?: string | null
          parent_subsection_id?: string | null
          question_description?: string | null
          question_id_number?: number | null
          question_type?: string | null
          required?: boolean | null
          response_type?: string | null
          section_name_sort?: string | null
          section_sort_number?: number | null
          slug?: string | null
          static_text?: string | null
          subsection_id?: string | null
          subsection_name_sort?: string | null
          subsection_sort_number?: number | null
          support_file_reason?: string | null
          support_file_requested?: boolean | null
        }
        Update: {
          a_q_help?: string | null
          bubble_id?: string | null
          clarification?: string | null
          clarification_yes_no?: boolean | null
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          dependent_no_show?: boolean | null
          highlight?: boolean | null
          id?: string
          list_table_id?: string | null
          lock?: boolean | null
          modified_at?: string | null
          name?: string | null
          optional_question?: boolean | null
          order_number?: number | null
          parent_choice_id?: string | null
          parent_section_id?: string | null
          parent_subsection_id?: string | null
          question_description?: string | null
          question_id_number?: number | null
          question_type?: string | null
          required?: boolean | null
          response_type?: string | null
          section_name_sort?: string | null
          section_sort_number?: number | null
          slug?: string | null
          static_text?: string | null
          subsection_id?: string | null
          subsection_name_sort?: string | null
          subsection_sort_number?: number | null
          support_file_reason?: string | null
          support_file_requested?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_questions_parent_choice"
            columns: ["parent_choice_id"]
            isOneToOne: false
            referencedRelation: "choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_list_table_id_fkey"
            columns: ["list_table_id"]
            isOneToOne: false
            referencedRelation: "list_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_parent_section_id_fkey"
            columns: ["parent_section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_parent_subsection_id_fkey"
            columns: ["parent_subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      request_tags: {
        Row: {
          created_at: string | null
          id: string
          request_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          request_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          request_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_tags_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approved_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_tags_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "pending_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_tags_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          bubble_id: string | null
          comment_requestor: string | null
          comment_supplier: string | null
          created_at: string | null
          created_by: string | null
          creator_email: string | null
          days_to_first_share: number | null
          days_to_first_share_2: number | null
          days_to_last_share: number | null
          days_to_last_share_2: number | null
          first_shared_date: string | null
          first_shared_date_2: string | null
          id: string
          last_share_date: string | null
          last_share_date_2: string | null
          manufacturer_marked_as_provided: boolean | null
          modified_at: string | null
          notes: string | null
          owner_company_id: string | null
          processed: boolean | null
          product_name: string | null
          reader_company_id: string | null
          requesting_from_id: string | null
          requestor_id: string | null
          sheet_id: string | null
          show_as_removed: boolean | null
          slug: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          bubble_id?: string | null
          comment_requestor?: string | null
          comment_supplier?: string | null
          created_at?: string | null
          created_by?: string | null
          creator_email?: string | null
          days_to_first_share?: number | null
          days_to_first_share_2?: number | null
          days_to_last_share?: number | null
          days_to_last_share_2?: number | null
          first_shared_date?: string | null
          first_shared_date_2?: string | null
          id?: string
          last_share_date?: string | null
          last_share_date_2?: string | null
          manufacturer_marked_as_provided?: boolean | null
          modified_at?: string | null
          notes?: string | null
          owner_company_id?: string | null
          processed?: boolean | null
          product_name?: string | null
          reader_company_id?: string | null
          requesting_from_id?: string | null
          requestor_id?: string | null
          sheet_id?: string | null
          show_as_removed?: boolean | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          bubble_id?: string | null
          comment_requestor?: string | null
          comment_supplier?: string | null
          created_at?: string | null
          created_by?: string | null
          creator_email?: string | null
          days_to_first_share?: number | null
          days_to_first_share_2?: number | null
          days_to_last_share?: number | null
          days_to_last_share_2?: number | null
          first_shared_date?: string | null
          first_shared_date_2?: string | null
          id?: string
          last_share_date?: string | null
          last_share_date_2?: string | null
          manufacturer_marked_as_provided?: boolean | null
          modified_at?: string | null
          notes?: string | null
          owner_company_id?: string | null
          processed?: boolean | null
          product_name?: string | null
          reader_company_id?: string | null
          requesting_from_id?: string | null
          requestor_id?: string | null
          sheet_id?: string | null
          show_as_removed?: boolean | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_owner_company_id_fkey"
            columns: ["owner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_reader_company_id_fkey"
            columns: ["reader_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_requesting_from_id_fkey"
            columns: ["requesting_from_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_requestor_id_fkey"
            columns: ["requestor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      section_questions: {
        Row: {
          order_number: number | null
          question_id: string
          section_id: string
        }
        Insert: {
          order_number?: number | null
          question_id: string
          section_id: string
        }
        Update: {
          order_number?: number | null
          question_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          association_id: string | null
          bubble_id: string | null
          created_at: string | null
          created_by: string | null
          help: string | null
          id: string
          modified_at: string | null
          name: string
          order_number: number | null
          questionnaire_text: string | null
          stack_id: string | null
        }
        Insert: {
          association_id?: string | null
          bubble_id?: string | null
          created_at?: string | null
          created_by?: string | null
          help?: string | null
          id?: string
          modified_at?: string | null
          name: string
          order_number?: number | null
          questionnaire_text?: string | null
          stack_id?: string | null
        }
        Update: {
          association_id?: string | null
          bubble_id?: string | null
          created_at?: string | null
          created_by?: string | null
          help?: string | null
          id?: string
          modified_at?: string | null
          name?: string
          order_number?: number | null
          questionnaire_text?: string | null
          stack_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_stack_id_fkey"
            columns: ["stack_id"]
            isOneToOne: false
            referencedRelation: "stacks"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_chemicals: {
        Row: {
          answer_id: string | null
          chemical_id: string
          concentration: number | null
          concentration_unit: string | null
          created_at: string | null
          id: string
          list_table_row_id: string | null
          sheet_id: string
          updated_at: string | null
        }
        Insert: {
          answer_id?: string | null
          chemical_id: string
          concentration?: number | null
          concentration_unit?: string | null
          created_at?: string | null
          id?: string
          list_table_row_id?: string | null
          sheet_id: string
          updated_at?: string | null
        }
        Update: {
          answer_id?: string | null
          chemical_id?: string
          concentration?: number | null
          concentration_unit?: string | null
          created_at?: string | null
          id?: string
          list_table_row_id?: string | null
          sheet_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sheet_chemicals_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_chemicals_chemical_id_fkey"
            columns: ["chemical_id"]
            isOneToOne: false
            referencedRelation: "chemical_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_chemicals_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_packets: {
        Row: {
          packet_id: string
          sheet_id: string
        }
        Insert: {
          packet_id: string
          sheet_id: string
        }
        Update: {
          packet_id?: string
          sheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheet_packets_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "packets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_packets_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_questions: {
        Row: {
          order_number: number | null
          question_id: string
          sheet_id: string
        }
        Insert: {
          order_number?: number | null
          question_id: string
          sheet_id: string
        }
        Update: {
          order_number?: number | null
          question_id?: string
          sheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheet_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_questions_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_shareable_companies: {
        Row: {
          company_id: string
          sheet_id: string
        }
        Insert: {
          company_id: string
          sheet_id: string
        }
        Update: {
          company_id?: string
          sheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheet_shareable_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_shareable_companies_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_statuses: {
        Row: {
          bubble_id: string | null
          company_id: string | null
          complete_text: string | null
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          father_of_sheet_id: string | null
          father_of_sheet_version: number | null
          id: string
          modified_at: string | null
          observations: string | null
          reminders_count: number | null
          sheet_id: string | null
          sheet_name: string | null
          slug: string | null
          status: string | null
          supplier_id: string | null
          version: number | null
        }
        Insert: {
          bubble_id?: string | null
          company_id?: string | null
          complete_text?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          father_of_sheet_id?: string | null
          father_of_sheet_version?: number | null
          id?: string
          modified_at?: string | null
          observations?: string | null
          reminders_count?: number | null
          sheet_id?: string | null
          sheet_name?: string | null
          slug?: string | null
          status?: string | null
          supplier_id?: string | null
          version?: number | null
        }
        Update: {
          bubble_id?: string | null
          company_id?: string | null
          complete_text?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          father_of_sheet_id?: string | null
          father_of_sheet_version?: number | null
          id?: string
          modified_at?: string | null
          observations?: string | null
          reminders_count?: number | null
          sheet_id?: string | null
          sheet_name?: string | null
          slug?: string | null
          status?: string | null
          supplier_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sheet_statuses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_statuses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_statuses_father_of_sheet_id_fkey"
            columns: ["father_of_sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_statuses_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_statuses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_supplier_users_assigned: {
        Row: {
          sheet_id: string
          user_id: string
        }
        Insert: {
          sheet_id: string
          user_id: string
        }
        Update: {
          sheet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheet_supplier_users_assigned_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_supplier_users_assigned_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_tags: {
        Row: {
          created_at: string | null
          id: string
          sheet_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          sheet_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          sheet_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheet_tags_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      sheets: {
        Row: {
          approved_at: string | null
          assigned_to_company_id: string | null
          bubble_id: string | null
          company_id: string | null
          contact_profile_id: string | null
          created_at: string | null
          created_by: string | null
          current_number_of_col_row: number | null
          father_sheet_id: string | null
          id: string
          imported_file_url: string | null
          imported_processed: number | null
          imported_to_process: number | null
          mark_as_archived: boolean | null
          mark_as_test_sheet: boolean | null
          modified_at: string | null
          name: string
          name_lower_case: string | null
          new_name: boolean | null
          new_status: string | null
          original_requestor_assoc_id: string | null
          prev_sheet_id: string | null
          requesting_company_id: string | null
          requestor_email: string | null
          requestor_name: string | null
          slug: string | null
          stack_id: string | null
          status: string | null
          submitted_at: string | null
          supplier_assignment_log: string[] | null
          test_being_deleted: boolean | null
          unread_comment: boolean | null
          version: number | null
          version_close_date: string | null
          version_closed_by: string | null
          version_count_expected: number | null
          version_count_original: number | null
          version_count_processed: number | null
          version_description: string | null
          version_lock: boolean | null
        }
        Insert: {
          approved_at?: string | null
          assigned_to_company_id?: string | null
          bubble_id?: string | null
          company_id?: string | null
          contact_profile_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_number_of_col_row?: number | null
          father_sheet_id?: string | null
          id?: string
          imported_file_url?: string | null
          imported_processed?: number | null
          imported_to_process?: number | null
          mark_as_archived?: boolean | null
          mark_as_test_sheet?: boolean | null
          modified_at?: string | null
          name: string
          name_lower_case?: string | null
          new_name?: boolean | null
          new_status?: string | null
          original_requestor_assoc_id?: string | null
          prev_sheet_id?: string | null
          requesting_company_id?: string | null
          requestor_email?: string | null
          requestor_name?: string | null
          slug?: string | null
          stack_id?: string | null
          status?: string | null
          submitted_at?: string | null
          supplier_assignment_log?: string[] | null
          test_being_deleted?: boolean | null
          unread_comment?: boolean | null
          version?: number | null
          version_close_date?: string | null
          version_closed_by?: string | null
          version_count_expected?: number | null
          version_count_original?: number | null
          version_count_processed?: number | null
          version_description?: string | null
          version_lock?: boolean | null
        }
        Update: {
          approved_at?: string | null
          assigned_to_company_id?: string | null
          bubble_id?: string | null
          company_id?: string | null
          contact_profile_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_number_of_col_row?: number | null
          father_sheet_id?: string | null
          id?: string
          imported_file_url?: string | null
          imported_processed?: number | null
          imported_to_process?: number | null
          mark_as_archived?: boolean | null
          mark_as_test_sheet?: boolean | null
          modified_at?: string | null
          name?: string
          name_lower_case?: string | null
          new_name?: boolean | null
          new_status?: string | null
          original_requestor_assoc_id?: string | null
          prev_sheet_id?: string | null
          requesting_company_id?: string | null
          requestor_email?: string | null
          requestor_name?: string | null
          slug?: string | null
          stack_id?: string | null
          status?: string | null
          submitted_at?: string | null
          supplier_assignment_log?: string[] | null
          test_being_deleted?: boolean | null
          unread_comment?: boolean | null
          version?: number | null
          version_close_date?: string | null
          version_closed_by?: string | null
          version_count_expected?: number | null
          version_count_original?: number | null
          version_count_processed?: number | null
          version_description?: string | null
          version_lock?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "sheets_assigned_to_company_id_fkey"
            columns: ["assigned_to_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheets_contact_profile_id_fkey"
            columns: ["contact_profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheets_father_sheet_id_fkey"
            columns: ["father_sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheets_original_requestor_assoc_id_fkey"
            columns: ["original_requestor_assoc_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheets_prev_sheet_id_fkey"
            columns: ["prev_sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheets_requesting_company_id_fkey"
            columns: ["requesting_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheets_stack_id_fkey"
            columns: ["stack_id"]
            isOneToOne: false
            referencedRelation: "stacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheets_version_closed_by_fkey"
            columns: ["version_closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stack_sections: {
        Row: {
          order_number: number | null
          section_id: string
          stack_id: string
        }
        Insert: {
          order_number?: number | null
          section_id: string
          stack_id: string
        }
        Update: {
          order_number?: number | null
          section_id?: string
          stack_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stack_sections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stack_sections_stack_id_fkey"
            columns: ["stack_id"]
            isOneToOne: false
            referencedRelation: "stacks"
            referencedColumns: ["id"]
          },
        ]
      }
      stacks: {
        Row: {
          association_id: string | null
          bubble_id: string | null
          created_at: string | null
          id: string
          is_bundle: boolean | null
          modified_at: string | null
          name: string
        }
        Insert: {
          association_id?: string | null
          bubble_id?: string | null
          created_at?: string | null
          id?: string
          is_bundle?: boolean | null
          modified_at?: string | null
          name: string
        }
        Update: {
          association_id?: string | null
          bubble_id?: string | null
          created_at?: string | null
          id?: string
          is_bundle?: boolean | null
          modified_at?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "stacks_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      subsections: {
        Row: {
          bubble_id: string | null
          created_at: string | null
          id: string
          modified_at: string | null
          name: string
          order_number: number | null
          section_id: string | null
          show_title_and_group: boolean | null
        }
        Insert: {
          bubble_id?: string | null
          created_at?: string | null
          id?: string
          modified_at?: string | null
          name: string
          order_number?: number | null
          section_id?: string | null
          show_title_and_group?: boolean | null
        }
        Update: {
          bubble_id?: string | null
          created_at?: string | null
          id?: string
          modified_at?: string | null
          name?: string
          order_number?: number | null
          section_id?: string | null
          show_title_and_group?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "subsections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_hidden_companies: {
        Row: {
          company_id: string
          tag_id: string
        }
        Insert: {
          company_id: string
          tag_id: string
        }
        Update: {
          company_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_hidden_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_hidden_companies_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_stacks: {
        Row: {
          stack_id: string
          tag_id: string
        }
        Insert: {
          stack_id: string
          tag_id: string
        }
        Update: {
          stack_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_stacks_stack_id_fkey"
            columns: ["stack_id"]
            isOneToOne: false
            referencedRelation: "stacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_stacks_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          bubble_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          custom_active: boolean | null
          custom_any_can_see: boolean | null
          custom_company_id: string | null
          custom_only_if_requested_or_shared: boolean | null
          description: string | null
          group_number: number | null
          id: string
          modified_at: string | null
          name: string
          slug: string | null
        }
        Insert: {
          bubble_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_active?: boolean | null
          custom_any_can_see?: boolean | null
          custom_company_id?: string | null
          custom_only_if_requested_or_shared?: boolean | null
          description?: string | null
          group_number?: number | null
          id?: string
          modified_at?: string | null
          name: string
          slug?: string | null
        }
        Update: {
          bubble_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_active?: boolean | null
          custom_any_can_see?: boolean | null
          custom_company_id?: string | null
          custom_only_if_requested_or_shared?: boolean | null
          description?: string | null
          group_number?: number | null
          id?: string
          modified_at?: string | null
          name?: string
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_custom_company_id_fkey"
            columns: ["custom_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_activity_events: {
        Row: {
          created_at: string | null
          email: string
          event_data: Json | null
          event_type: string
          id: string
          page_path: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          event_data?: Json | null
          event_type: string
          id?: string
          page_path?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          page_path?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trial_batches: {
        Row: {
          accepted_count: number | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          sent_count: number | null
          total_count: number | null
        }
        Insert: {
          accepted_count?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          sent_count?: number | null
          total_count?: number | null
        }
        Update: {
          accepted_count?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          sent_count?: number | null
          total_count?: number | null
        }
        Relationships: []
      }
      trial_discovery_responses: {
        Row: {
          biggest_surprise: string | null
          company_name: string | null
          concerns_questions: string | null
          created_at: string | null
          email: string
          follow_up_responded_at: string | null
          follow_up_sent_at: string | null
          id: string
          impact_measurement: string | null
          invitation_id: string | null
          learning_goals: string | null
          likelihood_to_recommend: number | null
          motivation_interest: string | null
          platform_experience: string | null
          remaining_questions: string | null
          responded_at: string | null
          success_definition: string | null
          trial_completed_at: string | null
          trial_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          biggest_surprise?: string | null
          company_name?: string | null
          concerns_questions?: string | null
          created_at?: string | null
          email: string
          follow_up_responded_at?: string | null
          follow_up_sent_at?: string | null
          id?: string
          impact_measurement?: string | null
          invitation_id?: string | null
          learning_goals?: string | null
          likelihood_to_recommend?: number | null
          motivation_interest?: string | null
          platform_experience?: string | null
          remaining_questions?: string | null
          responded_at?: string | null
          success_definition?: string | null
          trial_completed_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          biggest_surprise?: string | null
          company_name?: string | null
          concerns_questions?: string | null
          created_at?: string | null
          email?: string
          follow_up_responded_at?: string | null
          follow_up_sent_at?: string | null
          id?: string
          impact_measurement?: string | null
          invitation_id?: string | null
          learning_goals?: string | null
          likelihood_to_recommend?: number | null
          motivation_interest?: string | null
          platform_experience?: string | null
          remaining_questions?: string | null
          responded_at?: string | null
          success_definition?: string | null
          trial_completed_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_discovery_responses_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_issues: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          reporter_email: string | null
          resolution_notes: string | null
          resolved_at: string | null
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          reporter_email?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          reporter_email?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          _deprecated_can_add_associations: boolean | null
          _deprecated_can_add_companies: boolean | null
          _deprecated_can_add_new_questions: boolean | null
          _deprecated_can_add_new_sheet: boolean | null
          _deprecated_can_add_new_stack: boolean | null
          _deprecated_can_add_new_user: boolean | null
          _deprecated_can_change_answers: boolean | null
          _deprecated_can_change_sheet_status: boolean | null
          _deprecated_can_change_status: boolean | null
          _deprecated_can_run_reports: boolean | null
          _deprecated_can_see_all_sheets: boolean | null
          a_lnk: string | null
          bubble_id: string | null
          comments: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          email_changes_dates: string[] | null
          email_count: number | null
          emails_changes: string[] | null
          first_name: string | null
          full_name: string | null
          has_logged_in: boolean
          id: string
          invitation_sent: boolean | null
          is_company_main_contact: boolean | null
          is_company_point_person: boolean | null
          is_in_payed_or_established_plan: boolean | null
          is_prospect: boolean | null
          is_sup_cert_manager: boolean | null
          is_sup_cert_tmplt_creator: boolean | null
          is_sup_get_email_notifications: boolean | null
          is_sup_reviewer: boolean | null
          is_sup_view_question_menu: boolean | null
          is_super_admin: boolean | null
          is_supplier_pointguard: boolean | null
          job_title: string | null
          language: string | null
          last_name: string | null
          modified_at: string | null
          one_time_message: string | null
          password_changed: boolean | null
          phone_number: number | null
          phone_text: string | null
          plan_first_started: string | null
          profile_done: boolean | null
          profile_pic_url: string | null
          prospect_agree: boolean | null
          prospect_company_text: string | null
          prospect_paid: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          self_sign_up_invitation_code: string | null
          slug: string | null
          user_type: string | null
        }
        Insert: {
          _deprecated_can_add_associations?: boolean | null
          _deprecated_can_add_companies?: boolean | null
          _deprecated_can_add_new_questions?: boolean | null
          _deprecated_can_add_new_sheet?: boolean | null
          _deprecated_can_add_new_stack?: boolean | null
          _deprecated_can_add_new_user?: boolean | null
          _deprecated_can_change_answers?: boolean | null
          _deprecated_can_change_sheet_status?: boolean | null
          _deprecated_can_change_status?: boolean | null
          _deprecated_can_run_reports?: boolean | null
          _deprecated_can_see_all_sheets?: boolean | null
          a_lnk?: string | null
          bubble_id?: string | null
          comments?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          email_changes_dates?: string[] | null
          email_count?: number | null
          emails_changes?: string[] | null
          first_name?: string | null
          full_name?: string | null
          has_logged_in?: boolean
          id: string
          invitation_sent?: boolean | null
          is_company_main_contact?: boolean | null
          is_company_point_person?: boolean | null
          is_in_payed_or_established_plan?: boolean | null
          is_prospect?: boolean | null
          is_sup_cert_manager?: boolean | null
          is_sup_cert_tmplt_creator?: boolean | null
          is_sup_get_email_notifications?: boolean | null
          is_sup_reviewer?: boolean | null
          is_sup_view_question_menu?: boolean | null
          is_super_admin?: boolean | null
          is_supplier_pointguard?: boolean | null
          job_title?: string | null
          language?: string | null
          last_name?: string | null
          modified_at?: string | null
          one_time_message?: string | null
          password_changed?: boolean | null
          phone_number?: number | null
          phone_text?: string | null
          plan_first_started?: string | null
          profile_done?: boolean | null
          profile_pic_url?: string | null
          prospect_agree?: boolean | null
          prospect_company_text?: string | null
          prospect_paid?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          self_sign_up_invitation_code?: string | null
          slug?: string | null
          user_type?: string | null
        }
        Update: {
          _deprecated_can_add_associations?: boolean | null
          _deprecated_can_add_companies?: boolean | null
          _deprecated_can_add_new_questions?: boolean | null
          _deprecated_can_add_new_sheet?: boolean | null
          _deprecated_can_add_new_stack?: boolean | null
          _deprecated_can_add_new_user?: boolean | null
          _deprecated_can_change_answers?: boolean | null
          _deprecated_can_change_sheet_status?: boolean | null
          _deprecated_can_change_status?: boolean | null
          _deprecated_can_run_reports?: boolean | null
          _deprecated_can_see_all_sheets?: boolean | null
          a_lnk?: string | null
          bubble_id?: string | null
          comments?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          email_changes_dates?: string[] | null
          email_count?: number | null
          emails_changes?: string[] | null
          first_name?: string | null
          full_name?: string | null
          has_logged_in?: boolean
          id?: string
          invitation_sent?: boolean | null
          is_company_main_contact?: boolean | null
          is_company_point_person?: boolean | null
          is_in_payed_or_established_plan?: boolean | null
          is_prospect?: boolean | null
          is_sup_cert_manager?: boolean | null
          is_sup_cert_tmplt_creator?: boolean | null
          is_sup_get_email_notifications?: boolean | null
          is_sup_reviewer?: boolean | null
          is_sup_view_question_menu?: boolean | null
          is_super_admin?: boolean | null
          is_supplier_pointguard?: boolean | null
          job_title?: string | null
          language?: string | null
          last_name?: string | null
          modified_at?: string | null
          one_time_message?: string | null
          password_changed?: boolean | null
          phone_number?: number | null
          phone_text?: string | null
          plan_first_started?: string | null
          profile_done?: boolean | null
          profile_pic_url?: string | null
          prospect_agree?: boolean | null
          prospect_company_text?: string | null
          prospect_paid?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          self_sign_up_invitation_code?: string | null
          slug?: string | null
          user_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      approved_requests: {
        Row: {
          bubble_id: string | null
          comment_requestor: string | null
          comment_supplier: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          creator_email: string | null
          days_to_first_share: number | null
          days_to_first_share_2: number | null
          days_to_last_share: number | null
          days_to_last_share_2: number | null
          first_shared_date: string | null
          first_shared_date_2: string | null
          id: string | null
          last_share_date: string | null
          last_share_date_2: string | null
          manufacturer_marked_as_provided: boolean | null
          modified_at: string | null
          notes: string | null
          owner_company_id: string | null
          owner_company_name: string | null
          processed: boolean | null
          product_name: string | null
          reader_company_id: string | null
          reader_company_name: string | null
          requesting_from_id: string | null
          requestor_id: string | null
          sheet_id: string | null
          sheet_name: string | null
          show_as_removed: boolean | null
          slug: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_owner_company_id_fkey"
            columns: ["owner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_reader_company_id_fkey"
            columns: ["reader_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_requesting_from_id_fkey"
            columns: ["requesting_from_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_requestor_id_fkey"
            columns: ["requestor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_requests: {
        Row: {
          bubble_id: string | null
          comment_requestor: string | null
          comment_supplier: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          creator_email: string | null
          days_to_first_share: number | null
          days_to_first_share_2: number | null
          days_to_last_share: number | null
          days_to_last_share_2: number | null
          first_shared_date: string | null
          first_shared_date_2: string | null
          id: string | null
          last_share_date: string | null
          last_share_date_2: string | null
          manufacturer_marked_as_provided: boolean | null
          modified_at: string | null
          notes: string | null
          owner_company_id: string | null
          owner_company_name: string | null
          processed: boolean | null
          product_name: string | null
          reader_company_id: string | null
          reader_company_name: string | null
          requesting_from_id: string | null
          requestor_id: string | null
          sheet_id: string | null
          sheet_name: string | null
          show_as_removed: boolean | null
          slug: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_owner_company_id_fkey"
            columns: ["owner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_reader_company_id_fkey"
            columns: ["reader_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_requesting_from_id_fkey"
            columns: ["requesting_from_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_requestor_id_fkey"
            columns: ["requestor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_answers_display: {
        Row: {
          additional_notes: string | null
          boolean_value: boolean | null
          choice_content: string | null
          choice_id: string | null
          created_at: string | null
          date_value: string | null
          id: string | null
          list_table_column_choice_options: Json | null
          list_table_column_id: string | null
          list_table_column_name: string | null
          list_table_column_order: number | null
          list_table_column_response_type: string | null
          list_table_row_id: string | null
          modified_at: string | null
          number_value: number | null
          question_content: string | null
          question_id: string | null
          question_name: string | null
          question_order: number | null
          response_type: string | null
          section_sort_number: number | null
          sheet_id: string | null
          subsection_sort_number: number | null
          text_value: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_super_admin: { Args: never; Returns: boolean }
      user_company_id: { Args: never; Returns: string }
    }
    Enums: {
      user_role: "admin" | "editor" | "viewer" | "reviewer"
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
      user_role: ["admin", "editor", "viewer", "reviewer"],
    },
  },
} as const
