-- Sprint 6 Security Fixes (Codex Adversarial Review #5)
-- H1: Permission check added to segment endpoint (app code)
-- H2: Recipients derive destinations server-side from DB (app code)
-- H3: Campaign ownership — by design, campaigns are team-shared (same as leads/orders)
-- H4: recurring_events RLS uses wrong permission slugs — fixed below
-- M5: Customer detail client-side mutations — deferred (pre-existing, all sprints)
-- M6: Customer detail PII reads — deferred (pre-existing, Sprint 11)

-- Fix H4: Drop and recreate recurring_events RLS policies with correct events.* slugs
-- (Only needed if the main migration was applied with the wrong slugs)
DROP POLICY IF EXISTS recurring_events_select ON recurring_events;
DROP POLICY IF EXISTS recurring_events_insert ON recurring_events;
DROP POLICY IF EXISTS recurring_events_update ON recurring_events;
DROP POLICY IF EXISTS recurring_events_delete ON recurring_events;

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
