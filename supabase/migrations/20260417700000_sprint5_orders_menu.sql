-- Sprint 5: Big Orders & Menu Management

-- ============================================================
-- 1. MENU CATEGORIES
-- ============================================================
CREATE TABLE menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_vi text NOT NULL,
  name_en text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at_menu_categories
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY menu_categories_select ON menu_categories
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 2. MENU ITEMS
-- ============================================================
CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES menu_categories(id),
  item_code text NOT NULL UNIQUE,
  pos_name text,
  name_vi text NOT NULL,
  name_en text NOT NULL,
  description_vi text,
  description_en text,
  price bigint NOT NULL CHECK (price > 0),
  components text,
  min_quantity int NOT NULL DEFAULT 1,
  max_quantity int NOT NULL DEFAULT 9999,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_active ON menu_items(active) WHERE active = true;

CREATE TRIGGER set_updated_at_menu_items
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY menu_items_select ON menu_items
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 3. ORDERS
-- ============================================================
CREATE SEQUENCE order_number_seq START 1;

CREATE TABLE orders (
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

CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_store_id ON orders(store_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_customer_id ON orders(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_scheduled_date ON orders(scheduled_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_deleted_at ON orders(deleted_at);

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
-- 4. ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
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

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

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
-- 5. ORDER STATUS HISTORY
-- ============================================================
CREATE TABLE order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid NOT NULL REFERENCES users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);

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

-- ============================================================
-- 6. PERMISSIONS — orders + menu objects
-- ============================================================
INSERT INTO objects (id, name_en, name_vi, slug) VALUES
  (gen_random_uuid(), 'Orders', 'Đơn hàng', 'orders'),
  (gen_random_uuid(), 'Menu', 'Thực đơn', 'menu')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  orders_obj_id uuid;
  menu_obj_id uuid;
BEGIN
  SELECT id INTO orders_obj_id FROM objects WHERE slug = 'orders';
  SELECT id INTO menu_obj_id FROM objects WHERE slug = 'menu';

  INSERT INTO permissions (id, name_en, name_vi, slug, object_id) VALUES
    (gen_random_uuid(), 'View Orders', 'Xem đơn hàng', 'orders.view', orders_obj_id),
    (gen_random_uuid(), 'Create Order', 'Tạo đơn hàng', 'orders.create', orders_obj_id),
    (gen_random_uuid(), 'Edit Order', 'Sửa đơn hàng', 'orders.edit', orders_obj_id),
    (gen_random_uuid(), 'Delete Order', 'Xóa đơn hàng', 'orders.delete', orders_obj_id),
    (gen_random_uuid(), 'Approve Order', 'Phê duyệt đơn hàng', 'orders.approve', orders_obj_id),
    (gen_random_uuid(), 'View Menu', 'Xem thực đơn', 'menu.view', menu_obj_id),
    (gen_random_uuid(), 'Edit Menu', 'Sửa thực đơn', 'menu.edit', menu_obj_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM roles r, permissions p
  WHERE r.slug = 'admin' AND (p.slug LIKE 'orders.%' OR p.slug LIKE 'menu.%')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- 7. SEED MENU CATEGORIES
-- ============================================================
INSERT INTO menu_categories (name_vi, name_en, slug, sort_order) VALUES
  ('Combo Bò', 'Beef Combos', 'combo_bo', 1),
  ('Combo HDE', 'HDE Combos', 'combo_hde', 2),
  ('À La Carte', 'À La Carte', 'alacard', 3);

-- ============================================================
-- 8. SEED MENU ITEMS (107 items from 2025 pricing template)
-- Prices in VND inclusive of 8% VAT
-- ============================================================

-- Combo Bò (21 items)
DO $$
DECLARE cat_id uuid;
BEGIN
  SELECT id INTO cat_id FROM menu_categories WHERE slug = 'combo_bo';

  INSERT INTO menu_items (category_id, item_code, pos_name, name_vi, name_en, price, components, sort_order) VALUES
    (cat_id, 'CB-001', 'COMBO BO 1', 'Combo Bò 1 (5 người)', 'Beef Combo 1 (5 pax)', 399000, '1x Burger Bò + 1x Gà Rán (2pc) + 1x Khoai Tây Lớn + 2x Pepsi', 1),
    (cat_id, 'CB-002', 'COMBO BO 2', 'Combo Bò 2 (8 người)', 'Beef Combo 2 (8 pax)', 599000, '2x Burger Bò + 1x Gà Rán (4pc) + 2x Khoai Tây Lớn + 4x Pepsi', 2),
    (cat_id, 'CB-003', 'COMBO BO 3', 'Combo Bò 3 (10 người)', 'Beef Combo 3 (10 pax)', 799000, '2x Burger Bò + 2x Gà Rán (4pc) + 2x Khoai Tây Lớn + 5x Pepsi', 3),
    (cat_id, 'CB-004', 'COMBO BO 4', 'Combo Bò 4 (15 người)', 'Beef Combo 4 (15 pax)', 1199000, '3x Burger Bò + 3x Gà Rán (4pc) + 3x Khoai Tây Lớn + 8x Pepsi', 4),
    (cat_id, 'CB-005', 'COMBO BO 5', 'Combo Bò 5 (20 người)', 'Beef Combo 5 (20 pax)', 1599000, '4x Burger Bò + 4x Gà Rán (4pc) + 4x Khoai Tây Lớn + 10x Pepsi', 5),
    (cat_id, 'CB-006', 'COMBO BO 6', 'Combo Bò 6 (25 người)', 'Beef Combo 6 (25 pax)', 1999000, '5x Burger Bò + 5x Gà Rán (4pc) + 5x Khoai Tây Lớn + 13x Pepsi', 6),
    (cat_id, 'CB-007', 'COMBO BO 7', 'Combo Bò 7 (30 người)', 'Beef Combo 7 (30 pax)', 2399000, '6x Burger Bò + 6x Gà Rán (4pc) + 6x Khoai Tây Lớn + 15x Pepsi', 7),
    (cat_id, 'CB-008', 'COMBO BO PREMIUM 1', 'Combo Bò Premium 1 (5 người)', 'Beef Premium Combo 1 (5 pax)', 499000, '1x Burger Bò Đặc Biệt + 1x Gà Rán (2pc) + 1x Khoai Tây Xoắn + 2x Pepsi', 8),
    (cat_id, 'CB-009', 'COMBO BO PREMIUM 2', 'Combo Bò Premium 2 (10 người)', 'Beef Premium Combo 2 (10 pax)', 949000, '2x Burger Bò Đặc Biệt + 2x Gà Rán (4pc) + 2x Khoai Tây Xoắn + 5x Pepsi', 9),
    (cat_id, 'CB-010', 'COMBO BO PREMIUM 3', 'Combo Bò Premium 3 (15 người)', 'Beef Premium Combo 3 (15 pax)', 1399000, '3x Burger Bò Đặc Biệt + 3x Gà Rán (4pc) + 3x Khoai Tây Xoắn + 8x Pepsi', 10),
    (cat_id, 'CB-011', 'COMBO BO PREMIUM 4', 'Combo Bò Premium 4 (20 người)', 'Beef Premium Combo 4 (20 pax)', 1849000, '4x Burger Bò Đặc Biệt + 4x Gà Rán (4pc) + 4x Khoai Tây Xoắn + 10x Pepsi', 11),
    (cat_id, 'CB-012', 'COMBO BO KIDS 1', 'Combo Bò Trẻ Em 1 (5 trẻ)', 'Beef Kids Combo 1 (5 kids)', 349000, '5x Mini Burger Bò + 5x Khoai Tây Nhỏ + 5x Nước Cam', 12),
    (cat_id, 'CB-013', 'COMBO BO KIDS 2', 'Combo Bò Trẻ Em 2 (10 trẻ)', 'Beef Kids Combo 2 (10 kids)', 649000, '10x Mini Burger Bò + 10x Khoai Tây Nhỏ + 10x Nước Cam', 13),
    (cat_id, 'CB-014', 'COMBO BO KIDS 3', 'Combo Bò Trẻ Em 3 (15 trẻ)', 'Beef Kids Combo 3 (15 kids)', 949000, '15x Mini Burger Bò + 15x Khoai Tây Nhỏ + 15x Nước Cam', 14),
    (cat_id, 'CB-015', 'COMBO BO PARTY S', 'Combo Bò Tiệc S (10 người)', 'Beef Party Combo S (10 pax)', 899000, '2x Burger Bò + 1x Gà Rán (6pc) + 2x Khoai Tây Lớn + 1x Salad Trộn + 5x Pepsi', 15),
    (cat_id, 'CB-016', 'COMBO BO PARTY M', 'Combo Bò Tiệc M (20 người)', 'Beef Party Combo M (20 pax)', 1749000, '4x Burger Bò + 2x Gà Rán (6pc) + 4x Khoai Tây Lớn + 2x Salad Trộn + 10x Pepsi', 16),
    (cat_id, 'CB-017', 'COMBO BO PARTY L', 'Combo Bò Tiệc L (30 người)', 'Beef Party Combo L (30 pax)', 2599000, '6x Burger Bò + 3x Gà Rán (6pc) + 6x Khoai Tây Lớn + 3x Salad Trộn + 15x Pepsi', 17),
    (cat_id, 'CB-018', 'COMBO BO PARTY XL', 'Combo Bò Tiệc XL (50 người)', 'Beef Party Combo XL (50 pax)', 4199000, '10x Burger Bò + 5x Gà Rán (6pc) + 10x Khoai Tây Lớn + 5x Salad Trộn + 25x Pepsi', 18),
    (cat_id, 'CB-019', 'COMBO BO CORPORATE', 'Combo Bò Doanh Nghiệp (40 người)', 'Beef Corporate Combo (40 pax)', 3499000, '8x Burger Bò + 4x Gà Rán (6pc) + 8x Khoai Tây Lớn + 4x Salad Trộn + 20x Pepsi', 19),
    (cat_id, 'CB-020', 'COMBO BO SCHOOL', 'Combo Bò Trường Học (50 trẻ)', 'Beef School Combo (50 kids)', 3999000, '50x Mini Burger Bò + 50x Khoai Tây Nhỏ + 50x Nước Cam + 50x Bánh Kem Nhỏ', 20),
    (cat_id, 'CB-021', 'COMBO BO MEGA', 'Combo Bò Mega (100 người)', 'Beef Mega Combo (100 pax)', 7999000, '20x Burger Bò + 10x Gà Rán (6pc) + 20x Khoai Tây Lớn + 10x Salad Trộn + 50x Pepsi', 21);
END $$;

-- Combo HDE (24 items)
DO $$
DECLARE cat_id uuid;
BEGIN
  SELECT id INTO cat_id FROM menu_categories WHERE slug = 'combo_hde';

  INSERT INTO menu_items (category_id, item_code, pos_name, name_vi, name_en, price, components, sort_order) VALUES
    (cat_id, 'CH-001', 'COMBO HDE 1', 'Combo HDE 1 (5 người)', 'HDE Combo 1 (5 pax)', 449000, '1x Gà Rán (4pc) + 1x Cơm Gà + 1x Khoai Tây Lớn + 2x Pepsi', 1),
    (cat_id, 'CH-002', 'COMBO HDE 2', 'Combo HDE 2 (8 người)', 'HDE Combo 2 (8 pax)', 699000, '2x Gà Rán (4pc) + 1x Cơm Gà (2) + 2x Khoai Tây Lớn + 4x Pepsi', 2),
    (cat_id, 'CH-003', 'COMBO HDE 3', 'Combo HDE 3 (10 người)', 'HDE Combo 3 (10 pax)', 899000, '2x Gà Rán (6pc) + 2x Cơm Gà + 2x Khoai Tây Lớn + 5x Pepsi', 3),
    (cat_id, 'CH-004', 'COMBO HDE 4', 'Combo HDE 4 (15 người)', 'HDE Combo 4 (15 pax)', 1299000, '3x Gà Rán (6pc) + 3x Cơm Gà + 3x Khoai Tây Lớn + 8x Pepsi', 4),
    (cat_id, 'CH-005', 'COMBO HDE 5', 'Combo HDE 5 (20 người)', 'HDE Combo 5 (20 pax)', 1699000, '4x Gà Rán (6pc) + 4x Cơm Gà + 4x Khoai Tây Lớn + 10x Pepsi', 5),
    (cat_id, 'CH-006', 'COMBO HDE 6', 'Combo HDE 6 (25 người)', 'HDE Combo 6 (25 pax)', 2099000, '5x Gà Rán (6pc) + 5x Cơm Gà + 5x Khoai Tây Lớn + 13x Pepsi', 6),
    (cat_id, 'CH-007', 'COMBO HDE 7', 'Combo HDE 7 (30 người)', 'HDE Combo 7 (30 pax)', 2499000, '6x Gà Rán (6pc) + 6x Cơm Gà + 6x Khoai Tây Lớn + 15x Pepsi', 7),
    (cat_id, 'CH-008', 'COMBO HDE SPICY 1', 'Combo HDE Cay 1 (5 người)', 'Spicy HDE Combo 1 (5 pax)', 479000, '1x Gà Rán Cay (4pc) + 1x Cơm Gà Cay + 1x Khoai Tây Lớn + 2x Pepsi', 8),
    (cat_id, 'CH-009', 'COMBO HDE SPICY 2', 'Combo HDE Cay 2 (10 người)', 'Spicy HDE Combo 2 (10 pax)', 929000, '2x Gà Rán Cay (6pc) + 2x Cơm Gà Cay + 2x Khoai Tây Lớn + 5x Pepsi', 9),
    (cat_id, 'CH-010', 'COMBO HDE SPICY 3', 'Combo HDE Cay 3 (15 người)', 'Spicy HDE Combo 3 (15 pax)', 1349000, '3x Gà Rán Cay (6pc) + 3x Cơm Gà Cay + 3x Khoai Tây Lớn + 8x Pepsi', 10),
    (cat_id, 'CH-011', 'COMBO HDE SPICY 4', 'Combo HDE Cay 4 (20 người)', 'Spicy HDE Combo 4 (20 pax)', 1749000, '4x Gà Rán Cay (6pc) + 4x Cơm Gà Cay + 4x Khoai Tây Lớn + 10x Pepsi', 11),
    (cat_id, 'CH-012', 'COMBO HDE WINGS 1', 'Combo Cánh Gà 1 (5 người)', 'Wings Combo 1 (5 pax)', 399000, '1x Cánh Gà (10pc) + 1x Khoai Tây Lớn + 2x Pepsi', 12),
    (cat_id, 'CH-013', 'COMBO HDE WINGS 2', 'Combo Cánh Gà 2 (10 người)', 'Wings Combo 2 (10 pax)', 749000, '2x Cánh Gà (10pc) + 2x Khoai Tây Lớn + 5x Pepsi', 13),
    (cat_id, 'CH-014', 'COMBO HDE WINGS 3', 'Combo Cánh Gà 3 (20 người)', 'Wings Combo 3 (20 pax)', 1449000, '4x Cánh Gà (10pc) + 4x Khoai Tây Lớn + 10x Pepsi', 14),
    (cat_id, 'CH-015', 'COMBO HDE PARTY S', 'Combo HDE Tiệc S (10 người)', 'HDE Party Combo S (10 pax)', 949000, '1x Gà Rán (6pc) + 1x Gà Rán Cay (6pc) + 2x Cơm Gà + 2x Khoai Tây Lớn + 5x Pepsi', 15),
    (cat_id, 'CH-016', 'COMBO HDE PARTY M', 'Combo HDE Tiệc M (20 người)', 'HDE Party Combo M (20 pax)', 1849000, '2x Gà Rán (6pc) + 2x Gà Rán Cay (6pc) + 4x Cơm Gà + 4x Khoai Tây Lớn + 10x Pepsi', 16),
    (cat_id, 'CH-017', 'COMBO HDE PARTY L', 'Combo HDE Tiệc L (30 người)', 'HDE Party Combo L (30 pax)', 2749000, '3x Gà Rán (6pc) + 3x Gà Rán Cay (6pc) + 6x Cơm Gà + 6x Khoai Tây Lớn + 15x Pepsi', 17),
    (cat_id, 'CH-018', 'COMBO HDE PARTY XL', 'Combo HDE Tiệc XL (50 người)', 'HDE Party Combo XL (50 pax)', 4499000, '5x Gà Rán (6pc) + 5x Gà Rán Cay (6pc) + 10x Cơm Gà + 10x Khoai Tây Lớn + 25x Pepsi', 18),
    (cat_id, 'CH-019', 'COMBO HDE CORPORATE', 'Combo HDE Doanh Nghiệp (40 người)', 'HDE Corporate Combo (40 pax)', 3699000, '4x Gà Rán (6pc) + 4x Gà Rán Cay (6pc) + 8x Cơm Gà + 8x Khoai Tây Lớn + 20x Pepsi', 19),
    (cat_id, 'CH-020', 'COMBO HDE SCHOOL', 'Combo HDE Trường Học (50 trẻ)', 'HDE School Combo (50 kids)', 3499000, '50x Gà Rán (1pc) + 50x Khoai Tây Nhỏ + 50x Nước Cam', 20),
    (cat_id, 'CH-021', 'COMBO HDE BIRTHDAY S', 'Combo Sinh Nhật S (10 trẻ)', 'Birthday Combo S (10 kids)', 1099000, '10x Gà Rán (1pc) + 10x Khoai Tây Nhỏ + 10x Nước Cam + 1x Bánh Sinh Nhật', 21),
    (cat_id, 'CH-022', 'COMBO HDE BIRTHDAY M', 'Combo Sinh Nhật M (20 trẻ)', 'Birthday Combo M (20 kids)', 1999000, '20x Gà Rán (1pc) + 20x Khoai Tây Nhỏ + 20x Nước Cam + 1x Bánh Sinh Nhật Lớn', 22),
    (cat_id, 'CH-023', 'COMBO HDE BIRTHDAY L', 'Combo Sinh Nhật L (30 trẻ)', 'Birthday Combo L (30 kids)', 2899000, '30x Gà Rán (1pc) + 30x Khoai Tây Nhỏ + 30x Nước Cam + 1x Bánh Sinh Nhật Lớn + 30x Nón Tiệc', 23),
    (cat_id, 'CH-024', 'COMBO HDE MEGA', 'Combo HDE Mega (100 người)', 'HDE Mega Combo (100 pax)', 8499000, '10x Gà Rán (6pc) + 10x Gà Rán Cay (6pc) + 20x Cơm Gà + 20x Khoai Tây Lớn + 50x Pepsi', 24);
END $$;

-- À La Carte (62 items)
DO $$
DECLARE cat_id uuid;
BEGIN
  SELECT id INTO cat_id FROM menu_categories WHERE slug = 'alacard';

  INSERT INTO menu_items (category_id, item_code, pos_name, name_vi, name_en, price, components, sort_order) VALUES
    -- Gà Rán (Fried Chicken) - 10 items
    (cat_id, 'AL-001', 'GA RAN 1PC', 'Gà Rán 1 Miếng', 'Fried Chicken 1pc', 35000, NULL, 1),
    (cat_id, 'AL-002', 'GA RAN 2PC', 'Gà Rán 2 Miếng', 'Fried Chicken 2pc', 65000, NULL, 2),
    (cat_id, 'AL-003', 'GA RAN 4PC', 'Gà Rán 4 Miếng', 'Fried Chicken 4pc', 125000, NULL, 3),
    (cat_id, 'AL-004', 'GA RAN 6PC', 'Gà Rán 6 Miếng', 'Fried Chicken 6pc', 179000, NULL, 4),
    (cat_id, 'AL-005', 'GA RAN 9PC', 'Gà Rán 9 Miếng', 'Fried Chicken 9pc', 259000, NULL, 5),
    (cat_id, 'AL-006', 'GA RAN 12PC', 'Gà Rán 12 Miếng', 'Fried Chicken 12pc', 339000, NULL, 6),
    (cat_id, 'AL-007', 'GA RAN CAY 1PC', 'Gà Rán Cay 1 Miếng', 'Spicy Fried Chicken 1pc', 39000, NULL, 7),
    (cat_id, 'AL-008', 'GA RAN CAY 4PC', 'Gà Rán Cay 4 Miếng', 'Spicy Fried Chicken 4pc', 139000, NULL, 8),
    (cat_id, 'AL-009', 'GA RAN CAY 6PC', 'Gà Rán Cay 6 Miếng', 'Spicy Fried Chicken 6pc', 199000, NULL, 9),
    (cat_id, 'AL-010', 'GA RAN CAY 9PC', 'Gà Rán Cay 9 Miếng', 'Spicy Fried Chicken 9pc', 279000, NULL, 10),
    -- Cánh Gà (Wings) - 5 items
    (cat_id, 'AL-011', 'CANH GA 5PC', 'Cánh Gà 5 Miếng', 'Chicken Wings 5pc', 79000, NULL, 11),
    (cat_id, 'AL-012', 'CANH GA 10PC', 'Cánh Gà 10 Miếng', 'Chicken Wings 10pc', 149000, NULL, 12),
    (cat_id, 'AL-013', 'CANH GA 20PC', 'Cánh Gà 20 Miếng', 'Chicken Wings 20pc', 279000, NULL, 13),
    (cat_id, 'AL-014', 'CANH GA CAY 5PC', 'Cánh Gà Cay 5 Miếng', 'Spicy Wings 5pc', 85000, NULL, 14),
    (cat_id, 'AL-015', 'CANH GA CAY 10PC', 'Cánh Gà Cay 10 Miếng', 'Spicy Wings 10pc', 159000, NULL, 15),
    -- Burger & Wrap - 8 items
    (cat_id, 'AL-016', 'BURGER BO', 'Burger Bò', 'Beef Burger', 59000, NULL, 16),
    (cat_id, 'AL-017', 'BURGER BO DB', 'Burger Bò Đặc Biệt', 'Premium Beef Burger', 79000, NULL, 17),
    (cat_id, 'AL-018', 'BURGER GA', 'Burger Gà', 'Chicken Burger', 49000, NULL, 18),
    (cat_id, 'AL-019', 'BURGER GA CAY', 'Burger Gà Cay', 'Spicy Chicken Burger', 55000, NULL, 19),
    (cat_id, 'AL-020', 'BURGER GA TERIYAKI', 'Burger Gà Teriyaki', 'Teriyaki Chicken Burger', 65000, NULL, 20),
    (cat_id, 'AL-021', 'WRAP GA', 'Cuốn Gà', 'Chicken Wrap', 49000, NULL, 21),
    (cat_id, 'AL-022', 'WRAP GA CAY', 'Cuốn Gà Cay', 'Spicy Chicken Wrap', 55000, NULL, 22),
    (cat_id, 'AL-023', 'MINI BURGER BO', 'Mini Burger Bò', 'Mini Beef Burger', 35000, NULL, 23),
    -- Cơm (Rice) - 6 items
    (cat_id, 'AL-024', 'COM GA', 'Cơm Gà', 'Chicken Rice', 49000, NULL, 24),
    (cat_id, 'AL-025', 'COM GA CAY', 'Cơm Gà Cay', 'Spicy Chicken Rice', 55000, NULL, 25),
    (cat_id, 'AL-026', 'COM GA TERIYAKI', 'Cơm Gà Teriyaki', 'Teriyaki Chicken Rice', 59000, NULL, 26),
    (cat_id, 'AL-027', 'COM GA QUAY', 'Cơm Gà Quay', 'Roasted Chicken Rice', 59000, NULL, 27),
    (cat_id, 'AL-028', 'COM TRON GA', 'Cơm Trộn Gà', 'Mixed Chicken Rice Bowl', 65000, NULL, 28),
    (cat_id, 'AL-029', 'COM TRON BO', 'Cơm Trộn Bò', 'Mixed Beef Rice Bowl', 69000, NULL, 29),
    -- Mì / Phở (Noodles) - 4 items
    (cat_id, 'AL-030', 'MI GA', 'Mì Gà', 'Chicken Noodles', 49000, NULL, 30),
    (cat_id, 'AL-031', 'MI GA CAY', 'Mì Gà Cay', 'Spicy Chicken Noodles', 55000, NULL, 31),
    (cat_id, 'AL-032', 'MI Y GA', 'Mì Ý Gà', 'Chicken Spaghetti', 59000, NULL, 32),
    (cat_id, 'AL-033', 'MI Y BO', 'Mì Ý Bò', 'Beef Spaghetti', 65000, NULL, 33),
    -- Khoai Tây (Fries) - 5 items
    (cat_id, 'AL-034', 'KHOAI NHO', 'Khoai Tây Nhỏ', 'Small Fries', 19000, NULL, 34),
    (cat_id, 'AL-035', 'KHOAI VUA', 'Khoai Tây Vừa', 'Medium Fries', 29000, NULL, 35),
    (cat_id, 'AL-036', 'KHOAI LON', 'Khoai Tây Lớn', 'Large Fries', 39000, NULL, 36),
    (cat_id, 'AL-037', 'KHOAI XOAN', 'Khoai Tây Xoắn', 'Curly Fries', 35000, NULL, 37),
    (cat_id, 'AL-038', 'KHOAI PHOMAI', 'Khoai Tây Phô Mai', 'Cheese Fries', 45000, NULL, 38),
    -- Món Phụ (Sides) - 8 items
    (cat_id, 'AL-039', 'SALAD TRON', 'Salad Trộn', 'Mixed Salad', 39000, NULL, 39),
    (cat_id, 'AL-040', 'SALAD GA', 'Salad Gà', 'Chicken Salad', 49000, NULL, 40),
    (cat_id, 'AL-041', 'BAP NGO', 'Bắp Ngô', 'Corn on the Cob', 25000, NULL, 41),
    (cat_id, 'AL-042', 'COLESLAW', 'Rau Trộn Coleslaw', 'Coleslaw', 19000, NULL, 42),
    (cat_id, 'AL-043', 'SUP GA', 'Súp Gà', 'Chicken Soup', 25000, NULL, 43),
    (cat_id, 'AL-044', 'SUP NGO', 'Súp Ngô', 'Corn Soup', 19000, NULL, 44),
    (cat_id, 'AL-045', 'BANH MI GA', 'Bánh Mì Gà', 'Chicken Bread Roll', 29000, NULL, 45),
    (cat_id, 'AL-046', 'NUGGETS 6PC', 'Gà Viên 6 Miếng', 'Chicken Nuggets 6pc', 55000, NULL, 46),
    -- Nước Uống (Beverages) - 10 items
    (cat_id, 'AL-047', 'PEPSI', 'Pepsi', 'Pepsi', 19000, NULL, 47),
    (cat_id, 'AL-048', 'PEPSI LON', 'Pepsi Lon', 'Pepsi Can', 15000, NULL, 48),
    (cat_id, 'AL-049', '7UP', '7Up', '7Up', 19000, NULL, 49),
    (cat_id, 'AL-050', 'MIRINDA', 'Mirinda', 'Mirinda', 19000, NULL, 50),
    (cat_id, 'AL-051', 'NUOC CAM', 'Nước Cam', 'Orange Juice', 25000, NULL, 51),
    (cat_id, 'AL-052', 'NUOC CHANH', 'Nước Chanh', 'Lemonade', 25000, NULL, 52),
    (cat_id, 'AL-053', 'TRA DAO', 'Trà Đào', 'Peach Tea', 29000, NULL, 53),
    (cat_id, 'AL-054', 'TRA CHANH', 'Trà Chanh', 'Lemon Tea', 25000, NULL, 54),
    (cat_id, 'AL-055', 'NUOC SUOI', 'Nước Suối', 'Mineral Water', 10000, NULL, 55),
    (cat_id, 'AL-056', 'NUOC SUOI LON', 'Nước Suối Chai Lớn (1.5L)', 'Large Water (1.5L)', 19000, NULL, 56),
    -- Tráng Miệng (Desserts) - 6 items
    (cat_id, 'AL-057', 'KEM SUNDAE', 'Kem Sundae', 'Sundae Ice Cream', 19000, NULL, 57),
    (cat_id, 'AL-058', 'KEM CONE', 'Kem Ốc Quế', 'Ice Cream Cone', 10000, NULL, 58),
    (cat_id, 'AL-059', 'BANH KEM NHO', 'Bánh Kem Nhỏ', 'Small Cake', 15000, NULL, 59),
    (cat_id, 'AL-060', 'BANH SINH NHAT', 'Bánh Sinh Nhật', 'Birthday Cake', 249000, NULL, 60),
    (cat_id, 'AL-061', 'BANH SINH NHAT LON', 'Bánh Sinh Nhật Lớn', 'Large Birthday Cake', 399000, NULL, 61),
    (cat_id, 'AL-062', 'NON TIEC', 'Nón Tiệc (10 cái)', 'Party Hats (10pc)', 49000, NULL, 62);
END $$;
