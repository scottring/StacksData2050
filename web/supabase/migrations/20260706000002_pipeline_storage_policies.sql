-- DEV-GRADE POLICIES. The table policies here and in
-- src/lib/pipeline/migration.sql use bare auth.uid() IS NOT NULL checks.
-- Before any production application, tighten every policy to company
-- scoping. See cutover checklist in
-- docs/plans/2026-07-06-station-real-data-plan.md.

-- Pipeline storage RLS policies
-- Fixes: "new row violates row-level security policy" on upload at
-- /station/request/[id] (src/app/api/extraction/upload/route.ts).
--
-- Root cause: the extraction-documents and generated-documents buckets
-- were created via the storage API with no RLS policies on
-- storage.objects. Table-level RLS on extraction_documents /
-- extraction_items (see web/src/lib/pipeline/migration.sql) is fine
-- (auth.uid() IS NOT NULL is satisfied for the real supplier session).
-- The gap is entirely at the storage layer.
--
-- Path conventions in code:
--   extraction-documents: `${user.id}/${timestamp}_${filename}`
--     (src/app/api/extraction/upload/route.ts, downloaded again in
--     src/lib/extraction/process.ts and removed in
--     src/app/api/extraction/[id]/route.ts, all via the user session
--     client)
--   generated-documents: `${company_id}/${assessmentId}/${filename}`
--     (src/lib/documents/generate.ts -- also writes with the user
--     session client, not service role; read back via signed URL in
--     src/app/api/documents/[id]/download/route.ts, also user client)

-- ============================================================
-- Missing TABLE policy: web/src/lib/pipeline/migration.sql defines
-- SELECT/INSERT/UPDATE policies on extraction_documents and
-- extraction_items but no DELETE policy. The real DELETE route
-- (src/app/api/extraction/[id]/route.ts) deletes both with the user
-- session client; without a DELETE policy those deletes silently
-- affect 0 rows (no RLS error, just no-op), confirmed via a
-- simulated-user script. Matches the existing simplified
-- auth.uid() IS NOT NULL style used for the other policies on these
-- two tables.
-- ============================================================
DROP POLICY IF EXISTS "Users can delete extraction documents" ON extraction_documents;
CREATE POLICY "Users can delete extraction documents"
  ON extraction_documents FOR DELETE
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete extraction items" ON extraction_items;
CREATE POLICY "Users can delete extraction items"
  ON extraction_items FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- extraction-documents: folder-per-user (storage path segment 1 = auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Users can upload their own extraction documents" ON storage.objects;
CREATE POLICY "Users can upload their own extraction documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'extraction-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view their own extraction documents" ON storage.objects;
CREATE POLICY "Users can view their own extraction documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'extraction-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own extraction documents" ON storage.objects;
CREATE POLICY "Users can delete their own extraction documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'extraction-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- generated-documents: folder-per-company (storage path segment 1 = company_id)
-- ============================================================
DROP POLICY IF EXISTS "Users can upload generated documents for their company" ON storage.objects;
CREATE POLICY "Users can upload generated documents for their company"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'generated-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view generated documents for their company" ON storage.objects;
CREATE POLICY "Users can view generated documents for their company"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'generated-documents'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );
