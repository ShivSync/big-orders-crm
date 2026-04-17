-- Sprint 9: Channel Integrations (Zalo OA, Facebook, Antbuddy, Vihat)

-- 1. channel_messages table
CREATE TABLE IF NOT EXISTS channel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('zalo', 'facebook', 'sms', 'email', 'phone')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_id text,
  sender_name text,
  sender_phone text,
  lead_id uuid REFERENCES leads(id),
  customer_id uuid REFERENCES individual_customers(id),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_channel_messages_channel ON channel_messages(channel);
CREATE INDEX idx_channel_messages_lead_id ON channel_messages(lead_id);
CREATE INDEX idx_channel_messages_customer_id ON channel_messages(customer_id);
CREATE INDEX idx_channel_messages_created_at ON channel_messages(created_at DESC);
CREATE INDEX idx_channel_messages_read ON channel_messages(read) WHERE read = false;

ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users with channels.view can read
CREATE POLICY "channel_messages_select" ON channel_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid() AND p.slug IN ('channels.view', 'channels.send')
    )
  );

-- Users with channels.send can insert outbound messages
CREATE POLICY "channel_messages_insert" ON channel_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid() AND p.slug = 'channels.send'
    )
  );

-- Users with channels.view can mark as read
CREATE POLICY "channel_messages_update" ON channel_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid() AND p.slug = 'channels.view'
    )
  ) WITH CHECK (read = true);

-- Enable Realtime for channel_messages (Antbuddy live notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE channel_messages;

-- 2. Objects and permissions for channels
INSERT INTO objects (slug, name_en, name_vi) VALUES
  ('channels', 'Channels', 'Kênh liên lạc')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO permissions (slug, name_en, name_vi, object_id) VALUES
  ('channels.view', 'View Channel Messages', 'Xem tin nhắn kênh', (SELECT id FROM objects WHERE slug = 'channels')),
  ('channels.send', 'Send Channel Messages', 'Gửi tin nhắn kênh', (SELECT id FROM objects WHERE slug = 'channels'))
ON CONFLICT (slug) DO NOTHING;

-- Grant to relevant roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug IN ('admin', 'omni_channel_head', 'call_center')
  AND p.slug IN ('channels.view', 'channels.send')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug IN ('sales', 'big_order_manager')
  AND p.slug IN ('channels.view')
ON CONFLICT DO NOTHING;

-- 3. Extend lead_source for channel-originated leads
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_lead_source_check CHECK (
  lead_source = ANY (ARRAY['manual', 'event', 'campaign', 'platform', 'web_app', 'company_school', 'google_maps', 'oms_sync', 'embed_widget', 'chat_bot', 'zalo', 'facebook', 'phone_call'])
);
