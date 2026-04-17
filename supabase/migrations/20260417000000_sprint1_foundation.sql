-- Sprint 1: Foundation — Auth + OMS-Aligned RBAC + i18n + Base Tables
-- Big Orders CRM — KFC Vietnam

-- ============================================================
-- RBAC SYSTEM (OMS-Aligned)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text,
  phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  is_root boolean NOT NULL DEFAULT false,
  region text NOT NULL DEFAULT 'ALL' CHECK (region IN ('ALL', 'N', 'T', 'B')),
  language_preference text NOT NULL DEFAULT 'vi' CHECK (language_preference IN ('vi', 'en')),
  last_action text,
  oms_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_vi text NOT NULL,
  slug text NOT NULL UNIQUE,
  master_slug text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_vi text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_vi text NOT NULL,
  slug text NOT NULL UNIQUE,
  object_id uuid NOT NULL REFERENCES objects(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS role_objects (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  object_id uuid NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  is_access boolean NOT NULL DEFAULT true,
  filter_store text NOT NULL DEFAULT 'ALL' CHECK (filter_store IN ('ALL', 'SOME', 'ONE')),
  filter_team text,
  access_type text NOT NULL DEFAULT 'ALL' CHECK (access_type IN ('ALL', 'BY_FILTER')),
  PRIMARY KEY (role_id, object_id)
);

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text NOT NULL DEFAULT 'ALL' CHECK (region IN ('ALL', 'N', 'T', 'B')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_teams (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, team_id)
);

CREATE TABLE IF NOT EXISTS stores (
  id text PRIMARY KEY,
  name text NOT NULL,
  aloha_id text,
  region text NOT NULL CHECK (region IN ('N', 'T', 'B')),
  address text,
  city text,
  district text,
  lat numeric(10,7),
  lng numeric(10,7),
  territory_radius_km numeric(4,1) NOT NULL DEFAULT 5.0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS user_stores (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id text NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, store_id)
);

-- ============================================================
-- BUSINESS RULES
-- ============================================================

CREATE TABLE IF NOT EXISTS business_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type text NOT NULL CHECK (rule_type IN ('approval_threshold', 'discount_limit', 'reassignment_rule', 'custom')),
  rule_key text NOT NULL UNIQUE,
  rule_value jsonb NOT NULL DEFAULT '{}',
  applies_to_role text,
  approval_role text,
  name_en text NOT NULL,
  name_vi text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- DATA MASKING FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION mask_phone(phone text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF phone IS NULL OR length(phone) < 6 THEN
    RETURN phone;
  END IF;
  RETURN substring(phone, 1, 4) || '***' || substring(phone, length(phone) - 2);
END;
$$;

CREATE OR REPLACE FUNCTION mask_email(email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  at_pos integer;
BEGIN
  IF email IS NULL THEN RETURN NULL; END IF;
  at_pos := position('@' in email);
  IF at_pos <= 2 THEN RETURN email; END IF;
  RETURN substring(email, 1, 2) || '***' || substring(email, at_pos);
END;
$$;

CREATE OR REPLACE FUNCTION user_has_permission(p_user_id uuid, p_permission_slug text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  -- Root users have all permissions
  IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_root = true) THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id AND p.slug = p_permission_slug
  );
END;
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own record; admins/root can read all
CREATE POLICY users_select ON users FOR SELECT USING (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'users.view')
);

CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'users.create')
);

CREATE POLICY users_update ON users FOR UPDATE USING (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'users.edit')
);

-- Reference tables readable by all authenticated users
CREATE POLICY roles_select ON roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY roles_modify ON roles FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'settings.edit')
);

CREATE POLICY permissions_select ON permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY objects_select ON objects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY role_permissions_select ON role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY role_objects_select ON role_objects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY teams_select ON teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY stores_select ON stores FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY user_roles_select ON user_roles FOR SELECT USING (
  user_id = auth.uid() OR user_has_permission(auth.uid(), 'users.view')
);

CREATE POLICY user_teams_select ON user_teams FOR SELECT USING (
  user_id = auth.uid() OR user_has_permission(auth.uid(), 'users.view')
);

CREATE POLICY user_stores_select ON user_stores FOR SELECT USING (
  user_id = auth.uid() OR user_has_permission(auth.uid(), 'users.view')
);

CREATE POLICY business_rules_select ON business_rules FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY audit_logs_select ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'audit.view')
);

CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- SEED DATA
-- ============================================================

-- 8 roles (bilingual, OMS-aligned)
INSERT INTO roles (name_en, name_vi, slug, master_slug) VALUES
  ('Call Center', 'Tổng đài', 'call_center', 'call_center'),
  ('Restaurant General Manager', 'Quản lý cửa hàng', 'rgm', 'rgm'),
  ('Big Order Manager', 'Quản lý đơn hàng lớn', 'big_order_manager', 'big_order_manager'),
  ('Omni Head', 'Trưởng phòng Omni', 'omni_head', 'omni_head'),
  ('Area Manager', 'Quản lý khu vực', 'area_manager', 'area_manager'),
  ('Sales Manager', 'Quản lý kinh doanh', 'sales_manager', 'sales_manager'),
  ('Operations Director', 'Giám đốc vận hành', 'od', 'od'),
  ('Administrator', 'Quản trị viên', 'admin', 'admin')
ON CONFLICT (slug) DO NOTHING;

-- CRM objects (screens/features)
INSERT INTO objects (name_en, name_vi, slug) VALUES
  ('Dashboard', 'Tổng quan', 'dashboard'),
  ('Leads', 'Khách hàng tiềm năng', 'leads'),
  ('Pipeline', 'Quy trình bán hàng', 'pipeline'),
  ('Customers', 'Khách hàng', 'customers'),
  ('Organizations', 'Tổ chức', 'organizations'),
  ('Orders', 'Đơn hàng lớn', 'orders'),
  ('Campaigns', 'Chiến dịch', 'campaigns'),
  ('Discovery', 'Khám phá', 'discovery'),
  ('Reports', 'Báo cáo', 'reports'),
  ('Users', 'Người dùng', 'users'),
  ('Settings', 'Cài đặt', 'settings'),
  ('Audit', 'Nhật ký', 'audit')
ON CONFLICT (slug) DO NOTHING;

-- Permissions per object
INSERT INTO permissions (name_en, name_vi, slug, object_id)
SELECT p.name_en, p.name_vi, p.slug, o.id
FROM (VALUES
  ('View Dashboard', 'Xem tổng quan', 'dashboard.view', 'dashboard'),
  ('View Revenue', 'Xem doanh thu', 'dashboard.revenue', 'dashboard'),
  ('View Leads', 'Xem KHTN', 'leads.view', 'leads'),
  ('Create Lead', 'Tạo KHTN', 'leads.create', 'leads'),
  ('Edit Lead', 'Sửa KHTN', 'leads.edit', 'leads'),
  ('Delete Lead', 'Xóa KHTN', 'leads.delete', 'leads'),
  ('Export Leads', 'Xuất KHTN', 'leads.export', 'leads'),
  ('Import Leads', 'Nhập KHTN', 'leads.import', 'leads'),
  ('View Pipeline', 'Xem pipeline', 'pipeline.view', 'pipeline'),
  ('Manage Pipeline', 'Quản lý pipeline', 'pipeline.manage', 'pipeline'),
  ('View Customers', 'Xem khách hàng', 'customers.view', 'customers'),
  ('Edit Customers', 'Sửa khách hàng', 'customers.edit', 'customers'),
  ('View Organizations', 'Xem tổ chức', 'organizations.view', 'organizations'),
  ('Edit Organizations', 'Sửa tổ chức', 'organizations.edit', 'organizations'),
  ('View Orders', 'Xem đơn hàng', 'orders.view', 'orders'),
  ('Create Orders', 'Tạo đơn hàng', 'orders.create', 'orders'),
  ('Edit Orders', 'Sửa đơn hàng', 'orders.edit', 'orders'),
  ('Approve Orders', 'Duyệt đơn hàng', 'orders.approve', 'orders'),
  ('View Campaigns', 'Xem chiến dịch', 'campaigns.view', 'campaigns'),
  ('Manage Campaigns', 'Quản lý chiến dịch', 'campaigns.manage', 'campaigns'),
  ('View Discovery', 'Xem khám phá', 'discovery.view', 'discovery'),
  ('Run Discovery', 'Chạy khám phá', 'discovery.run', 'discovery'),
  ('View Reports', 'Xem báo cáo', 'reports.view', 'reports'),
  ('View Users', 'Xem người dùng', 'users.view', 'users'),
  ('Create Users', 'Tạo người dùng', 'users.create', 'users'),
  ('Edit Users', 'Sửa người dùng', 'users.edit', 'users'),
  ('Edit Settings', 'Sửa cài đặt', 'settings.edit', 'settings'),
  ('View Audit Log', 'Xem nhật ký', 'audit.view', 'audit')
) AS p(name_en, name_vi, slug, obj_slug)
JOIN objects o ON o.slug = p.obj_slug
ON CONFLICT (slug) DO NOTHING;

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.slug = 'admin'
ON CONFLICT DO NOTHING;

-- Omni Head gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.slug = 'omni_head'
ON CONFLICT DO NOTHING;

-- RGM: dashboard, leads (own store), orders (own store), customers (own store)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'rgm' AND p.slug IN (
  'dashboard.view', 'leads.view', 'leads.create', 'leads.edit',
  'customers.view', 'orders.view', 'orders.create', 'orders.edit'
)
ON CONFLICT DO NOTHING;

-- Big Order Manager: like RGM + pipeline + export + discovery
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'big_order_manager' AND p.slug IN (
  'dashboard.view', 'dashboard.revenue', 'leads.view', 'leads.create', 'leads.edit', 'leads.export',
  'pipeline.view', 'pipeline.manage', 'customers.view', 'customers.edit',
  'organizations.view', 'organizations.edit',
  'orders.view', 'orders.create', 'orders.edit',
  'discovery.view', 'discovery.run', 'reports.view'
)
ON CONFLICT DO NOTHING;

-- Area Manager: like Big Order Manager + approve
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'area_manager' AND p.slug IN (
  'dashboard.view', 'dashboard.revenue', 'leads.view', 'leads.create', 'leads.edit', 'leads.export',
  'pipeline.view', 'pipeline.manage', 'customers.view', 'customers.edit',
  'organizations.view', 'organizations.edit',
  'orders.view', 'orders.create', 'orders.edit', 'orders.approve',
  'discovery.view', 'reports.view'
)
ON CONFLICT DO NOTHING;

-- Role-Object store filtering
INSERT INTO role_objects (role_id, object_id, is_access, filter_store, access_type)
SELECT r.id, o.id, true,
  CASE
    WHEN r.slug IN ('admin', 'omni_head', 'od') THEN 'ALL'
    WHEN r.slug IN ('area_manager', 'sales_manager') THEN 'SOME'
    ELSE 'ONE'
  END,
  CASE
    WHEN r.slug IN ('admin', 'omni_head', 'od') THEN 'ALL'
    ELSE 'BY_FILTER'
  END
FROM roles r CROSS JOIN objects o
WHERE r.slug IN ('admin', 'omni_head', 'od', 'area_manager', 'sales_manager', 'rgm', 'big_order_manager', 'call_center')
ON CONFLICT DO NOTHING;

-- 5 test stores (N/T/B)
INSERT INTO stores (id, name, aloha_id, region, city, district, lat, lng) VALUES
  ('S001', 'KFC Hoàn Kiếm', 'HK01', 'N', 'Hà Nội', 'Hoàn Kiếm', 21.0285, 105.8542),
  ('S002', 'KFC Cầu Giấy', 'CG01', 'N', 'Hà Nội', 'Cầu Giấy', 21.0368, 105.7915),
  ('S003', 'KFC Hải Châu', 'HC01', 'T', 'Đà Nẵng', 'Hải Châu', 16.0471, 108.2068),
  ('S004', 'KFC Quận 1', 'Q101', 'B', 'TP. Hồ Chí Minh', 'Quận 1', 10.7769, 106.7009),
  ('S005', 'KFC Quận 7', 'Q701', 'B', 'TP. Hồ Chí Minh', 'Quận 7', 10.7340, 106.7218)
ON CONFLICT (id) DO NOTHING;

-- Business rules
INSERT INTO business_rules (rule_type, rule_key, rule_value, applies_to_role, approval_role, name_en, name_vi) VALUES
  ('approval_threshold', 'order_value_max', '{"threshold_vnd": 50000000}', 'big_order_manager', 'omni_head',
   'Orders above 50M VND require Omni Head approval', 'Đơn hàng trên 50 triệu cần duyệt bởi Trưởng Omni'),
  ('discount_limit', 'discount_pct_max', '{"max_pct": 15}', 'big_order_manager', 'omni_head',
   'Discounts above 15% require Omni Head approval', 'Chiết khấu trên 15% cần duyệt bởi Trưởng Omni'),
  ('reassignment_rule', 'cross_region_reassign', '{}', NULL, 'omni_head',
   'Cross-region lead reassignment requires Omni Head approval', 'Chuyển KHTN giữa vùng cần duyệt bởi Trưởng Omni')
ON CONFLICT (rule_key) DO NOTHING;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER business_rules_updated_at BEFORE UPDATE ON business_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
