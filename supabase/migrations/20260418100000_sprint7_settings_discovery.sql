-- Sprint 7: System settings table + discovery permissions

-- System settings for API keys and configuration
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- RLS: only admin/root can read/write settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON system_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.is_root = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_has_permission(auth.uid(), 'settings.view')
      AS has_perm WHERE has_perm = true
    )
  );

CREATE POLICY "settings_insert" ON system_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.is_root = true
    )
  );

CREATE POLICY "settings_update" ON system_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.is_root = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_has_permission(auth.uid(), 'settings.edit')
      AS has_perm WHERE has_perm = true
    )
  );

-- Seed default settings keys
INSERT INTO system_settings (key, value, description) VALUES
  ('google_places_api_key', '', 'Google Places API key for discovery'),
  ('apify_api_key', '', 'Apify API key for Google Maps scraping'),
  ('firecrawl_api_key', '', 'Firecrawl API key for website enrichment')
ON CONFLICT (key) DO NOTHING;

-- Discovery permissions
INSERT INTO permissions (slug, name_en, name_vi, object_id) VALUES
  ('discovery.view', 'View Discovery', 'Xem khám phá', (SELECT id FROM objects WHERE slug = 'discovery')),
  ('discovery.scan', 'Run Scans', 'Chạy quét', (SELECT id FROM objects WHERE slug = 'discovery')),
  ('settings.view', 'View Settings', 'Xem cài đặt', (SELECT id FROM objects WHERE slug = 'settings')),
  ('settings.edit', 'Edit Settings', 'Sửa cài đặt', (SELECT id FROM objects WHERE slug = 'settings'))
ON CONFLICT (slug) DO NOTHING;

-- Grant discovery permissions to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug IN ('admin', 'omni_channel_head', 'marketing')
  AND p.slug IN ('discovery.view', 'discovery.scan', 'settings.view', 'settings.edit')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug IN ('big_order_manager', 'sales')
  AND p.slug IN ('discovery.view')
ON CONFLICT DO NOTHING;
