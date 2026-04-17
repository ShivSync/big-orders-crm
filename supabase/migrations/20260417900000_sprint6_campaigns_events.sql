-- Sprint 6: Campaigns & Recurring Events

-- ============================================================
-- 1. CAMPAIGNS
-- ============================================================
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'email' CHECK (campaign_type IN ('sms', 'email')),
  segment_filters jsonb NOT NULL DEFAULT '{}',
  subject text,
  template text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  sent_count int NOT NULL DEFAULT 0,
  delivered_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_campaigns_status ON campaigns(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaigns_scheduled_at ON campaigns(scheduled_at) WHERE status = 'scheduled' AND deleted_at IS NULL;
CREATE INDEX idx_campaigns_deleted_at ON campaigns(deleted_at);

CREATE TRIGGER set_updated_at_campaigns
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_select ON campaigns
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'campaigns.view'
    )
  );

CREATE POLICY campaigns_insert ON campaigns
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'campaigns.create'
    )
  );

CREATE POLICY campaigns_update ON campaigns
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'campaigns.edit'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'campaigns.edit'
    )
  );

CREATE POLICY campaigns_delete ON campaigns
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'campaigns.delete'
    )
  );

-- ============================================================
-- 2. CAMPAIGN RECIPIENTS
-- ============================================================
CREATE TABLE campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES individual_customers(id),
  channel text NOT NULL CHECK (channel IN ('sms', 'email')),
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(campaign_id, status);
CREATE INDEX idx_campaign_recipients_customer_id ON campaign_recipients(customer_id);

ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaign_recipients_select ON campaign_recipients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_recipients.campaign_id
        AND c.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN role_permissions rp ON rp.role_id = ur.role_id
          JOIN permissions p ON p.id = rp.permission_id
          WHERE ur.user_id = auth.uid()
            AND p.slug = 'campaigns.view'
        )
    )
  );

CREATE POLICY campaign_recipients_insert ON campaign_recipients
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'campaigns.edit'
    )
  );

CREATE POLICY campaign_recipients_update ON campaign_recipients
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'campaigns.edit'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'campaigns.edit'
    )
  );

-- ============================================================
-- 3. RECURRING EVENTS
-- ============================================================
CREATE TABLE recurring_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES individual_customers(id),
  event_type text NOT NULL DEFAULT 'custom' CHECK (event_type IN ('birthday', 'company_anniversary', 'children_day', 'custom')),
  event_name text NOT NULL,
  event_date date NOT NULL,
  reminder_days_before int NOT NULL DEFAULT 30,
  last_reminded_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_recurring_events_customer_id ON recurring_events(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recurring_events_active ON recurring_events(active) WHERE active = true AND deleted_at IS NULL;
CREATE INDEX idx_recurring_events_date ON recurring_events(event_date) WHERE active = true AND deleted_at IS NULL;

CREATE TRIGGER set_updated_at_recurring_events
  BEFORE UPDATE ON recurring_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE recurring_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurring_events_select ON recurring_events
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'events.view'
    )
  );

CREATE POLICY recurring_events_insert ON recurring_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'events.create'
    )
  );

CREATE POLICY recurring_events_update ON recurring_events
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'events.edit'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'events.edit'
    )
  );

CREATE POLICY recurring_events_delete ON recurring_events
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'events.delete'
    )
  );

-- ============================================================
-- 4. PERMISSIONS — campaigns + events objects
-- ============================================================
INSERT INTO objects (id, name_en, name_vi, slug) VALUES
  (gen_random_uuid(), 'Campaigns', 'Chiến dịch', 'campaigns'),
  (gen_random_uuid(), 'Events', 'Sự kiện', 'events')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  campaigns_obj_id uuid;
  events_obj_id uuid;
BEGIN
  SELECT id INTO campaigns_obj_id FROM objects WHERE slug = 'campaigns';
  SELECT id INTO events_obj_id FROM objects WHERE slug = 'events';

  INSERT INTO permissions (id, name_en, name_vi, slug, object_id) VALUES
    (gen_random_uuid(), 'View Campaigns', 'Xem chiến dịch', 'campaigns.view', campaigns_obj_id),
    (gen_random_uuid(), 'Create Campaign', 'Tạo chiến dịch', 'campaigns.create', campaigns_obj_id),
    (gen_random_uuid(), 'Edit Campaign', 'Sửa chiến dịch', 'campaigns.edit', campaigns_obj_id),
    (gen_random_uuid(), 'Delete Campaign', 'Xóa chiến dịch', 'campaigns.delete', campaigns_obj_id),
    (gen_random_uuid(), 'Send Campaign', 'Gửi chiến dịch', 'campaigns.send', campaigns_obj_id),
    (gen_random_uuid(), 'View Events', 'Xem sự kiện', 'events.view', events_obj_id),
    (gen_random_uuid(), 'Create Event', 'Tạo sự kiện', 'events.create', events_obj_id),
    (gen_random_uuid(), 'Edit Event', 'Sửa sự kiện', 'events.edit', events_obj_id),
    (gen_random_uuid(), 'Delete Event', 'Xóa sự kiện', 'events.delete', events_obj_id)
  ON CONFLICT DO NOTHING;

  -- Admin gets all campaign + event permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r, permissions p
  WHERE r.slug = 'admin' AND (p.slug LIKE 'campaigns.%' OR p.slug LIKE 'events.%')
  ON CONFLICT DO NOTHING;

  -- Marketing role gets full campaign + event access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r, permissions p
  WHERE r.slug = 'marketing' AND (p.slug LIKE 'campaigns.%' OR p.slug LIKE 'events.%')
  ON CONFLICT DO NOTHING;

  -- Big Order Manager and Sales get view + create campaigns
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r, permissions p
  WHERE r.slug IN ('big_order_manager', 'sales_manager') AND p.slug IN ('campaigns.view', 'campaigns.create', 'events.view', 'events.create')
  ON CONFLICT DO NOTHING;

  -- Omni Head gets full access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r, permissions p
  WHERE r.slug = 'omni_head' AND (p.slug LIKE 'campaigns.%' OR p.slug LIKE 'events.%')
  ON CONFLICT DO NOTHING;

  -- Store-level roles get view only
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r, permissions p
  WHERE r.slug IN ('store_manager', 'rgm', 'area_manager') AND p.slug IN ('campaigns.view', 'events.view')
  ON CONFLICT DO NOTHING;
END $$;
