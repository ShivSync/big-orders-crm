-- Sprint 11: Reports & KPI Targets
-- Adds kpi_targets table and reports.view / reports.export permissions

-- KPI Targets table
CREATE TABLE IF NOT EXISTS kpi_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text REFERENCES stores(id),
  role_slug text,
  period text NOT NULL, -- YYYY-MM format
  metric text NOT NULL CHECK (metric IN ('leads_target', 'orders_target', 'revenue_target', 'conversion_target')),
  value numeric NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, period, metric)
);

CREATE INDEX idx_kpi_targets_period ON kpi_targets(period);
CREATE INDEX idx_kpi_targets_store ON kpi_targets(store_id);

ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY kpi_targets_select ON kpi_targets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND (u.is_root = true OR EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN user_roles ur ON ur.role_id = rp.role_id
      WHERE ur.user_id = auth.uid() AND p.slug = 'reports.view'
    ))
  )
);

CREATE POLICY kpi_targets_insert ON kpi_targets FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND (u.is_root = true OR EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN user_roles ur ON ur.role_id = rp.role_id
      WHERE ur.user_id = auth.uid() AND p.slug = 'reports.view'
    ))
  )
);

CREATE POLICY kpi_targets_update ON kpi_targets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND (u.is_root = true OR EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN user_roles ur ON ur.role_id = rp.role_id
      WHERE ur.user_id = auth.uid() AND p.slug = 'reports.view'
    ))
  )
);

-- Seed permissions for reports
DO $$
DECLARE
  v_obj_id uuid;
BEGIN
  SELECT id INTO v_obj_id FROM objects WHERE slug = 'reports';
  IF v_obj_id IS NULL THEN
    INSERT INTO objects (name_en, name_vi, slug) VALUES ('Reports', 'Báo cáo', 'reports') RETURNING id INTO v_obj_id;
  END IF;

  INSERT INTO permissions (name_en, name_vi, slug, object_id)
  VALUES
    ('View Reports', 'Xem báo cáo', 'reports.view', v_obj_id),
    ('Export Reports', 'Xuất báo cáo', 'reports.export', v_obj_id)
  ON CONFLICT DO NOTHING;

  -- Grant reports.view to all roles
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r, permissions p
  WHERE p.slug IN ('reports.view', 'reports.export')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
END $$;
