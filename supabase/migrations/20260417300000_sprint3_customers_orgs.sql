-- Sprint 3: Customers & Organizations
-- Tables: individual_customers, organizations, customer_org_links

-- ============================================================
-- INDIVIDUAL CUSTOMERS
-- ============================================================
CREATE TABLE individual_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id),
  oms_customer_id uuid,
  full_name text NOT NULL,
  phone text,
  email text,
  contact_type text NOT NULL DEFAULT 'other' CHECK (contact_type IN ('parent', 'employee', 'teacher', 'event_organizer', 'other')),
  gender text CHECK (gender IN ('M', 'F', 'Other')),
  dob date,
  address text,
  ward text,
  district text,
  city text,
  store_id text REFERENCES stores(id),
  total_revenue numeric(15,2) DEFAULT 0,
  order_count integer DEFAULT 0,
  last_order_date timestamptz,
  consent_given boolean NOT NULL DEFAULT false,
  consent_date timestamptz,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX idx_customers_phone_unique ON individual_customers(phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_customers_lead_id ON individual_customers(lead_id);
CREATE INDEX idx_customers_oms_id ON individual_customers(oms_customer_id);
CREATE INDEX idx_customers_contact_type ON individual_customers(contact_type);
CREATE INDEX idx_customers_store_id ON individual_customers(store_id);
CREATE INDEX idx_customers_city ON individual_customers(city);
CREATE INDEX idx_customers_created_at ON individual_customers(created_at);
CREATE INDEX idx_customers_deleted_at ON individual_customers(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON individual_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_vi text NOT NULL,
  name_en text,
  tax_id text,
  organization_type text NOT NULL DEFAULT 'company' CHECK (organization_type IN ('company', 'school', 'university', 'hotel', 'club', 'government_office', 'event_venue', 'other')),
  industry text,
  size text CHECK (size IN ('small', 'medium', 'large', 'enterprise')),
  address text,
  ward text,
  district text,
  city text,
  website text,
  main_phone text,
  main_email text,
  store_id text REFERENCES stores(id),
  lat numeric(10,7),
  lng numeric(10,7),
  total_revenue numeric(15,2) DEFAULT 0,
  order_count integer DEFAULT 0,
  last_order_date timestamptz,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX idx_orgs_tax_id_unique ON organizations(tax_id)
  WHERE tax_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_orgs_type ON organizations(organization_type);
CREATE INDEX idx_orgs_industry ON organizations(industry);
CREATE INDEX idx_orgs_store_id ON organizations(store_id);
CREATE INDEX idx_orgs_city ON organizations(city);
CREATE INDEX idx_orgs_created_at ON organizations(created_at);
CREATE INDEX idx_orgs_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER orgs_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CUSTOMER-ORGANIZATION LINKS
-- ============================================================
CREATE TABLE customer_org_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id uuid NOT NULL REFERENCES individual_customers(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_title text,
  is_primary_contact boolean DEFAULT false,
  start_date date,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (individual_id, organization_id)
);

CREATE INDEX idx_links_individual ON customer_org_links(individual_id);
CREATE INDEX idx_links_organization ON customer_org_links(organization_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE individual_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_org_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select" ON individual_customers
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "customers_insert" ON individual_customers
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "customers_update" ON individual_customers
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "orgs_select" ON organizations
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "orgs_insert" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "orgs_update" ON organizations
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "links_select" ON customer_org_links
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "links_insert" ON customer_org_links
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "links_update" ON customer_org_links
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "links_delete" ON customer_org_links
  FOR DELETE TO authenticated
  USING (true);
