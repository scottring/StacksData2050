-- Company admins in prod have users.role = 'admin', but the answers policies
-- only listed 'company_admin' (a value no user has), so admins could not save,
-- edit or delete answers. Add 'admin' alongside the existing roles; the
-- company checks are unchanged.

ALTER POLICY answers_insert ON public.answers
  WITH CHECK (
    (is_super_admin() = true) OR (
      (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['company_admin'::text, 'admin'::text, 'editor'::text, 'user'::text])))
      AND (EXISTS (SELECT 1 FROM sheets s WHERE s.id = answers.sheet_id
        AND (s.company_id = user_company_id() OR s.requesting_company_id = user_company_id())))
    )
  );

ALTER POLICY answers_update ON public.answers
  USING (
    (is_super_admin() = true) OR (
      (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['company_admin'::text, 'admin'::text, 'editor'::text, 'user'::text])))
      AND (EXISTS (SELECT 1 FROM sheets s WHERE s.id = answers.sheet_id
        AND (s.company_id = user_company_id() OR s.requesting_company_id = user_company_id())))
    )
  );

ALTER POLICY answers_delete ON public.answers
  USING (
    (is_super_admin() = true) OR (
      (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['company_admin'::text, 'admin'::text])))
      AND (EXISTS (SELECT 1 FROM sheets s WHERE s.id = answers.sheet_id
        AND (s.company_id = user_company_id() OR s.requesting_company_id = user_company_id())))
    )
  );
