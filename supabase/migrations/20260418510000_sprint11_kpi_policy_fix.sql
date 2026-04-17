-- Fix C5: Restrict kpi_targets INSERT/UPDATE to root users only

DROP POLICY IF EXISTS kpi_targets_insert ON kpi_targets;
DROP POLICY IF EXISTS kpi_targets_update ON kpi_targets;

CREATE POLICY kpi_targets_insert ON kpi_targets FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.is_root = true
  )
);

CREATE POLICY kpi_targets_update ON kpi_targets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.is_root = true
  )
);
