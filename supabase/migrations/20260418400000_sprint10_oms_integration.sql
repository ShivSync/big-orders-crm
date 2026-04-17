-- Sprint 10: OMS Integration
-- Adds OMS sync columns to stores table, indexes for sync matching

ALTER TABLE stores ADD COLUMN IF NOT EXISTS oms_store_id text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_stores_oms_store_id ON stores(oms_store_id);
CREATE INDEX IF NOT EXISTS idx_stores_aloha_id ON stores(aloha_id);

-- Seed OMS integration permissions
INSERT INTO permissions (name_en, name_vi, slug, object_id)
SELECT 'View Integrations', 'Xem tích hợp', 'integrations.view', o.id
FROM crm_objects o WHERE o.slug = 'settings'
ON CONFLICT DO NOTHING;

INSERT INTO permissions (name_en, name_vi, slug, object_id)
SELECT 'Manage Integrations', 'Quản lý tích hợp', 'integrations.manage', o.id
FROM crm_objects o WHERE o.slug = 'settings'
ON CONFLICT DO NOTHING;

-- Grant integration permissions to root-level roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.master_slug IN ('admin', 'manager')
  AND p.slug IN ('integrations.view', 'integrations.manage')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.master_slug = 'team_lead'
  AND p.slug = 'integrations.view'
ON CONFLICT DO NOTHING;
