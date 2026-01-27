-- Migration: Add Request Tracking System
-- Purpose: Track product data sheet requests between companies (customer → supplier workflow)
-- Date: 2026-01-15

-- Requests table for tracking sheet requests between companies
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE,
  owner_company_id UUID REFERENCES companies(id) NOT NULL,  -- Company requesting data (customer)
  reader_company_id UUID REFERENCES companies(id) NOT NULL, -- Company providing data (supplier)
  status TEXT CHECK (status IN ('created', 'reviewed', 'responded', 'approved', 'flagged')) DEFAULT 'created',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Request-Tag junction (which tags/questions to include in request)
CREATE TABLE request_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(request_id, tag_id)
);

-- Indexes for performance
CREATE INDEX idx_requests_owner_company ON requests(owner_company_id);
CREATE INDEX idx_requests_reader_company ON requests(reader_company_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_sheet ON requests(sheet_id);
CREATE INDEX idx_request_tags_request ON request_tags(request_id);
CREATE INDEX idx_request_tags_tag ON request_tags(tag_id);

-- RLS Policies
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_tags ENABLE ROW LEVEL SECURITY;

-- Users can see requests where they are either owner or reader company
CREATE POLICY "Users can view their company requests"
  ON requests FOR SELECT
  USING (
    owner_company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR reader_company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users can create requests for their own company
CREATE POLICY "Users can create requests"
  ON requests FOR INSERT
  WITH CHECK (owner_company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Users can update requests they're involved in
CREATE POLICY "Users can update their requests"
  ON requests FOR UPDATE
  USING (
    owner_company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR reader_company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Request tags RLS: Can view/modify tags for requests they can access
CREATE POLICY "Users can view request tags for accessible requests"
  ON request_tags FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM requests
      WHERE owner_company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
      OR reader_company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage request tags"
  ON request_tags FOR ALL
  USING (
    request_id IN (
      SELECT id FROM requests
      WHERE owner_company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE requests IS 'Tracks product data sheet requests between companies (customer requesting from supplier)';
COMMENT ON COLUMN requests.owner_company_id IS 'Company requesting the data (customer)';
COMMENT ON COLUMN requests.reader_company_id IS 'Company providing the data (supplier)';
COMMENT ON COLUMN requests.status IS 'Workflow status: created → reviewed → responded → approved/flagged';
COMMENT ON TABLE request_tags IS 'Links requests to specific question tags to include in the questionnaire';
