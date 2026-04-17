-- Sprint 3 Security Fixes: RLS hardening from Codex adversarial review
-- Fixes: CRITICAL-1/2/3 (overly permissive RLS on customers/orgs/links)
-- Fixes: HIGH-2 (activities permission broadened for customer entity_type)

-- ============================================================
-- CRITICAL-1: Harden individual_customers RLS with permission checks
-- ============================================================

DROP POLICY IF EXISTS customers_select ON individual_customers;
DROP POLICY IF EXISTS customers_insert ON individual_customers;
DROP POLICY IF EXISTS customers_update ON individual_customers;

CREATE POLICY customers_select ON individual_customers
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
      OR user_has_permission(auth.uid(), 'customers.view')
    )
  );

CREATE POLICY customers_insert ON individual_customers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
    OR user_has_permission(auth.uid(), 'customers.edit')
  );

CREATE POLICY customers_update ON individual_customers
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
      OR user_has_permission(auth.uid(), 'customers.edit')
    )
  );

-- ============================================================
-- CRITICAL-2: Harden organizations RLS with permission checks
-- ============================================================

DROP POLICY IF EXISTS orgs_select ON organizations;
DROP POLICY IF EXISTS orgs_insert ON organizations;
DROP POLICY IF EXISTS orgs_update ON organizations;

CREATE POLICY orgs_select ON organizations
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
      OR user_has_permission(auth.uid(), 'organizations.view')
    )
  );

CREATE POLICY orgs_insert ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
    OR user_has_permission(auth.uid(), 'organizations.edit')
  );

CREATE POLICY orgs_update ON organizations
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
      OR user_has_permission(auth.uid(), 'organizations.edit')
    )
  );

-- ============================================================
-- CRITICAL-3: Harden customer_org_links RLS
-- Require permission on either customers or organizations side
-- ============================================================

DROP POLICY IF EXISTS links_select ON customer_org_links;
DROP POLICY IF EXISTS links_insert ON customer_org_links;
DROP POLICY IF EXISTS links_update ON customer_org_links;
DROP POLICY IF EXISTS links_delete ON customer_org_links;

CREATE POLICY links_select ON customer_org_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
    OR user_has_permission(auth.uid(), 'customers.view')
    OR user_has_permission(auth.uid(), 'organizations.view')
  );

CREATE POLICY links_insert ON customer_org_links
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
    OR user_has_permission(auth.uid(), 'customers.edit')
    OR user_has_permission(auth.uid(), 'organizations.edit')
  );

CREATE POLICY links_update ON customer_org_links
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
    OR user_has_permission(auth.uid(), 'customers.edit')
    OR user_has_permission(auth.uid(), 'organizations.edit')
  );

CREATE POLICY links_delete ON customer_org_links
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
    OR user_has_permission(auth.uid(), 'customers.edit')
    OR user_has_permission(auth.uid(), 'organizations.edit')
  );

-- ============================================================
-- Broaden activities RLS to cover customer entity_type
-- (Sprint 2 only gated on leads.view/leads.edit)
-- ============================================================

DROP POLICY IF EXISTS activities_select ON activities;
DROP POLICY IF EXISTS activities_insert ON activities;

CREATE POLICY activities_select ON activities
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
    OR user_has_permission(auth.uid(), 'leads.view')
    OR user_has_permission(auth.uid(), 'customers.view')
  );

CREATE POLICY activities_insert ON activities
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
    OR user_has_permission(auth.uid(), 'leads.create')
    OR user_has_permission(auth.uid(), 'leads.edit')
    OR user_has_permission(auth.uid(), 'customers.edit')
  );
