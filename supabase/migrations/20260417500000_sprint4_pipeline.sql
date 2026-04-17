-- Sprint 4: Sales Pipeline & Opportunities

CREATE TABLE opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id),
  customer_id uuid REFERENCES individual_customers(id),
  title text NOT NULL,
  stage text NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'consulting', 'quoted', 'negotiating', 'won', 'lost')),
  expected_value bigint DEFAULT 0,
  expected_date date,
  actual_value bigint,
  lost_reason text,
  assigned_to uuid REFERENCES users(id),
  notes text,
  order_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_opportunities_stage ON opportunities(stage) WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_lead_id ON opportunities(lead_id);
CREATE INDEX idx_opportunities_customer_id ON opportunities(customer_id);
CREATE INDEX idx_opportunities_assigned_to ON opportunities(assigned_to);
CREATE INDEX idx_opportunities_expected_date ON opportunities(expected_date);
CREATE INDEX idx_opportunities_deleted_at ON opportunities(deleted_at);

CREATE TRIGGER set_updated_at_opportunities
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — users with pipeline.view permission
CREATE POLICY opportunities_select ON opportunities
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'pipeline.view'
    )
  );

-- RLS: INSERT — users with pipeline.create permission
CREATE POLICY opportunities_insert ON opportunities
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'pipeline.create'
    )
  );

-- RLS: UPDATE — users with pipeline.edit permission
CREATE POLICY opportunities_update ON opportunities
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'pipeline.edit'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'pipeline.edit'
    )
  );

-- Seed pipeline permissions and object
INSERT INTO objects (id, name_en, name_vi, slug) VALUES
  (gen_random_uuid(), 'Pipeline', 'Cơ hội', 'pipeline')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  obj_id uuid;
BEGIN
  SELECT id INTO obj_id FROM objects WHERE slug = 'pipeline';

  INSERT INTO permissions (id, name_en, name_vi, slug, object_id) VALUES
    (gen_random_uuid(), 'View Pipeline', 'Xem cơ hội', 'pipeline.view', obj_id),
    (gen_random_uuid(), 'Create Opportunity', 'Tạo cơ hội', 'pipeline.create', obj_id),
    (gen_random_uuid(), 'Edit Opportunity', 'Sửa cơ hội', 'pipeline.edit', obj_id),
    (gen_random_uuid(), 'Delete Opportunity', 'Xóa cơ hội', 'pipeline.delete', obj_id)
  ON CONFLICT DO NOTHING;

  -- Grant pipeline permissions to admin role
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r, permissions p
  WHERE r.slug = 'admin' AND p.slug LIKE 'pipeline.%'
  ON CONFLICT DO NOTHING;
END $$;
