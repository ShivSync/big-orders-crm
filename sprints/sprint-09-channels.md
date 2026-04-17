# Sprint 9: Channel Integrations (Zalo OA + Facebook + Antbuddy + Vihat)

**Status:** PENDING

## Objectives
- Zalo OA webhook for inbound messages → lead/activity creation
- Facebook Page webhook for Messenger + comments → lead/activity creation
- Antbuddy caller ID webhook → real-time lead popup on incoming calls
- Vihat Gateway integration for outbound ZNS + SMS brandname "KFC"
- Unified channel_messages inbox
- Wire Vihat to campaigns (Sprint 6 SMS stub)

## Database Tables (1)
1. `channel_messages` — channel (zalo/facebook/sms/email), direction (inbound/outbound), sender_id, sender_name, sender_phone, lead_id (FK nullable), customer_id (FK nullable), content, metadata (jsonb: message_id, thread_id, attachments), read (boolean), created_at

## API Endpoints
- `POST /api/webhooks/zalo` — Zalo OA webhook receiver (verify signature)
- `POST /api/webhooks/facebook` — Facebook Page webhook (verify token)
- `POST /api/webhooks/antbuddy` — Antbuddy caller ID webhook
- `POST /api/channels/send-zns` — send ZNS via Vihat (template-based)
- `POST /api/channels/send-sms` — send SMS via Vihat (brandname "KFC")

## Environment Variables
- `ZALO_OA_ID` — 1089872550377351285 ("KFC Vietnam")
- `ZALO_OA_SECRET` — webhook verification secret
- `VIHAT_API_KEY` — Vihat Gateway API key
- `VIHAT_BRAND_NAME` — "KFC" (SMS brandname)
- `FACEBOOK_PAGE_ID` — KFC Vietnam Facebook page
- `FACEBOOK_VERIFY_TOKEN` — webhook verification
- `FACEBOOK_PAGE_ACCESS_TOKEN` — API access
- `ANTBUDDY_WEBHOOK_SECRET` — caller ID webhook

## Key Behaviors
- Zalo inbound: parse message → match by phone to existing lead/customer → create activity or new lead
- Facebook Messenger: parse message → match or create lead → log activity
- Facebook comment on Big Order post: auto-create lead with source = 'facebook'
- Antbuddy: incoming call → match phone → Supabase Realtime notification → CRM pops lead/customer detail
- Vihat ZNS: template-based, pre-approved by Zalo. Parameters: customer_name, order_number, etc.
- Vihat SMS: brandname "KFC", used for customers without Zalo
- 48h Zalo reply window: outbound Zalo OA message only within 48h of user's last message
- Channel messages linked to lead_id or customer_id for unified view

## UI Enhancements
- Lead/Customer 360 view: "Messages" tab showing channel_messages for that entity
- Call Center dashboard: real-time Antbuddy notification panel
- Campaign send: Vihat SMS delivery now functional (was stubbed in Sprint 6)

## i18n Keys
- `channels` section: zalo, facebook, sms, email, inbound, outbound, unread, markRead, sendZNS, sendSMS, callerID, unknownCaller, createLeadFromCall

## Acceptance Tests

### Webhook Tests
- [ ] POST /api/webhooks/zalo validates signature, rejects invalid
- [ ] Zalo inbound message creates activity on matched lead
- [ ] Zalo inbound from unknown phone creates new lead
- [ ] POST /api/webhooks/facebook validates verify_token
- [ ] Facebook message creates lead with source = 'facebook'
- [ ] POST /api/webhooks/antbuddy triggers Realtime notification
- [ ] Antbuddy caller ID matches existing lead by phone

### Outbound Tests
- [ ] POST /api/channels/send-zns sends via Vihat API with template parameters
- [ ] POST /api/channels/send-sms sends via Vihat API with brandname "KFC"
- [ ] ZNS respects 48h reply window (rejects if no recent inbound)
- [ ] Outbound messages logged in channel_messages with direction = 'outbound'

### Migration Tests
- [ ] channel_messages table with all columns
- [ ] Channel CHECK: zalo, facebook, sms, email
- [ ] Direction CHECK: inbound, outbound
- [ ] RLS enabled
- [ ] Indexes on channel, lead_id, customer_id, created_at

### Integration Tests
- [ ] Campaign SMS sending uses Vihat (Sprint 6 wiring)
- [ ] Lead/Customer 360 view shows channel messages
- [ ] Call Center agent sees Antbuddy notification in real-time

### Build Tests
- [ ] `npm run build` passes
- [ ] All webhook endpoints accessible
