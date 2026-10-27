-- Named-user concentration visibility (UPM ask, 26 Oct 2026).
-- The supplier may restrict concentration values on a sheet to ONE named
-- person at the requesting company. NULL = everyone at the customer sees
-- them. The supplier's own users and super admins always see them.
--
-- concentration_viewer_id holds a users.id but has no foreign key, like
-- requests.withdrawn_by: a second sheets -> users FK would make PostgREST
-- embeds of users from sheets ambiguous.
--
-- Set only by PUT /api/sheets/[id]/concentration-viewer (service role after
-- checking the caller belongs to the supplier company, sheets.company_id).
ALTER TABLE public.sheets ADD COLUMN IF NOT EXISTS concentration_viewer_id uuid;
COMMENT ON COLUMN public.sheets.concentration_viewer_id IS 'users.id at the requesting company who alone may see concentration values; NULL = unrestricted';

-- True when the CURRENT user must not see concentration values on this sheet.
CREATE OR REPLACE FUNCTION public.concentration_restricted(target_sheet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select coalesce(
    (
      select s.concentration_viewer_id is not null
         and s.concentration_viewer_id <> auth.uid()
         and s.requesting_company_id = user_company_id()
         and s.company_id is distinct from user_company_id()
         and coalesce(is_super_admin(), false) = false
      from sheets s
      where s.id = target_sheet_id
    ),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.concentration_restricted(uuid) TO authenticated;

-- Rebuild the display view with masking. Identical to the previous
-- definition except: list-table cells whose column name contains "conc"
-- have their values nulled when concentration_restricted(sheet_id) is true,
-- and a new trailing column concentration_restricted says so.
CREATE OR REPLACE VIEW public.sheet_answers_display AS
WITH ranked_single_answers AS (
  SELECT a.id, a.sheet_id, a.question_id, a.text_value, a.number_value, a.boolean_value,
         a.date_value, a.choice_id, a.additional_notes, a.list_table_row_id, a.list_table_column_id,
         a.created_at, a.modified_at,
         q.name AS question_name, q.content AS question_content, q.response_type,
         q.section_sort_number, q.subsection_sort_number, q.order_number AS question_order,
         c.content AS choice_content,
         NULL::text AS list_table_column_name,
         NULL::integer AS list_table_column_order,
         NULL::text AS list_table_column_response_type,
         NULL::jsonb AS list_table_column_choice_options,
         false AS concentration_restricted,
         row_number() OVER (PARTITION BY a.sheet_id, a.question_id ORDER BY a.modified_at DESC NULLS LAST) AS rn
  FROM answers a
  JOIN questions q ON a.question_id = q.id
  LEFT JOIN choices c ON a.choice_id = c.id
  WHERE a.list_table_row_id IS NULL
), ranked_list_table_answers AS (
  SELECT a.id, a.sheet_id, a.question_id,
         CASE WHEN m.masked THEN NULL ELSE a.text_value END AS text_value,
         CASE WHEN m.masked THEN NULL ELSE a.number_value END AS number_value,
         CASE WHEN m.masked THEN NULL ELSE a.boolean_value END AS boolean_value,
         CASE WHEN m.masked THEN NULL ELSE a.date_value END AS date_value,
         CASE WHEN m.masked THEN NULL ELSE a.choice_id END AS choice_id,
         a.additional_notes, a.list_table_row_id, a.list_table_column_id,
         a.created_at, a.modified_at,
         q.name AS question_name, q.content AS question_content, q.response_type,
         q.section_sort_number, q.subsection_sort_number, q.order_number AS question_order,
         CASE WHEN m.masked THEN NULL ELSE c.content END AS choice_content,
         ltc.name AS list_table_column_name,
         ltc.order_number AS list_table_column_order,
         ltc.response_type AS list_table_column_response_type,
         ltc.choice_options AS list_table_column_choice_options,
         m.masked AS concentration_restricted,
         row_number() OVER (PARTITION BY a.sheet_id, a.question_id, a.list_table_row_id, a.list_table_column_id ORDER BY a.modified_at DESC NULLS LAST) AS rn
  FROM answers a
  JOIN questions q ON a.question_id = q.id
  LEFT JOIN choices c ON a.choice_id = c.id
  LEFT JOIN list_table_columns ltc ON a.list_table_column_id = ltc.id
  CROSS JOIN LATERAL (
    SELECT (ltc.name ILIKE '%conc%' AND public.concentration_restricted(a.sheet_id)) AS masked
  ) m
  WHERE a.list_table_row_id IS NOT NULL
)
SELECT id, sheet_id, question_id, text_value, number_value, boolean_value, date_value, choice_id,
       additional_notes, list_table_row_id, list_table_column_id, created_at, modified_at,
       question_name, question_content, response_type, section_sort_number, subsection_sort_number,
       question_order, choice_content, list_table_column_name, list_table_column_order,
       list_table_column_response_type, list_table_column_choice_options, concentration_restricted
FROM ranked_single_answers WHERE rn = 1
UNION ALL
SELECT id, sheet_id, question_id, text_value, number_value, boolean_value, date_value, choice_id,
       additional_notes, list_table_row_id, list_table_column_id, created_at, modified_at,
       question_name, question_content, response_type, section_sort_number, subsection_sort_number,
       question_order, choice_content, list_table_column_name, list_table_column_order,
       list_table_column_response_type, list_table_column_choice_options, concentration_restricted
FROM ranked_list_table_answers WHERE rn = 1;
