# PREFLIGHT.md

Generated 2026-07-07T02:09:52.843Z by `scripts/cutover/00-preflight.ts` against prod (read-only).

**Summary: 22 PASS, 7 FAIL, 2 INFO**

All checks reflect the PRE-cutover expected state. FAIL here before
cutover execution means the prod database does not match what the
runbook assumes -- stop and investigate before applying 01-schema.sql.
Known exception: the core-table drift FAILs are real, investigated,
and addressed by 05-core-schema-reconciliation.sql for every column
the code actually uses (see README.md); the drift rows will still
FAIL after 05 runs because the parity diff also counts legacy
columns no code reads.

| Verdict | Check | Detail |
|---|---|---|
| PASS | pipeline table present: extraction_documents | 22 rows |
| PASS | pipeline table present: extraction_items | 196 rows |
| PASS | pipeline table present: regulatory_frameworks | 6 rows |
| PASS | pipeline table present: regulatory_rules | 0 rows |
| PASS | pipeline table present: compliance_assessments | 3 rows |
| PASS | pipeline table present: compliance_results | 30 rows |
| PASS | pipeline table present: generated_documents | 0 rows |
| PASS | workflow table absent: plants | relation does not exist |
| PASS | workflow table absent: plant_role_assignments | relation does not exist |
| PASS | workflow table absent: product_introduction_workflows | relation does not exist |
| PASS | workflow table absent: workflow_steps | relation does not exist |
| PASS | workflow table absent: workflow_conditions | relation does not exist |
| PASS | notifications.type absent | column does not exist |
| PASS | notifications.title absent | column does not exist |
| PASS | notifications.message absent | column does not exist |
| PASS | notifications.link absent | column does not exist |
| PASS | notifications.read absent | column does not exist |
| PASS | canonical table present with rows: canonical_answer_types | 18 rows |
| PASS | canonical table present with rows: canonical_reference_substances | 337 rows |
| PASS | bucket present: extraction-documents | bucket exists |
| PASS | bucket present: generated-documents | bucket exists |
| INFO | notifications row count | 0 rows |
| PASS | Sappi company id matches known value | found 9567b9ac-1c12-457f-8e49-321519c267b3 (Sappi), expected 9567b9ac-1c12-457f-8e49-321519c267b3 |
| FAIL | core table drift: requests | dev-only [bubble_id, product_name, owner_company_id, reader_company_id, manufacturer_marked_as_provided, show_as_removed, comment_requestor, comment_supplier, creator_email, status, notes, first_shared_date, last_share_date, days_to_first_share, days_to_last_share, first_shared_date_2, last_share_date_2, days_to_first_share_2, days_to_last_share_2, slug, updated_at] prod-only [] |
| FAIL | core table drift: sheets | dev-only [name_lower_case, assigned_to_company_id, original_requestor_assoc_id, requestor_name, requestor_email, contact_profile_id, stack_id, new_status, new_name, unread_comment, mark_as_archived, mark_as_test_sheet, test_being_deleted, version_lock, version_description, version_close_date, version_closed_by, version_count_expected, version_count_original, version_count_processed, prev_sheet_id, imported_file_url, imported_processed, imported_to_process, current_number_of_col_row, supplier_assignment_log, slug] prod-only [import_source] |
| FAIL | core table drift: answers | dev-only [bubble_id, answer_name, answer_id_number, order_number, supplier_id, customer_id, originating_question_id, parent_question_id, stack_id, parent_subsection_id, text_area_value, file_url, support_file_url, support_text, clarification, custom_comment_text, custom_row_text, import_double_check, version_in_sheet, version_copied, slug] prod-only [] |
| FAIL | core table drift: users | dev-only [first_name, last_name, phone_text, phone_number, profile_pic_url, user_type, language, is_company_point_person, is_supplier_pointguard, is_sup_get_email_notifications, is_sup_cert_manager, is_sup_cert_tmplt_creator, is_sup_reviewer, is_sup_view_question_menu, invitation_sent, password_changed, profile_done, is_prospect, is_in_payed_or_established_plan, prospect_agree, prospect_paid, prospect_company_text, plan_first_started, self_sign_up_invitation_code, one_time_message, comments, a_lnk, email_count, emails_changes, email_changes_dates, slug, _deprecated_can_add_associations, _deprecated_can_add_companies, _deprecated_can_add_new_questions, _deprecated_can_add_new_sheet, _deprecated_can_add_new_stack, _deprecated_can_add_new_user, _deprecated_can_change_answers, _deprecated_can_change_sheet_status, _deprecated_can_change_status, _deprecated_can_run_reports, _deprecated_can_see_all_sheets] prod-only [] |
| FAIL | core table drift: companies | dev-only [name_lower_case, email_suffix, location_text, active, show_as_supplier, hide_hq_import, is_zapier, patch_status_applied, plan_started_at, subscription_anniversary_date, subscription_trial_ends, subscription_cancel_at_trial, subscription_canceled, subscription_expired, subscription_sheets_allowed, premium_features_requested, list_emails_prefix, slug] prod-only [location] |
| FAIL | core table drift: choices | dev-only [import_map, parent_question_id, created_by, modified_at] prod-only [] |
| FAIL | core table drift: questions | dev-only [question_description, clarification, clarification_yes_no, static_text, a_q_help, question_type, question_id_number, optional_question, lock, highlight, support_file_requested, support_file_reason, section_name_sort, subsection_name_sort, company_id, parent_section_id, parent_subsection_id, parent_choice_id, list_table_id, created_by, slug, modified_at] prod-only [description] |
| INFO | core table drift summary | 7 of 7 core tables show drift |
