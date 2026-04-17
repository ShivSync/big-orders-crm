-- Sprint 8: Landing Page & Live Chat

-- 1. Landing page CMS content
CREATE TABLE IF NOT EXISTS landing_page_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL CHECK (section IN ('hero', 'menu', 'gallery', 'form_config', 'footer')),
  content jsonb NOT NULL DEFAULT '{}',
  sort_order int DEFAULT 0,
  active boolean DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE landing_page_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landing_content_select" ON landing_page_content
  FOR SELECT USING (true);

CREATE POLICY "landing_content_modify" ON landing_page_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.slug = 'admin'
    )
  );

-- 2. Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL DEFAULT gen_random_uuid(),
  visitor_name text,
  visitor_phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'escalated')),
  assigned_agent uuid REFERENCES auth.users(id),
  lead_id uuid REFERENCES leads(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_sessions_public_insert" ON chat_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "chat_sessions_public_select" ON chat_sessions
  FOR SELECT USING (
    visitor_id::text = coalesce(current_setting('request.jwt.claims', true)::json->>'visitor_id', '')
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid() AND p.slug IN ('chat.view', 'chat.respond')
    )
  );

CREATE POLICY "chat_sessions_agent_update" ON chat_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid() AND p.slug = 'chat.respond'
    )
  );

-- 3. Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('visitor', 'bot', 'agent')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_public_insert" ON chat_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "chat_messages_select" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.id = session_id
        AND (
          cs.visitor_id::text = coalesce(current_setting('request.jwt.claims', true)::json->>'visitor_id', '')
          OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN role_permissions rp ON rp.role_id = ur.role_id
            JOIN permissions p ON p.id = rp.permission_id
            WHERE ur.user_id = auth.uid() AND p.slug IN ('chat.view', 'chat.respond')
          )
        )
    )
  );

-- 4. Bot FAQ knowledge base
CREATE TABLE IF NOT EXISTS bot_faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_vi text NOT NULL,
  question_en text NOT NULL,
  answer_vi text NOT NULL,
  answer_en text NOT NULL,
  keywords text[] DEFAULT '{}',
  category text DEFAULT 'general',
  sort_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bot_faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faq_public_read" ON bot_faq
  FOR SELECT USING (active = true);

CREATE POLICY "faq_admin_modify" ON bot_faq
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.slug = 'admin'
    )
  );

-- Objects for chat permissions
INSERT INTO objects (slug, name_en, name_vi) VALUES
  ('chat', 'Chat', 'Trò chuyện'),
  ('landing', 'Landing Page', 'Trang đích')
ON CONFLICT (slug) DO NOTHING;

-- Permissions
INSERT INTO permissions (slug, name_en, name_vi, object_id) VALUES
  ('chat.view', 'View Chats', 'Xem trò chuyện', (SELECT id FROM objects WHERE slug = 'chat')),
  ('chat.respond', 'Respond to Chats', 'Trả lời trò chuyện', (SELECT id FROM objects WHERE slug = 'chat')),
  ('landing.edit', 'Edit Landing Page', 'Sửa trang đích', (SELECT id FROM objects WHERE slug = 'landing'))
ON CONFLICT (slug) DO NOTHING;

-- Grant chat permissions to relevant roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug IN ('admin', 'omni_channel_head', 'call_center')
  AND p.slug IN ('chat.view', 'chat.respond', 'landing.edit')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug IN ('sales', 'big_order_manager')
  AND p.slug IN ('chat.view')
ON CONFLICT DO NOTHING;

-- Seed landing page content
INSERT INTO landing_page_content (section, content, sort_order) VALUES
  ('hero', '{
    "title_vi": "Tiệc lớn cùng KFC Vietnam",
    "title_en": "Big Party with KFC Vietnam",
    "subtitle_vi": "Đặt tiệc sinh nhật, sự kiện công ty, họp mặt — phục vụ từ 20 đến 500 khách",
    "subtitle_en": "Book birthday parties, corporate events, gatherings — serving 20 to 500 guests",
    "cta_vi": "Đặt tiệc ngay",
    "cta_en": "Book Now",
    "image_url": "/images/hero-party.jpg"
  }', 1),
  ('menu', '{
    "title_vi": "Thực đơn tiệc nổi bật",
    "title_en": "Featured Party Menu",
    "show_top_n": 6
  }', 2),
  ('gallery', '{
    "title_vi": "Khoảnh khắc vui vẻ",
    "title_en": "Happy Moments",
    "images": [
      {"url": "/images/gallery-1.jpg", "alt_vi": "Tiệc sinh nhật", "alt_en": "Birthday party"},
      {"url": "/images/gallery-2.jpg", "alt_vi": "Sự kiện công ty", "alt_en": "Corporate event"},
      {"url": "/images/gallery-3.jpg", "alt_vi": "Họp mặt gia đình", "alt_en": "Family gathering"}
    ]
  }', 3),
  ('form_config', '{
    "event_types": ["birthday", "corporate", "school", "wedding", "other"],
    "min_guests": 20,
    "max_guests": 500
  }', 4),
  ('footer', '{
    "hotline": "1900-1234",
    "email": "bigorders@kfcvietnam.com.vn",
    "address_vi": "KFC Vietnam — Hệ thống 260+ cửa hàng toàn quốc",
    "address_en": "KFC Vietnam — 260+ stores nationwide"
  }', 5)
ON CONFLICT DO NOTHING;

-- Seed FAQ entries
INSERT INTO bot_faq (question_vi, question_en, answer_vi, answer_en, keywords, category, sort_order) VALUES
  (
    'Đặt tiệc tối thiểu bao nhiêu người?',
    'What is the minimum number of guests?',
    'Tiệc lớn KFC phục vụ tối thiểu 20 khách. Bạn có thể đặt tiệc cho 20 đến 500 người.',
    'KFC big parties serve a minimum of 20 guests. You can book for 20 to 500 people.',
    ARRAY['tối thiểu', 'bao nhiêu người', 'minimum', 'guests', 'số lượng'],
    'booking', 1
  ),
  (
    'Giá tiệc như thế nào?',
    'How much does a party cost?',
    'Giá tiệc tùy thuộc vào combo và số lượng khách. Combo phổ biến từ 89.000đ/người. Nhân viên sẽ liên hệ báo giá chi tiết.',
    'Party pricing depends on the combo and number of guests. Popular combos start from 89,000 VND/person. Our team will contact you with a detailed quote.',
    ARRAY['giá', 'bao nhiêu tiền', 'price', 'cost', 'chi phí'],
    'pricing', 2
  ),
  (
    'Đặt tiệc trước bao lâu?',
    'How far in advance should I book?',
    'Vui lòng đặt trước ít nhất 3 ngày làm việc. Đối với tiệc lớn trên 100 khách, đặt trước 1 tuần.',
    'Please book at least 3 business days in advance. For large parties over 100 guests, book 1 week ahead.',
    ARRAY['trước bao lâu', 'advance', 'đặt trước', 'thời gian'],
    'booking', 3
  ),
  (
    'Có giao hàng tận nơi không?',
    'Do you offer delivery?',
    'Có! KFC giao tiệc tận nơi trong bán kính 10km từ cửa hàng gần nhất. Phí giao hàng tùy khoảng cách.',
    'Yes! KFC delivers parties within 10km of the nearest store. Delivery fee depends on distance.',
    ARRAY['giao hàng', 'delivery', 'tận nơi', 'ship'],
    'delivery', 4
  ),
  (
    'Có thể tùy chỉnh thực đơn không?',
    'Can I customize the menu?',
    'Bạn có thể chọn từ các combo có sẵn hoặc mix & match món. Nhân viên sẽ tư vấn thực đơn phù hợp với ngân sách.',
    'You can choose from available combos or mix & match items. Our team will help customize the menu to fit your budget.',
    ARRAY['tùy chỉnh', 'customize', 'thực đơn', 'menu', 'chọn món'],
    'menu', 5
  )
ON CONFLICT DO NOTHING;

-- Enable Realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
