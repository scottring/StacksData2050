CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID REFERENCES public.sheets(id) ON DELETE CASCADE,
    requestor_id UUID REFERENCES public.companies(id),
    requesting_from_id UUID REFERENCES public.companies(id),
    processed BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    modified_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requests_sheet_id ON public.requests(sheet_id);
CREATE INDEX IF NOT EXISTS idx_requests_requestor_id ON public.requests(requestor_id);
CREATE INDEX IF NOT EXISTS idx_requests_requesting_from_id ON public.requests(requesting_from_id);
