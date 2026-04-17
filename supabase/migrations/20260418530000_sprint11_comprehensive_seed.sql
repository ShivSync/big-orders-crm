-- Sprint 11: Comprehensive seed data — users, teams, channels, chats, campaigns, activities
-- Idempotent — skips if marker data exists

DO $$
DECLARE
  v_admin_id uuid;
  v_user2_id uuid;
  v_user3_id uuid;
  v_user4_id uuid;
  v_user5_id uuid;
  v_store1 text;
  v_store2 text;
  v_store3 text;
  v_store4 text;
  v_team1 uuid;
  v_team2 uuid;
  v_team3 uuid;
  v_role_rgm uuid;
  v_role_sales uuid;
  v_role_callcenter uuid;
  v_role_area uuid;
  v_cust1 uuid;
  v_cust2 uuid;
  v_cust3 uuid;
  v_lead1 uuid;
  v_lead2 uuid;
  v_camp1 uuid;
BEGIN
  -- Get admin
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@bigorders.vn' LIMIT 1;
  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'No admin user — skipping';
    RETURN;
  END IF;

  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM teams WHERE name = 'HCM Sales Team') THEN
    RAISE NOTICE 'Comprehensive seed already exists — skipping';
    RETURN;
  END IF;

  -- Get stores
  SELECT id INTO v_store1 FROM stores WHERE active = true ORDER BY name LIMIT 1;
  SELECT id INTO v_store2 FROM stores WHERE active = true ORDER BY name OFFSET 5 LIMIT 1;
  SELECT id INTO v_store3 FROM stores WHERE active = true ORDER BY name OFFSET 20 LIMIT 1;
  SELECT id INTO v_store4 FROM stores WHERE active = true ORDER BY name OFFSET 50 LIMIT 1;

  -- Get roles
  SELECT id INTO v_role_rgm FROM roles WHERE slug = 'rgm';
  SELECT id INTO v_role_sales FROM roles WHERE slug = 'sales_manager';
  SELECT id INTO v_role_callcenter FROM roles WHERE slug = 'call_center';
  SELECT id INTO v_role_area FROM roles WHERE slug = 'area_manager';

  -- ===== USERS (4 additional via auth.users + public.users) =====
  -- User 2: Sales Manager
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
  VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
    'sales@bigorders.vn',
    crypt('BigOrders2026!', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(), '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Trần Minh Tuấn"}'::jsonb
  )
  ON CONFLICT (email) DO NOTHING;
  SELECT id INTO v_user2_id FROM auth.users WHERE email = 'sales@bigorders.vn';

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
  VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
    'rgm@bigorders.vn',
    crypt('BigOrders2026!', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(), '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Lê Thị Hương"}'::jsonb
  )
  ON CONFLICT (email) DO NOTHING;
  SELECT id INTO v_user3_id FROM auth.users WHERE email = 'rgm@bigorders.vn';

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
  VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
    'callcenter@bigorders.vn',
    crypt('BigOrders2026!', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(), '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Nguyễn Hoàng Long"}'::jsonb
  )
  ON CONFLICT (email) DO NOTHING;
  SELECT id INTO v_user4_id FROM auth.users WHERE email = 'callcenter@bigorders.vn';

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
  VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
    'area@bigorders.vn',
    crypt('BigOrders2026!', gen_salt('bf')),
    now(), 'authenticated', 'authenticated', now(), now(), '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Phạm Thanh Sơn"}'::jsonb
  )
  ON CONFLICT (email) DO NOTHING;
  SELECT id INTO v_user5_id FROM auth.users WHERE email = 'area@bigorders.vn';

  -- Public users
  INSERT INTO users (id, email, name, phone, status, is_root, region, language_preference)
  VALUES
    (v_user2_id, 'sales@bigorders.vn', 'Trần Minh Tuấn', '+84911000001', 'active', false, 'B', 'vi'),
    (v_user3_id, 'rgm@bigorders.vn', 'Lê Thị Hương', '+84911000002', 'active', false, 'B', 'vi'),
    (v_user4_id, 'callcenter@bigorders.vn', 'Nguyễn Hoàng Long', '+84911000003', 'active', false, 'ALL', 'vi'),
    (v_user5_id, 'area@bigorders.vn', 'Phạm Thanh Sơn', '+84911000004', 'active', false, 'T', 'vi')
  ON CONFLICT (id) DO NOTHING;

  -- Assign roles
  INSERT INTO user_roles (user_id, role_id)
  VALUES
    (v_user2_id, v_role_sales),
    (v_user3_id, v_role_rgm),
    (v_user4_id, v_role_callcenter),
    (v_user5_id, v_role_area)
  ON CONFLICT DO NOTHING;

  -- ===== TEAMS (3) =====
  INSERT INTO teams (id, name, region) VALUES
    (gen_random_uuid(), 'HCM Sales Team', 'B'),
    (gen_random_uuid(), 'Hanoi Sales Team', 'N'),
    (gen_random_uuid(), 'Central Sales Team', 'T');

  SELECT id INTO v_team1 FROM teams WHERE name = 'HCM Sales Team';
  SELECT id INTO v_team2 FROM teams WHERE name = 'Hanoi Sales Team';
  SELECT id INTO v_team3 FROM teams WHERE name = 'Central Sales Team';

  -- Link users to teams
  INSERT INTO user_teams (user_id, team_id)
  VALUES
    (v_admin_id, v_team1),
    (v_user2_id, v_team1),
    (v_user3_id, v_team1),
    (v_user4_id, v_team2),
    (v_user5_id, v_team3)
  ON CONFLICT DO NOTHING;

  -- ===== CHANNEL MESSAGES (8) =====
  -- Get some leads/customers for linking
  SELECT id INTO v_lead1 FROM leads WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1;
  SELECT id INTO v_lead2 FROM leads WHERE deleted_at IS NULL ORDER BY created_at OFFSET 2 LIMIT 1;
  SELECT id INTO v_cust1 FROM individual_customers WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1;
  SELECT id INTO v_cust2 FROM individual_customers WHERE deleted_at IS NULL ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO v_cust3 FROM individual_customers WHERE deleted_at IS NULL ORDER BY created_at OFFSET 2 LIMIT 1;

  INSERT INTO channel_messages (channel, direction, sender_name, sender_phone, lead_id, customer_id, content, metadata, read, created_at)
  VALUES
    ('zalo', 'inbound', 'Nguyễn Văn An', '+84901234567', v_lead1, null,
     'Xin chào, tôi muốn đặt tiệc sinh nhật cho 30 người', '{}'::jsonb, false, now() - interval '2 hours'),
    ('zalo', 'outbound', null, null, v_lead1, null,
     'Chào anh An! Cảm ơn anh đã liên hệ. Anh muốn đặt tiệc vào ngày nào ạ?', '{}'::jsonb, true, now() - interval '1 hour 50 minutes'),
    ('facebook', 'inbound', 'Trần Thị Bình', null, v_lead2, null,
     'Hi, I want to order for a school event. About 200 students.', '{}'::jsonb, false, now() - interval '5 hours'),
    ('facebook', 'outbound', null, null, v_lead2, null,
     'Hello! Thank you for reaching out. We have great school event packages. Can you share the date?', '{}'::jsonb, true, now() - interval '4 hours 45 minutes'),
    ('sms', 'outbound', null, null, null, v_cust1,
     'Chị Mai ơi, đơn hàng BO-2026-0001 đã được xác nhận. Ngày giao: 25/04/2026.', '{}'::jsonb, true, now() - interval '1 day'),
    ('phone', 'inbound', 'Phạm Quốc Phú', '+84904444444', null, v_cust3,
     'Gọi hỏi về báo giá tiệc công ty 100 người tại KFC quận 7', '{"duration_seconds": 180}'::jsonb, true, now() - interval '3 hours'),
    ('zalo', 'inbound', 'Hoàng Văn Quang', '+84905555555', null, null,
     'Cho mình hỏi menu tiệc sinh nhật với giá ạ', '{}'::jsonb, false, now() - interval '30 minutes'),
    ('email', 'outbound', null, null, null, v_cust2,
     'Kính gửi anh Nam, đính kèm là báo giá cho sự kiện team building ngày 01/05/2026. Vui lòng xác nhận.', '{}'::jsonb, true, now() - interval '6 hours');

  -- ===== ADDITIONAL CHAT SESSIONS + MESSAGES (visitors) =====
  INSERT INTO chat_sessions (id, visitor_name, visitor_phone, visitor_email, status, created_at)
  VALUES
    (gen_random_uuid(), 'Đỗ Thanh Tùng', '+84971234567', 'tung.do@example.com', 'active', now() - interval '1 hour'),
    (gen_random_uuid(), 'Vũ Minh Châu', '+84981234567', null, 'closed', now() - interval '1 day');

  -- Chat messages for the new sessions
  INSERT INTO chat_messages (session_id, role, content, created_at)
  SELECT s.id, 'user', 'Xin chào, tôi muốn đặt tiệc cho 50 người tại KFC Vincom', now() - interval '55 minutes'
  FROM chat_sessions s WHERE s.visitor_name = 'Đỗ Thanh Tùng';

  INSERT INTO chat_messages (session_id, role, content, created_at)
  SELECT s.id, 'bot', 'Chào bạn! Cảm ơn bạn đã liên hệ KFC Big Orders. Chúng tôi có nhiều gói tiệc phù hợp cho 50 người. Bạn muốn đặt vào ngày nào?', now() - interval '54 minutes'
  FROM chat_sessions s WHERE s.visitor_name = 'Đỗ Thanh Tùng';

  INSERT INTO chat_messages (session_id, role, content, created_at)
  SELECT s.id, 'user', 'Ngày 5/5 được không? Và cho mình xem menu với', now() - interval '53 minutes'
  FROM chat_sessions s WHERE s.visitor_name = 'Đỗ Thanh Tùng';

  INSERT INTO chat_messages (session_id, role, content, created_at)
  SELECT s.id, 'user', 'Bạn có combo nào cho tiệc trường học khoảng 100 em không?', now() - interval '1 day'
  FROM chat_sessions s WHERE s.visitor_name = 'Vũ Minh Châu';

  INSERT INTO chat_messages (session_id, role, content, created_at)
  SELECT s.id, 'bot', 'Dạ có ạ! KFC có gói School Party cho 100 em với giá ưu đãi. Bạn vui lòng để lại số điện thoại để nhân viên liên hệ tư vấn chi tiết nhé.', now() - interval '23 hours 59 minutes'
  FROM chat_sessions s WHERE s.visitor_name = 'Vũ Minh Châu';

  -- ===== MORE ACTIVITIES (diverse types) =====
  INSERT INTO activities (entity_type, entity_id, activity_type, subject, description, created_by, created_at)
  VALUES
    ('lead', v_lead1, 'sms', 'SMS follow-up', 'Gửi tin nhắn theo dõi sau cuộc gọi', v_user4_id, now() - interval '2 days'),
    ('lead', v_lead2, 'system', 'Stage changed', 'Lead moved from new to contacted', v_admin_id, now() - interval '24 days'),
    ('customer', v_cust1, 'email', 'Quotation sent', 'Gửi báo giá tiệc sinh nhật 50 người', v_user2_id, now() - interval '7 days'),
    ('customer', v_cust2, 'meeting', 'Office visit', 'Thăm văn phòng để khảo sát địa điểm tổ chức', v_user2_id, now() - interval '4 days'),
    ('customer', v_cust3, 'call', 'Contract discussion', 'Thảo luận hợp đồng cung cấp hàng tháng', v_user2_id, now() - interval '1 day'),
    ('opportunity', (SELECT id FROM opportunities WHERE title LIKE 'Birthday%' LIMIT 1), 'note', 'Budget confirmed', 'Khách hàng xác nhận ngân sách 12 triệu VND', v_admin_id, now() - interval '3 days'),
    ('opportunity', (SELECT id FROM opportunities WHERE title LIKE 'Corporate%' LIMIT 1), 'email', 'Proposal sent', 'Gửi đề xuất team building Q2 cho HR', v_user2_id, now() - interval '6 days');

  -- ===== ADDITIONAL LEADS (reassign some to new users) =====
  UPDATE leads SET assigned_to = v_user2_id WHERE full_name = 'Trần Thị Bình' AND notes = 'seed-data-sprint11';
  UPDATE leads SET assigned_to = v_user4_id WHERE full_name = 'Võ Quốc Phong' AND notes = 'seed-data-sprint11';
  UPDATE leads SET assigned_to = v_user3_id WHERE full_name = 'Đặng Ngọc Giang' AND notes = 'seed-data-sprint11';
  UPDATE leads SET assigned_to = v_user2_id WHERE full_name = 'Lý Thị Lan' AND notes = 'seed-data-sprint11';

  -- Reassign some opportunities to new users
  UPDATE opportunities SET assigned_to = v_user2_id WHERE title LIKE 'Corporate%';
  UPDATE opportunities SET assigned_to = v_user3_id WHERE title LIKE 'Hotel%';

  -- Reassign some orders
  UPDATE orders SET assigned_to = v_user2_id WHERE order_number = 'BO-2026-0002';
  UPDATE orders SET assigned_to = v_user3_id WHERE order_number = 'BO-2026-0005';

  -- ===== ORDER STATUS HISTORY =====
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes, created_at)
  SELECT id, null, 'draft', v_admin_id, 'Đơn hàng được tạo', created_at
  FROM orders WHERE order_number = 'BO-2026-0001';

  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes, created_at)
  SELECT id, 'draft', 'confirmed', v_admin_id, 'Khách hàng xác nhận đặt hàng', created_at + interval '1 day'
  FROM orders WHERE order_number = 'BO-2026-0001';

  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes, created_at)
  SELECT id, null, 'draft', v_admin_id, 'Created from school event inquiry', created_at
  FROM orders WHERE order_number = 'BO-2026-0002';

  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes, created_at)
  SELECT id, 'draft', 'confirmed', v_user2_id, 'Confirmed after deposit received', created_at + interval '2 days'
  FROM orders WHERE order_number = 'BO-2026-0002';

  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes, created_at)
  SELECT id, 'confirmed', 'preparing', v_user2_id, 'Kitchen started preparation', created_at + interval '5 days'
  FROM orders WHERE order_number = 'BO-2026-0002';

  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes, created_at)
  SELECT id, null, 'draft', v_admin_id, null, created_at
  FROM orders WHERE order_number = 'BO-2026-0003';

  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes, created_at)
  SELECT id, 'draft', 'confirmed', v_admin_id, null, created_at + interval '1 day'
  FROM orders WHERE order_number = 'BO-2026-0003';

  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes, created_at)
  SELECT id, 'confirmed', 'preparing', v_admin_id, null, created_at + interval '3 days'
  FROM orders WHERE order_number = 'BO-2026-0003';

  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes, created_at)
  SELECT id, 'preparing', 'ready', v_admin_id, null, created_at + interval '5 days'
  FROM orders WHERE order_number = 'BO-2026-0003';

  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes, created_at)
  SELECT id, 'ready', 'fulfilled', v_admin_id, 'Giao hàng thành công', created_at + interval '5 days'
  FROM orders WHERE order_number = 'BO-2026-0003';

  RAISE NOTICE 'Comprehensive seed complete: 4 users, 3 teams, 8 channel messages, 5 chat messages, 7 activities, order history';
END $$;
