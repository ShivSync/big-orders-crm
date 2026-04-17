-- Security Fixes: RLS hardening from Codex adversarial review
-- Fixes: privilege escalation, overly permissive policies, missing write policies

-- ============================================================
-- CRITICAL: Fix users_update privilege escalation
-- Users could set is_root=true on themselves via direct Supabase query
-- Solution: non-admin users can only update safe columns on own record
-- ============================================================

DROP POLICY IF EXISTS users_update ON users;

CREATE POLICY users_update_self ON users FOR UPDATE USING (
  auth.uid() = id
) WITH CHECK (
  auth.uid() = id
  AND is_root = (SELECT u.is_root FROM users u WHERE u.id = auth.uid())
  AND status = (SELECT u.status FROM users u WHERE u.id = auth.uid())
  AND region = (SELECT u.region FROM users u WHERE u.id = auth.uid())
);

CREATE POLICY users_update_admin ON users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'users.edit')
);

-- ============================================================
-- CRITICAL: Harden Sprint 2 leads RLS with permission checks
-- ============================================================

DROP POLICY IF EXISTS leads_select ON leads;
DROP POLICY IF EXISTS leads_insert ON leads;
DROP POLICY IF EXISTS leads_update ON leads;

CREATE POLICY leads_select ON leads FOR SELECT TO authenticated USING (
  deleted_at IS NULL
  AND (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
    OR user_has_permission(auth.uid(), 'leads.view')
  )
);

CREATE POLICY leads_insert ON leads FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'leads.create')
);

CREATE POLICY leads_update ON leads FOR UPDATE TO authenticated USING (
  deleted_at IS NULL
  AND (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
    OR user_has_permission(auth.uid(), 'leads.edit')
  )
);

-- ============================================================
-- CRITICAL: Harden activities RLS
-- ============================================================

DROP POLICY IF EXISTS activities_select ON activities;
DROP POLICY IF EXISTS activities_insert ON activities;

CREATE POLICY activities_select ON activities FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'leads.view')
);

CREATE POLICY activities_insert ON activities FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'leads.create')
  OR user_has_permission(auth.uid(), 'leads.edit')
);

-- ============================================================
-- MEDIUM: Add missing write policies for RBAC mutation tables
-- ============================================================

CREATE POLICY role_permissions_write ON role_permissions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'settings.edit')
);

CREATE POLICY role_objects_write ON role_objects FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'settings.edit')
);

CREATE POLICY teams_write ON teams FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'settings.edit')
);

CREATE POLICY user_roles_write ON user_roles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'users.edit')
);

CREATE POLICY user_teams_write ON user_teams FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'users.edit')
);

CREATE POLICY user_stores_write ON user_stores FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'users.edit')
);

CREATE POLICY business_rules_write ON business_rules FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
  OR user_has_permission(auth.uid(), 'settings.edit')
);
