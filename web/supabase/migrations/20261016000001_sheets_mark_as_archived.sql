-- Let customers archive sheets they no longer need (e.g. a duplicate Excel
-- import). Archived sheets stay in the database and can be restored; they are
-- only hidden from the Supplier Products list. The column name matches the
-- existing app types (database.types.ts) and lib/compliance-stats.ts.
ALTER TABLE public.sheets
  ADD COLUMN IF NOT EXISTS mark_as_archived boolean NOT NULL DEFAULT false;
