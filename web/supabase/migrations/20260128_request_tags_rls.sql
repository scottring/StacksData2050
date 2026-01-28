-- Enable RLS on request_tags if not already
ALTER TABLE public.request_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert request_tags for requests they created
CREATE POLICY "Users can insert request_tags for their requests"
ON public.request_tags
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = request_id
    AND r.created_by = auth.uid()
  )
);

-- Policy: Users can view request_tags for requests in their company
CREATE POLICY "Users can view request_tags"
ON public.request_tags
FOR SELECT
TO authenticated
USING (true);

-- Policy: Users can delete their own request_tags
CREATE POLICY "Users can delete request_tags for their requests"
ON public.request_tags
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = request_id
    AND r.created_by = auth.uid()
  )
);
