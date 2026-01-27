-- Requests Tracking System
-- Enables tracking of sheet requests between customers and suppliers

-- ============================================================================
-- REQUESTS TABLE
-- ============================================================================
-- Tracks data sheet requests from manufacturers (customers) to suppliers
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sheet being requested
  sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE,

  -- Companies involved
  owner_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE, -- Company that created the request (customer/manufacturer)
  reader_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE, -- Company receiving the request (supplier)

  -- Request status lifecycle
  -- Created → Reviewed → Responded → Approved/Flagged/Answered
  status TEXT NOT NULL CHECK (status IN ('Created', 'Reviewed', 'Responded', 'Approved', 'Flagged', 'Answered')) DEFAULT 'Created',

  -- Optional notes from requester
  notes TEXT,

  -- Audit fields
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure we don't create duplicate requests
  CONSTRAINT unique_request_per_sheet_company UNIQUE(sheet_id, reader_company_id)
);

-- ============================================================================
-- REQUEST TAGS JUNCTION TABLE
-- ============================================================================
-- Links requests to specific tag sets (e.g., HQ 2.0.1 vs HQ2.1)
CREATE TABLE IF NOT EXISTS request_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(request_id, tag_id)
);

-- ============================================================================
-- INVITES TABLE
-- ============================================================================
-- For inviting new suppliers who don't yet have accounts
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Associated request (optional - can create invite without request)
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,

  -- Invite details
  email TEXT NOT NULL,
  company_name TEXT,

  -- Tracking
  sent_at TIMESTAMP,
  accepted_at TIMESTAMP,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Prevent duplicate invites
  CONSTRAINT unique_invite_per_email_request UNIQUE(email, request_id)
);

-- ============================================================================
-- USER ROLES TABLE
-- ============================================================================
-- Role-based access control system
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and company relationship
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Role type: company_admin, manager, contributor, viewer
  role TEXT NOT NULL CHECK (role IN ('company_admin', 'manager', 'contributor', 'viewer')),

  -- Granular permissions array
  -- Permissions: create_requests, approve_requests, view_all_requests,
  --              respond_to_requests, manage_users, view_analytics, etc.
  permissions TEXT[] DEFAULT '{}',

  -- Assignment tracking
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),

  -- Active status
  is_active BOOLEAN DEFAULT true,

  -- Ensure one role per user per company
  UNIQUE(user_id, company_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Request queries
CREATE INDEX IF NOT EXISTS idx_requests_owner_company ON requests(owner_company_id);
CREATE INDEX IF NOT EXISTS idx_requests_reader_company ON requests(reader_company_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_sheet ON requests(sheet_id);
CREATE INDEX IF NOT EXISTS idx_requests_updated_at ON requests(updated_at DESC);

-- Request tags
CREATE INDEX IF NOT EXISTS idx_request_tags_request ON request_tags(request_id);
CREATE INDEX IF NOT EXISTS idx_request_tags_tag ON request_tags(tag_id);

-- Invites
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_request ON invites(request_id);
CREATE INDEX IF NOT EXISTS idx_invites_accepted ON invites(accepted_at) WHERE accepted_at IS NOT NULL;

-- User roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_company ON user_roles(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_active ON user_roles(company_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role) WHERE is_active = true;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Requests: Users can see requests where their company is owner or reader
CREATE POLICY requests_select_policy ON requests
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE company_id = requests.owner_company_id
         OR company_id = requests.reader_company_id
    )
  );

-- Requests: Service role has full access
CREATE POLICY requests_service_policy ON requests
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Request tags: Users can see tags for requests they can see
CREATE POLICY request_tags_select_policy ON request_tags
  FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM requests
      WHERE auth.uid() IN (
        SELECT id FROM users
        WHERE company_id = requests.owner_company_id
           OR company_id = requests.reader_company_id
      )
    )
  );

-- Request tags: Service role has full access
CREATE POLICY request_tags_service_policy ON request_tags
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Invites: Users can see invites for their company's requests
CREATE POLICY invites_select_policy ON invites
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT u.id FROM users u
      JOIN requests r ON r.owner_company_id = u.company_id
      WHERE r.id = invites.request_id
    )
  );

-- Invites: Service role has full access
CREATE POLICY invites_service_policy ON invites
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- User roles: Users can see roles for their company
CREATE POLICY user_roles_select_policy ON user_roles
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE company_id = user_roles.company_id
    )
  );

-- User roles: Service role has full access
CREATE POLICY user_roles_service_policy ON user_roles
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for requests table
DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Pending requests (Created or Reviewed status)
CREATE OR REPLACE VIEW pending_requests AS
SELECT
  r.*,
  oc.name as owner_company_name,
  rc.name as reader_company_name,
  s.name as sheet_name,
  u.full_name as created_by_name
FROM requests r
JOIN companies oc ON r.owner_company_id = oc.id
JOIN companies rc ON r.reader_company_id = rc.id
LEFT JOIN sheets s ON r.sheet_id = s.id
LEFT JOIN users u ON r.created_by = u.id
WHERE r.status IN ('Created', 'Reviewed')
ORDER BY r.created_at DESC;

-- View: Approved requests
CREATE OR REPLACE VIEW approved_requests AS
SELECT
  r.*,
  oc.name as owner_company_name,
  rc.name as reader_company_name,
  s.name as sheet_name,
  u.full_name as created_by_name
FROM requests r
JOIN companies oc ON r.owner_company_id = oc.id
JOIN companies rc ON r.reader_company_id = rc.id
LEFT JOIN sheets s ON r.sheet_id = s.id
LEFT JOIN users u ON r.created_by = u.id
WHERE r.status = 'Approved'
ORDER BY r.updated_at DESC;

-- View: Company request statistics
CREATE OR REPLACE VIEW company_request_stats AS
SELECT
  c.id as company_id,
  c.name as company_name,

  -- As customer (owner) - outgoing requests
  COUNT(DISTINCT CASE WHEN r_out.status IN ('Created', 'Reviewed') THEN r_out.id END) as pending_outgoing_requests,
  COUNT(DISTINCT CASE WHEN r_out.status = 'Approved' THEN r_out.id END) as approved_outgoing_requests,
  COUNT(DISTINCT r_out.id) as total_outgoing_requests,

  -- As supplier (reader) - incoming requests
  COUNT(DISTINCT CASE WHEN r_in.status IN ('Created', 'Reviewed') THEN r_in.id END) as pending_incoming_requests,
  COUNT(DISTINCT CASE WHEN r_in.status = 'Approved' THEN r_in.id END) as approved_incoming_requests,
  COUNT(DISTINCT r_in.id) as total_incoming_requests

FROM companies c
LEFT JOIN requests r_out ON c.id = r_out.owner_company_id
LEFT JOIN requests r_in ON c.id = r_in.reader_company_id
GROUP BY c.id, c.name;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE requests IS 'Tracks sheet data requests from manufacturers to suppliers';
COMMENT ON TABLE request_tags IS 'Links requests to specific tag sets (e.g., HQ 2.0.1)';
COMMENT ON TABLE invites IS 'Invitations sent to suppliers who do not yet have accounts';
COMMENT ON TABLE user_roles IS 'Role-based access control for users within companies';

COMMENT ON COLUMN requests.owner_company_id IS 'Company that created the request (typically manufacturer/customer)';
COMMENT ON COLUMN requests.reader_company_id IS 'Company receiving the request (typically supplier)';
COMMENT ON COLUMN requests.status IS 'Request lifecycle: Created → Reviewed → Responded → Approved/Flagged';

COMMENT ON VIEW pending_requests IS 'All requests with Created or Reviewed status requiring action';
COMMENT ON VIEW approved_requests IS 'All approved/completed requests';
COMMENT ON VIEW company_request_stats IS 'Request statistics per company (incoming and outgoing)';
