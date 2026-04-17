-- Sprint 5 Patch: Fix store_id type (text, not uuid) to match stores.id
-- The original migration used uuid but EC2 stores table has id text.
-- menu_categories and menu_items already created successfully.
-- This patch creates: orders, order_items, order_status_history + their RLS/indexes.

-- Sequence (may already exist from partial run — use IF NOT EXISTS)
DO $$ BEGIN
  CREATE SEQUENCE order_number_seq START 1;
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

-- ============================================================
-- ORDERS (with store_id text)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT 'BO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_number_seq')::text, 5, '0'),
  customer_id uuid REFERENCES individual_customers(id),
  organization_id uuid REFERENCES organizations(id),
  opportunity_id uuid REFERENCES opportunities(id),
  store_id text NOT NULL REFERENCES stores(id),
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  event_type text NOT NULL DEFAULT 'custom' CHECK (event_type IN ('birthday', 'corporate', 'school_event', 'meeting', 'custom')),
  scheduled_date date NOT NULL,
  guest_count int,
  subtotal bigint NOT NULL DEFAULT 0,
  discount_pct numeric(5,2) DEFAULT 0,
  discount_amount bigint DEFAULT 0,
  total_value bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'preparing', 'ready', 'fulfilled', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  delivery_notes text,
  assigned_to uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  aloha_bill_id text,
  source text NOT NULL DEFAULT 'crm' CHECK (source IN ('crm', 'landing_page', 'phone', 'zalo', 'facebook', 'oms_migrated')),
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_date ON orders(scheduled_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at);

CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_select ON orders
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'orders.view'
    )
  );

CREATE POLICY orders_insert ON orders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'orders.create'
    )
  );

CREATE POLICY orders_update ON orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'orders.edit'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'orders.edit'
    )
  );

CREATE POLICY orders_delete ON orders
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'orders.delete'
    )
  );

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id),
  item_code text NOT NULL,
  name_vi text NOT NULL,
  name_en text NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price bigint NOT NULL CHECK (unit_price > 0),
  line_total bigint NOT NULL,
  special_requests text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_items_select ON order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN role_permissions rp ON rp.role_id = ur.role_id
          JOIN permissions p ON p.id = rp.permission_id
          WHERE ur.user_id = auth.uid()
            AND p.slug = 'orders.view'
        )
    )
  );

CREATE POLICY order_items_insert ON order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'orders.create'
    )
  );

CREATE POLICY order_items_update ON order_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'orders.edit'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'orders.edit'
    )
  );

-- ============================================================
-- ORDER STATUS HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid NOT NULL REFERENCES users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_status_history_select ON order_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_status_history.order_id
        AND o.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN role_permissions rp ON rp.role_id = ur.role_id
          JOIN permissions p ON p.id = rp.permission_id
          WHERE ur.user_id = auth.uid()
            AND p.slug = 'orders.view'
        )
    )
  );

CREATE POLICY order_status_history_insert ON order_status_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.slug = 'orders.edit'
    )
  );
