-- Sprint 4 Security Fixes (Codex Adversarial Review)
-- H2: Separate edit from delete authority on opportunities
-- H3: Add partial unique index for idempotent lead→opportunity conversion

-- Drop existing update policy
DROP POLICY IF EXISTS opportunities_update ON opportunities;

-- Recreate update policy: only non-deleted rows, cannot touch deleted_at
CREATE POLICY opportunities_update ON opportunities
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'pipeline.edit'
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'pipeline.edit'
    )
  );

-- Add soft-delete policy: requires pipeline.delete permission
CREATE POLICY opportunities_soft_delete ON opportunities
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'pipeline.delete'
    )
  )
  WITH CHECK (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'pipeline.delete'
    )
  );

-- M1: Partial unique index — one active opportunity per lead
CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunities_unique_lead
  ON opportunities(lead_id) WHERE lead_id IS NOT NULL AND deleted_at IS NULL;

-- Also update select policy to only show non-deleted (belt and suspenders)
DROP POLICY IF EXISTS opportunities_select ON opportunities;
CREATE POLICY opportunities_select ON opportunities
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true
      )
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = auth.uid()
          AND p.slug = 'pipeline.view'
      )
    )
  );
