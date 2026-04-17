-- Sprint 2: Lead Management
-- Tables: leads, activities

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  gender text CHECK (gender IN ('M', 'F', 'Other')),
  dob date,
  phone text,
  email text,
  address text,
  ward text,
  district text,
  city text,
  store_id text REFERENCES stores(id),
  lead_type text NOT NULL DEFAULT 'individual' CHECK (lead_type IN ('individual', 'parent', 'school', 'company')),
  lead_source text NOT NULL DEFAULT 'manual' CHECK (lead_source IN ('manual', 'event', 'campaign', 'platform', 'web_app', 'company_school', 'google_maps', 'oms_sync')),
  stage text NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  assigned_to uuid REFERENCES users(id),
  notes text,
  oms_customer_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_lead_type ON leads(lead_type);
CREATE INDEX idx_leads_lead_source ON leads(lead_source);
CREATE INDEX idx_leads_store_id ON leads(store_id);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_deleted_at ON leads(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ACTIVITIES (interaction log for leads/customers/opportunities)
-- ============================================================
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('lead', 'customer', 'opportunity')),
  entity_id uuid NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'sms', 'system')),
  subject text,
  description text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_created_at ON activities(created_at);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Leads: authenticated users can view non-deleted leads
-- Store-level filtering is enforced at the application layer via role_objects.filter_store
CREATE POLICY "leads_select" ON leads
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "leads_insert" ON leads
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "leads_update" ON leads
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL);

-- Activities: authenticated users can view and create
CREATE POLICY "activities_select" ON activities
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "activities_insert" ON activities
  FOR INSERT TO authenticated
  WITH CHECK (true);
