-- Sprint 11: Seed test data for all modules
-- Run AFTER all schema migrations. Idempotent — skips if data already exists.

DO $$
DECLARE
  v_admin_id uuid;
  v_store1 text;
  v_store2 text;
  v_store3 text;
  v_lead1 uuid;
  v_lead2 uuid;
  v_lead3 uuid;
  v_lead4 uuid;
  v_lead5 uuid;
  v_cust1 uuid;
  v_cust2 uuid;
  v_cust3 uuid;
  v_cust4 uuid;
  v_org1 uuid;
  v_org2 uuid;
  v_opp1 uuid;
  v_opp2 uuid;
  v_opp3 uuid;
  v_cat1 uuid;
  v_item1 uuid;
  v_item2 uuid;
  v_order1 uuid;
  v_order2 uuid;
  v_order3 uuid;
BEGIN
  -- Get admin user (must exist from auth setup)
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@bigorders.vn' LIMIT 1;
  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'No admin user found — skipping seed';
    RETURN;
  END IF;

  -- Skip if we already have seed data
  IF EXISTS (SELECT 1 FROM leads WHERE notes = 'seed-data-sprint11') THEN
    RAISE NOTICE 'Seed data already exists — skipping';
    RETURN;
  END IF;

  -- Pick 3 stores
  SELECT id INTO v_store1 FROM stores WHERE active = true ORDER BY name LIMIT 1;
  SELECT id INTO v_store2 FROM stores WHERE active = true ORDER BY name OFFSET 1 LIMIT 1;
  SELECT id INTO v_store3 FROM stores WHERE active = true ORDER BY name OFFSET 2 LIMIT 1;

  -- ===== LEADS (10) =====
  INSERT INTO leads (full_name, phone, email, lead_type, lead_source, stage, store_id, assigned_to, city, district, ward, notes, created_at)
  VALUES
    ('Nguyễn Văn An', '+84901234567', 'an.nguyen@example.com', 'individual', 'manual', 'new', v_store1, v_admin_id, 'Hồ Chí Minh', 'Quận 1', 'Bến Nghé', 'seed-data-sprint11', now() - interval '30 days'),
    ('Trần Thị Bình', '+84912345678', 'binh.tran@example.com', 'parent', 'event', 'contacted', v_store1, v_admin_id, 'Hồ Chí Minh', 'Quận 7', 'Tân Phú', 'seed-data-sprint11', now() - interval '25 days'),
    ('Lê Hoàng Cường', '+84923456789', 'cuong.le@example.com', 'company', 'campaign', 'qualified', v_store2, v_admin_id, 'Hà Nội', 'Hoàn Kiếm', 'Hàng Bạc', 'seed-data-sprint11', now() - interval '20 days');

  SELECT id INTO v_lead1 FROM leads WHERE full_name = 'Nguyễn Văn An' AND notes = 'seed-data-sprint11';
  SELECT id INTO v_lead2 FROM leads WHERE full_name = 'Trần Thị Bình' AND notes = 'seed-data-sprint11';
  SELECT id INTO v_lead3 FROM leads WHERE full_name = 'Lê Hoàng Cường' AND notes = 'seed-data-sprint11';

  INSERT INTO leads (id, full_name, phone, email, lead_type, lead_source, stage, store_id, assigned_to, city, district, notes, created_at)
  VALUES
    (gen_random_uuid(), 'Phạm Minh Đức', '+84934567890', 'duc.pham@example.com', 'school', 'google_maps', 'qualified', v_store2, v_admin_id, 'Đà Nẵng', 'Hải Châu', 'seed-data-sprint11', now() - interval '15 days'),
    (gen_random_uuid(), 'Hoàng Thị Em', '+84945678901', null, 'individual', 'web_app', 'converted', v_store1, v_admin_id, 'Hồ Chí Minh', 'Quận 3', 'seed-data-sprint11', now() - interval '10 days'),
    (gen_random_uuid(), 'Võ Quốc Phong', '+84956789012', 'phong.vo@example.com', 'company', 'platform', 'new', v_store3, v_admin_id, 'Cần Thơ', 'Ninh Kiều', 'seed-data-sprint11', now() - interval '5 days'),
    (gen_random_uuid(), 'Đặng Ngọc Giang', '+84967890123', null, 'parent', 'manual', 'contacted', v_store1, v_admin_id, 'Hồ Chí Minh', 'Thủ Đức', 'seed-data-sprint11', now() - interval '3 days'),
    (gen_random_uuid(), 'Bùi Thanh Hà', '+84978901234', 'ha.bui@example.com', 'individual', 'oms_sync', 'lost', v_store2, v_admin_id, 'Hà Nội', 'Cầu Giấy', 'seed-data-sprint11', now() - interval '40 days'),
    (gen_random_uuid(), 'Ngô Văn Khoa', '+84989012345', 'khoa.ngo@example.com', 'school', 'event', 'new', v_store3, v_admin_id, 'Hải Phòng', 'Hồng Bàng', 'seed-data-sprint11', now() - interval '2 days'),
    (gen_random_uuid(), 'Lý Thị Lan', '+84990123456', 'lan.ly@example.com', 'individual', 'campaign', 'qualified', v_store1, v_admin_id, 'Hồ Chí Minh', 'Bình Thạnh', 'seed-data-sprint11', now() - interval '1 day');

  SELECT id INTO v_lead4 FROM leads WHERE full_name = 'Phạm Minh Đức' AND notes = 'seed-data-sprint11';
  SELECT id INTO v_lead5 FROM leads WHERE full_name = 'Hoàng Thị Em' AND notes = 'seed-data-sprint11';

  -- ===== INDIVIDUAL CUSTOMERS (6) =====
  INSERT INTO individual_customers (id, full_name, phone, email, contact_type, store_id, city, district, ward, total_revenue, order_count, consent_given, created_at)
  VALUES
    (gen_random_uuid(), 'Nguyễn Thị Mai', '+84901111111', 'mai.nguyen@example.com', 'parent', v_store1, 'Hồ Chí Minh', 'Quận 1', 'Bến Nghé', 15000000, 3, true, now() - interval '60 days'),
    (gen_random_uuid(), 'Trần Văn Nam', '+84902222222', 'nam.tran@example.com', 'employee', v_store1, 'Hồ Chí Minh', 'Quận 7', 'Tân Phú', 8500000, 2, true, now() - interval '45 days'),
    (gen_random_uuid(), 'Lê Thị Oanh', '+84903333333', 'oanh.le@example.com', 'teacher', v_store2, 'Hà Nội', 'Hoàn Kiếm', 'Hàng Bạc', 22000000, 5, true, now() - interval '90 days'),
    (gen_random_uuid(), 'Phạm Quốc Phú', '+84904444444', 'phu.pham@example.com', 'event_organizer', v_store2, 'Đà Nẵng', 'Hải Châu', null, 45000000, 8, true, now() - interval '120 days'),
    (gen_random_uuid(), 'Hoàng Văn Quang', '+84905555555', null, 'other', v_store3, 'Cần Thơ', 'Ninh Kiều', null, 3000000, 1, false, now() - interval '15 days'),
    (gen_random_uuid(), 'Võ Thị Rằm', '+84906666666', 'ram.vo@example.com', 'parent', v_store1, 'Hồ Chí Minh', 'Bình Thạnh', null, 0, 0, true, now() - interval '5 days');

  SELECT id INTO v_cust1 FROM individual_customers WHERE phone = '+84901111111' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_cust2 FROM individual_customers WHERE phone = '+84902222222' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_cust3 FROM individual_customers WHERE phone = '+84903333333' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_cust4 FROM individual_customers WHERE phone = '+84904444444' AND deleted_at IS NULL LIMIT 1;

  -- ===== ORGANIZATIONS (3) =====
  INSERT INTO organizations (id, name_vi, name_en, organization_type, size, city, district, store_id, total_revenue, order_count, created_at)
  VALUES
    (gen_random_uuid(), 'Công ty TNHH ABC', 'ABC Company Ltd', 'company', 'medium', 'Hồ Chí Minh', 'Quận 1', v_store1, 35000000, 6, now() - interval '90 days'),
    (gen_random_uuid(), 'Trường Tiểu học Lê Lợi', 'Le Loi Primary School', 'school', 'large', 'Hà Nội', 'Hoàn Kiếm', v_store2, 18000000, 4, now() - interval '60 days'),
    (gen_random_uuid(), 'Khách sạn Grand Sài Gòn', 'Grand Saigon Hotel', 'hotel', 'large', 'Hồ Chí Minh', 'Quận 1', v_store1, 52000000, 10, now() - interval '180 days');

  SELECT id INTO v_org1 FROM organizations WHERE name_vi = 'Công ty TNHH ABC' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_org2 FROM organizations WHERE name_vi = 'Trường Tiểu học Lê Lợi' AND deleted_at IS NULL LIMIT 1;

  -- Link customers to orgs
  INSERT INTO customer_org_links (individual_id, organization_id, role_title, is_primary_contact, active)
  VALUES
    (v_cust2, v_org1, 'HR Manager', true, true),
    (v_cust3, v_org2, 'Teacher', true, true),
    (v_cust4, v_org1, 'Event Coordinator', false, true);

  -- ===== OPPORTUNITIES (6) =====
  INSERT INTO opportunities (id, title, lead_id, customer_id, stage, expected_value, expected_date, assigned_to, notes, created_at)
  VALUES
    (gen_random_uuid(), 'Birthday Party 50 guests', v_lead3, v_cust1, 'new', 12000000, (now() + interval '14 days')::date, v_admin_id, 'Large birthday event', now() - interval '5 days'),
    (gen_random_uuid(), 'School Year-End Celebration', v_lead4, v_cust3, 'consulting', 25000000, (now() + interval '30 days')::date, v_admin_id, 'Annual school event', now() - interval '10 days'),
    (gen_random_uuid(), 'Corporate Team Building Q2', null, v_cust2, 'quoted', 18000000, (now() + interval '21 days')::date, v_admin_id, 'Company outing lunch', now() - interval '8 days'),
    (gen_random_uuid(), 'Hotel Guest Welcome Package', null, v_cust4, 'negotiating', 35000000, (now() + interval '7 days')::date, v_admin_id, 'Monthly catering contract', now() - interval '15 days'),
    (gen_random_uuid(), 'Children''s Day Event', v_lead5, v_cust1, 'won', 8000000, (now() - interval '5 days')::date, v_admin_id, null, now() - interval '30 days'),
    (gen_random_uuid(), 'Office Lunch Trial', null, v_cust2, 'lost', 5000000, (now() - interval '10 days')::date, v_admin_id, null, now() - interval '25 days');

  SELECT id INTO v_opp1 FROM opportunities WHERE title = 'Birthday Party 50 guests' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_opp2 FROM opportunities WHERE title = 'Children''s Day Event' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_opp3 FROM opportunities WHERE title = 'Office Lunch Trial' AND deleted_at IS NULL LIMIT 1;

  UPDATE opportunities SET actual_value = 8500000 WHERE id = v_opp2;
  UPDATE opportunities SET lost_reason = 'Price too high compared to competitor' WHERE id = v_opp3;

  -- ===== MENU CATEGORIES + ITEMS (use existing if available) =====
  SELECT id INTO v_cat1 FROM menu_categories WHERE active = true LIMIT 1;
  IF v_cat1 IS NULL THEN
    INSERT INTO menu_categories (id, name_vi, name_en, slug, sort_order, active)
    VALUES (gen_random_uuid(), 'Combo Tiệc', 'Party Combos', 'party-combos', 1, true)
    RETURNING id INTO v_cat1;
  END IF;

  SELECT id INTO v_item1 FROM menu_items WHERE active = true AND category_id = v_cat1 LIMIT 1;
  IF v_item1 IS NULL THEN
    INSERT INTO menu_items (id, category_id, item_code, name_vi, name_en, price, min_quantity, max_quantity, active, sort_order)
    VALUES
      (gen_random_uuid(), v_cat1, 'PC-001', 'Combo Gà Rán 10 Miếng', '10-Piece Fried Chicken Combo', 350000, 1, 100, true, 1),
      (gen_random_uuid(), v_cat1, 'PC-002', 'Combo Burger 10 Phần', '10-Piece Burger Combo', 450000, 1, 100, true, 2);
  END IF;
  SELECT id INTO v_item1 FROM menu_items WHERE item_code = 'PC-001' LIMIT 1;
  SELECT id INTO v_item2 FROM menu_items WHERE item_code = 'PC-002' LIMIT 1;

  -- ===== ORDERS (5) =====
  INSERT INTO orders (id, order_number, customer_id, store_id, contact_name, contact_phone, event_type, scheduled_date, guest_count, subtotal, discount_pct, discount_amount, total_value, status, payment_status, source, assigned_to, created_at)
  VALUES
    (gen_random_uuid(), 'BO-2026-0001', v_cust1, v_store1, 'Nguyễn Thị Mai', '+84901111111', 'birthday', (now() + interval '7 days')::date, 50, 5000000, 10, 500000, 4500000, 'confirmed', 'unpaid', 'crm', v_admin_id, now() - interval '3 days'),
    (gen_random_uuid(), 'BO-2026-0002', v_cust3, v_store2, 'Lê Thị Oanh', '+84903333333', 'school_event', (now() + interval '14 days')::date, 200, 12000000, 5, 600000, 11400000, 'preparing', 'partial', 'crm', v_admin_id, now() - interval '7 days'),
    (gen_random_uuid(), 'BO-2026-0003', v_cust4, v_store2, 'Phạm Quốc Phú', '+84904444444', 'corporate', (now() - interval '5 days')::date, 30, 3500000, 0, 0, 3500000, 'fulfilled', 'paid', 'crm', v_admin_id, now() - interval '15 days'),
    (gen_random_uuid(), 'BO-2026-0004', v_cust2, v_store1, 'Trần Văn Nam', '+84902222222', 'meeting', (now() - interval '10 days')::date, 15, 2000000, 0, 0, 2000000, 'fulfilled', 'paid', 'crm', v_admin_id, now() - interval '20 days'),
    (gen_random_uuid(), 'BO-2026-0005', v_cust1, v_store3, 'Nguyễn Thị Mai', '+84901111111', 'custom', (now() + interval '21 days')::date, 100, 8000000, 15, 1200000, 6800000, 'draft', 'unpaid', 'landing_page', v_admin_id, now() - interval '1 day');

  SELECT id INTO v_order1 FROM orders WHERE order_number = 'BO-2026-0001' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_order2 FROM orders WHERE order_number = 'BO-2026-0002' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_order3 FROM orders WHERE order_number = 'BO-2026-0003' AND deleted_at IS NULL LIMIT 1;

  -- ===== ORDER ITEMS =====
  IF v_item1 IS NOT NULL AND v_item2 IS NOT NULL THEN
    INSERT INTO order_items (order_id, menu_item_id, item_code, name_vi, name_en, quantity, unit_price, line_total)
    VALUES
      (v_order1, v_item1, 'PC-001', 'Combo Gà Rán 10 Miếng', '10-Piece Fried Chicken Combo', 10, 350000, 3500000),
      (v_order1, v_item2, 'PC-002', 'Combo Burger 10 Phần', '10-Piece Burger Combo', 3, 450000, 1350000),
      (v_order2, v_item1, 'PC-001', 'Combo Gà Rán 10 Miếng', '10-Piece Fried Chicken Combo', 20, 350000, 7000000),
      (v_order2, v_item2, 'PC-002', 'Combo Burger 10 Phần', '10-Piece Burger Combo', 10, 450000, 4500000),
      (v_order3, v_item1, 'PC-001', 'Combo Gà Rán 10 Miếng', '10-Piece Fried Chicken Combo', 5, 350000, 1750000),
      (v_order3, v_item2, 'PC-002', 'Combo Burger 10 Phần', '10-Piece Burger Combo', 4, 450000, 1800000);
  END IF;

  -- ===== ACTIVITIES (sample interactions) =====
  INSERT INTO activities (entity_type, entity_id, activity_type, subject, description, created_by, created_at)
  VALUES
    ('lead', v_lead1, 'call', 'Initial contact call', 'Called to discuss birthday party options', v_admin_id, now() - interval '28 days'),
    ('lead', v_lead2, 'email', 'Follow-up email', 'Sent menu and pricing info', v_admin_id, now() - interval '22 days'),
    ('lead', v_lead3, 'meeting', 'Site visit', 'Visited office to discuss catering needs', v_admin_id, now() - interval '18 days'),
    ('customer', v_cust1, 'note', 'VIP customer note', 'Loyal customer — always orders for family events', v_admin_id, now() - interval '10 days'),
    ('customer', v_cust4, 'call', 'Monthly check-in', 'Discussed upcoming hotel events for Q2', v_admin_id, now() - interval '5 days');

  -- ===== RECURRING EVENTS =====
  INSERT INTO recurring_events (customer_id, event_type, event_name, event_date, reminder_days_before, active, created_at)
  VALUES
    (v_cust1, 'birthday', 'Mai''s birthday', '2026-08-15', 14, true, now() - interval '30 days'),
    (v_cust3, 'children_day', 'Children''s Day 2026', '2026-06-01', 30, true, now() - interval '20 days'),
    (v_cust4, 'company_anniversary', 'Hotel Grand Opening Anniversary', '2026-12-20', 45, true, now() - interval '60 days');

  RAISE NOTICE 'Seed data inserted: 10 leads, 6 customers, 3 orgs, 6 opportunities, 5 orders, 5 activities, 3 recurring events';
END $$;
