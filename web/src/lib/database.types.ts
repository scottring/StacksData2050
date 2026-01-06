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
      _migration_id_map: {
        Row: {
          bubble_id: string
          entity_type: string
          migrated_at: string | null
          supabase_id: string
        }
        Insert: {
          bubble_id: string
          entity_type: string
          migrated_at?: string | null
          supabase_id: string
        }
        Update: {
          bubble_id?: string
          entity_type?: string
          migrated_at?: string | null
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
            foreignKeyName: "fk_answer_documents_answer"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
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
          answer_id: string | null
          id: string
          order_number: number | null
          text_choice: string | null
        }
        Insert: {
          answer_id?: string | null
          id?: string
          order_number?: number | null
          text_choice?: string | null
        }
        Update: {
          answer_id?: string | null
          id?: string
          order_number?: number | null
          text_choice?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_answer_text_choices_answer"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
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
          custom_list_row_id: string | null
          custom_row_text: string | null
          customer_id: string | null
          date_value: string | null
          enter_value_id: string | null
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
          custom_list_row_id?: string | null
          custom_row_text?: string | null
          customer_id?: string | null
          date_value?: string | null
          enter_value_id?: string | null
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
          custom_list_row_id?: string | null
          custom_row_text?: string | null
          customer_id?: string | null
          date_value?: string | null
          enter_value_id?: string | null
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
            foreignKeyName: "answers_list_table_row_id_fkey"
            columns: ["list_table_row_id"]
            isOneToOne: false
            referencedRelation: "list_table_rows"
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
          {
            foreignKeyName: "fk_answers_enter_value"
            columns: ["enter_value_id"]
            isOneToOne: false
            referencedRelation: "answers"
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
        ]
      }
      comments: {
        Row: {
          bubble_id: string | null
          comment_type: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          modified_at: string | null
          parent_entity_id: string | null
          parent_entity_type: string | null
        }
        Insert: {
          bubble_id?: string | null
          comment_type?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          modified_at?: string | null
          parent_entity_id?: string | null
          parent_entity_type?: string | null
        }
        Update: {
          bubble_id?: string | null
          comment_type?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          modified_at?: string | null
          parent_entity_id?: string | null
          parent_entity_type?: string | null
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
          admin_id: string | null
          bubble_id: string | null
          created_at: string | null
          created_by: string | null
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
          plan_id: string | null
          plan_started_at: string | null
          premium_features_requested: string[] | null
          show_as_supplier: boolean | null
          slug: string | null
          stack_id: string | null
          subscription_anniversary_date: string | null
          subscription_cancel_at_trial: boolean | null
          subscription_canceled: boolean | null
          subscription_expired: boolean | null
          subscription_sheets_allowed: number | null
          subscription_trial_ends: string | null
          supplier_assignment_log: string[] | null
        }
        Insert: {
          active?: boolean | null
          admin_id?: string | null
          bubble_id?: string | null
          created_at?: string | null
          created_by?: string | null
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
          plan_id?: string | null
          plan_started_at?: string | null
          premium_features_requested?: string[] | null
          show_as_supplier?: boolean | null
          slug?: string | null
          stack_id?: string | null
          subscription_anniversary_date?: string | null
          subscription_cancel_at_trial?: boolean | null
          subscription_canceled?: boolean | null
          subscription_expired?: boolean | null
          subscription_sheets_allowed?: number | null
          subscription_trial_ends?: string | null
          supplier_assignment_log?: string[] | null
        }
        Update: {
          active?: boolean | null
          admin_id?: string | null
          bubble_id?: string | null
          created_at?: string | null
          created_by?: string | null
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
          plan_id?: string | null
          plan_started_at?: string | null
          premium_features_requested?: string[] | null
          show_as_supplier?: boolean | null
          slug?: string | null
          stack_id?: string | null
          subscription_anniversary_date?: string | null
          subscription_cancel_at_trial?: boolean | null
          subscription_canceled?: boolean | null
          subscription_expired?: boolean | null
          subscription_sheets_allowed?: number | null
          subscription_trial_ends?: string | null
          supplier_assignment_log?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_stack_id_fkey"
            columns: ["stack_id"]
            isOneToOne: false
            referencedRelation: "stacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_companies_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_demo_interactions: {
        Row: {
          company_id: string
          demo_company_id: string
        }
        Insert: {
          company_id: string
          demo_company_id: string
        }
        Update: {
          company_id?: string
          demo_company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_demo_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_demo_interactions_demo_company_id_fkey"
            columns: ["demo_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      list_table_columns: {
        Row: {
          bubble_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          modified_at: string | null
          name: string
          order_number: number | null
          parent_table_id: string | null
          response_type: string | null
        }
        Insert: {
          bubble_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          modified_at?: string | null
          name: string
          order_number?: number | null
          parent_table_id?: string | null
          response_type?: string | null
        }
        Update: {
          bubble_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          modified_at?: string | null
          name?: string
          order_number?: number | null
          parent_table_id?: string | null
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
      notifications: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
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
            foreignKeyName: "fk_question_companies_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_question_companies_question"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_tags: {
        Row: {
          question_id: string
          tag_id: string
        }
        Insert: {
          question_id: string
          tag_id: string
        }
        Update: {
          question_id?: string
          tag_id?: string
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
          association_id: string | null
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
          questioneiar_id: string | null
          required: boolean | null
          section_name_sort: string | null
          section_sort_number: number | null
          slug: string | null
          stack_id: string | null
          static_text: string | null
          subsection_name_sort: string | null
          subsection_sort_number: number | null
          support_file_reason: string | null
          support_file_requested: boolean | null
          the_association_id: string | null
        }
        Insert: {
          a_q_help?: string | null
          association_id?: string | null
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
          questioneiar_id?: string | null
          required?: boolean | null
          section_name_sort?: string | null
          section_sort_number?: number | null
          slug?: string | null
          stack_id?: string | null
          static_text?: string | null
          subsection_name_sort?: string | null
          subsection_sort_number?: number | null
          support_file_reason?: string | null
          support_file_requested?: boolean | null
          the_association_id?: string | null
        }
        Update: {
          a_q_help?: string | null
          association_id?: string | null
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
          questioneiar_id?: string | null
          required?: boolean | null
          section_name_sort?: string | null
          section_sort_number?: number | null
          slug?: string | null
          stack_id?: string | null
          static_text?: string | null
          subsection_name_sort?: string | null
          subsection_sort_number?: number | null
          support_file_reason?: string | null
          support_file_requested?: boolean | null
          the_association_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
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
            foreignKeyName: "questions_parent_choice_id_fkey"
            columns: ["parent_choice_id"]
            isOneToOne: false
            referencedRelation: "choices"
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
            foreignKeyName: "questions_stack_id_fkey"
            columns: ["stack_id"]
            isOneToOne: false
            referencedRelation: "stacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_the_association_id_fkey"
            columns: ["the_association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      request_tags: {
        Row: {
          request_id: string
          tag_id: string
        }
        Insert: {
          request_id: string
          tag_id: string
        }
        Update: {
          request_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_request_tags_request"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_request_tags_tag"
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
          processed: boolean | null
          product_name: string | null
          requesting_from_id: string | null
          requestor_id: string | null
          sheet_id: string | null
          show_as_removed: boolean | null
          slug: string | null
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
          processed?: boolean | null
          product_name?: string | null
          requesting_from_id?: string | null
          requestor_id?: string | null
          sheet_id?: string | null
          show_as_removed?: boolean | null
          slug?: string | null
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
          processed?: boolean | null
          product_name?: string | null
          requesting_from_id?: string | null
          requestor_id?: string | null
          sheet_id?: string | null
          show_as_removed?: boolean | null
          slug?: string | null
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
          questionnaire_id: string | null
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
          questionnaire_id?: string | null
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
          questionnaire_id?: string | null
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
            foreignKeyName: "fk_sheet_questions_question"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sheet_questions_sheet"
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
            foreignKeyName: "fk_sheet_users_sheet"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sheet_users_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_tags: {
        Row: {
          sheet_id: string
          tag_id: string
        }
        Insert: {
          sheet_id: string
          tag_id: string
        }
        Update: {
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
          requestor_email: string | null
          requestor_name: string | null
          slug: string | null
          stack_id: string | null
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
          requestor_email?: string | null
          requestor_name?: string | null
          slug?: string | null
          stack_id?: string | null
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
          requestor_email?: string | null
          requestor_name?: string | null
          slug?: string | null
          stack_id?: string | null
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
            foreignKeyName: "fk_sheets_father_sheet"
            columns: ["father_sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sheets_prev_sheet"
            columns: ["prev_sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "sheets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
      users: {
        Row: {
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
          is_supplier_pointguard: boolean | null
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
          prospect_plan_id: string | null
          role: string | null
          self_sign_up_invitation_code: string | null
          slug: string | null
          stack_id: string | null
          user_type: string | null
        }
        Insert: {
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
          is_supplier_pointguard?: boolean | null
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
          prospect_plan_id?: string | null
          role?: string | null
          self_sign_up_invitation_code?: string | null
          slug?: string | null
          stack_id?: string | null
          user_type?: string | null
        }
        Update: {
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
          is_supplier_pointguard?: boolean | null
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
          prospect_plan_id?: string | null
          role?: string | null
          self_sign_up_invitation_code?: string | null
          slug?: string | null
          stack_id?: string | null
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
          {
            foreignKeyName: "users_stack_id_fkey"
            columns: ["stack_id"]
            isOneToOne: false
            referencedRelation: "stacks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_company_id: { Args: never; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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

// Convenience type aliases for common tables
export type Answer = Tables<'answers'>
export type Question = Tables<'questions'>
export type Sheet = Tables<'sheets'>
export type Section = Tables<'sections'>
export type Subsection = Tables<'subsections'>
export type Choice = Tables<'choices'>
export type Company = Tables<'companies'>
export type User = Tables<'users'>
export type ListTable = Tables<'list_tables'>
export type ListTableColumn = Tables<'list_table_columns'>
export type ListTableRow = Tables<'list_table_rows'>
export type Tag = Tables<'tags'>
export type Request = Tables<'requests'>
export type SheetStatus = Tables<'sheet_statuses'>
