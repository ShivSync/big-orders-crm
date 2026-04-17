-- Sprint 5 Security Fixes (Codex Adversarial Review #4)
-- Fixes: entity_type validation for activities, menu.view permission enforcement

-- Add 'order' to the activities entity_type check if it exists as a CHECK constraint
-- (Activities table may not have a CHECK — it uses text type. This is safe.)

-- No DDL changes needed — all fixes are in application code:
-- H1: Client-side mutations moved to PATCH /api/orders/[id] (server-side)
-- H3: opportunity_id validation added to POST /api/orders
-- H4: payment_status allowlist validation added
-- H5: orders.approve permission check on confirmed transition
-- M1: entity_type bug fixed (opportunity → order)
-- M2: Phone format validation added
-- M3: Past date validation added
-- M4: Orphaned order cleanup on items failure

-- Grant orders.approve to omni_head and admin roles (approval workflow)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'omni_head' AND p.slug = 'orders.approve'
ON CONFLICT DO NOTHING;

-- Grant orders.view/create/edit to big_order_manager and sales roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('big_order_manager', 'sales_manager') AND p.slug IN ('orders.view', 'orders.create', 'orders.edit', 'menu.view')
ON CONFLICT DO NOTHING;

-- Grant orders.view + menu.view to store-level roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('rgm', 'area_manager') AND p.slug IN ('orders.view', 'menu.view')
ON CONFLICT DO NOTHING;
