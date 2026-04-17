# API Reference

All mutations go through server-side API routes. Client components must NOT write directly to Supabase.

## Authentication

All API routes require a valid Supabase Auth session (JWT cookie). Unauthenticated requests get `401`.

## Routes

### POST /api/users
Create a new CRM user (admin only).

**Permissions:** `users.create` or `is_root`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "Full Name",
  "phone": "+84901234567",
  "region": "N"
}
```

---

### POST /api/leads/{id}/convert
Convert a lead to a customer.

**Permissions:** `leads.edit` + `customers.edit`

**Validation:**
- Lead must be in `qualified` or `contacted` stage
- Phone number dedup check against existing customers

**Response:** `{ "data": { "customerId": "uuid" } }`

---

### POST /api/leads/{id}/convert-to-opportunity
Convert a qualified lead to an opportunity.

**Permissions:** `leads.edit` + `pipeline.create`

**Validation:**
- Lead must be in `qualified` stage
- No existing active opportunity for this lead (409 if exists)

**Body (optional):**
```json
{
  "title": "Custom title",
  "expected_value": 15000000,
  "expected_date": "2026-06-15"
}
```

**Response:** `{ "opportunity": { ... } }`

---

### POST /api/opportunities
Create a new opportunity.

**Permissions:** `pipeline.create`

**Validation:**
- Title required
- Referenced `lead_id` must exist and be accessible
- Referenced `customer_id` must exist and be accessible
- Referenced `assigned_to` must be an active user

**Body:**
```json
{
  "title": "Party order - ABC School",
  "lead_id": "uuid (optional)",
  "customer_id": "uuid (optional)",
  "expected_value": 15000000,
  "expected_date": "2026-06-15",
  "assigned_to": "uuid (optional)",
  "notes": "Optional notes"
}
```

**Response:** `{ "data": { ... } }`

---

### PATCH /api/opportunities/{id}/stage
Change an opportunity's pipeline stage.

**Permissions:** `pipeline.edit`

**Validation:**
- Stage must be one of: `new`, `consulting`, `quoted`, `negotiating`, `won`, `lost`
- `won` requires `actual_value` (positive integer)
- `lost` requires `lost_reason` (non-empty string)

**Body:**
```json
{
  "stage": "won",
  "actual_value": 12000000
}
```
or
```json
{
  "stage": "lost",
  "lost_reason": "Price too high"
}
```

**Response:** `{ "success": true }`

---

### POST /api/orders
Create a new big order with items.

**Permissions:** `orders.create`

**Validation:**
- `contact_name`, `contact_phone`, `store_id`, `scheduled_date` required
- `items` array required (at least 1 item)
- All `menu_item_id` references must exist and be active
- `event_type` must be: birthday, corporate, school_event, meeting, custom
- `source` must be: crm, landing_page, phone, zalo, facebook, oms_migrated
- Referenced `customer_id`, `organization_id`, `assigned_to` validated if provided
- discount_pct > 15% or total_value > 50M VND → order created as `draft` (needs approval)

**Body:**
```json
{
  "contact_name": "Nguyen Van A",
  "contact_phone": "+84912345678",
  "store_id": "uuid",
  "scheduled_date": "2026-06-15",
  "event_type": "birthday",
  "source": "crm",
  "guest_count": 50,
  "customer_id": "uuid (optional)",
  "organization_id": "uuid (optional)",
  "assigned_to": "uuid (optional)",
  "discount_pct": 10,
  "delivery_notes": "Deliver by 10am",
  "items": [
    { "menu_item_id": "uuid", "quantity": 3, "special_requests": "Extra sauce" }
  ]
}
```

**Response:** `{ "data": { ... }, "needs_approval": false }`

---

### PATCH /api/orders/{id}/status
Change an order's status.

**Permissions:** `orders.edit`

**Valid transitions:**
- draft → confirmed, cancelled
- confirmed → preparing, cancelled
- preparing → ready, cancelled
- ready → fulfilled, cancelled
- fulfilled/cancelled → (no transitions)

**Validation:**
- `cancelled` requires `notes` (reason)
- `fulfilled` updates customer's `total_revenue`, `order_count`, `last_order_date`
- `preparing` can include `aloha_bill_id`

**Body:**
```json
{
  "status": "confirmed",
  "notes": "Optional notes",
  "aloha_bill_id": "ALH-12345 (optional, for preparing)"
}
```

**Response:** `{ "success": true }`

---

### GET /api/menu
Fetch all active menu categories and items.

**Permissions:** Authenticated (any user)

**Response:** `{ "categories": [...], "items": [...] }`

---

### POST /api/webhooks/zalo
Receive inbound messages from Zalo OA.

**Authentication:** None (public webhook). HMAC signature verification via `X-ZaloOA-Signature` header.

**Body:** Zalo OA webhook payload (message event).

**Behavior:**
- Verifies HMAC-SHA256 signature against app secret
- Extracts sender ID, message text, attachments
- Matches sender to existing lead/customer by Zalo UID
- Creates `channel_messages` record with `channel = 'zalo'`

**Response:** `200 OK` (empty body — Zalo requires 200 within 5s)

---

### GET /api/webhooks/facebook
Facebook webhook verification (subscribe).

**Authentication:** None (public endpoint).

**Query params:** `hub.mode`, `hub.verify_token`, `hub.challenge`

**Response:** Returns `hub.challenge` if verify token matches, otherwise `403`.

---

### POST /api/webhooks/facebook
Receive inbound messages from Facebook Messenger.

**Authentication:** None (public webhook). Verifies `X-Hub-Signature-256` header.

**Body:** Facebook Messenger webhook payload.

**Behavior:**
- Verifies SHA-256 signature against app secret
- Extracts sender PSID, message text, attachments
- Matches sender to existing lead/customer by Facebook PSID
- Creates `channel_messages` record with `channel = 'facebook'`

**Response:** `200 OK` (body: `"EVENT_RECEIVED"`)

---

### POST /api/webhooks/antbuddy
Receive caller ID events from Antbuddy call center integration.

**Authentication:** None (public webhook). IP allowlist or shared secret validation.

**Body:**
```json
{
  "caller_number": "+84912345678",
  "call_direction": "inbound",
  "agent_id": "string",
  "call_id": "string"
}
```

**Behavior:**
- Normalizes phone number format
- Matches caller to existing lead/customer by phone
- Creates `channel_messages` record with `channel = 'antbuddy'`
- Returns matched entity info for agent screen-pop

**Response:** `{ "matched": true, "entity_type": "customer", "entity_id": "uuid", "name": "..." }`

---

### POST /api/channels/send-zns
Send a Zalo Notification Service (ZNS) message via Vihat.

**Permissions:** `channels.send`

**Validation:**
- Recipient must have interacted via Zalo within the last 48 hours (reply window)
- Template ID required (pre-approved ZNS templates only)

**Body:**
```json
{
  "recipient_id": "uuid",
  "template_id": "string",
  "template_data": { "customer_name": "Nguyen Van A", "order_id": "BO-2026-00001" },
  "phone": "+84912345678"
}
```

**Response:** `{ "success": true, "message_id": "uuid", "vihat_id": "string" }`

---

### POST /api/channels/send-sms
Send an SMS via Vihat using KFC brandname.

**Permissions:** `channels.send`

**Validation:**
- Phone number required, must be valid Vietnamese mobile number
- Message body required, max 160 characters per segment

**Body:**
```json
{
  "phone": "+84912345678",
  "message": "KFC: Don hang BO-2026-00001 da duoc xac nhan. Cam on quy khach!",
  "recipient_id": "uuid (optional)",
  "campaign_id": "uuid (optional)"
}
```

**Response:** `{ "success": true, "message_id": "uuid", "vihat_id": "string" }`

---

### PATCH /api/channels/messages
Mark a channel message as read.

**Permissions:** `channels.view`

**Body:**
```json
{
  "message_id": "uuid",
  "read": true
}
```

**Response:** `{ "success": true }`

---

### POST /api/oms/sync-stores
Sync store data from KFC OMS. Updates `oms_store_id` and `last_synced_at` on matched stores.

**Permissions:** `integrations.manage`

**Behavior:**
- Calls OMS store list endpoint (mock adapter in Phase 1)
- Matches OMS stores to CRM stores by Aloha ID or store name
- Updates `oms_store_id` and `last_synced_at` on matched rows
- Returns sync summary (matched, skipped, errors)

**Response:** `{ "success": true, "matched": 244, "skipped": 0, "errors": [] }`

---

### POST /api/oms/seed-customers
Import historical big-order customers from OMS `big_order_customers` table.

**Permissions:** `integrations.manage`

**Behavior:**
- Fetches customer records from OMS (mock adapter in Phase 1)
- Deduplicates against existing `individual_customers` by phone number
- Creates new customer records for unmatched entries
- Returns import summary

**Response:** `{ "success": true, "imported": 150, "duplicates_skipped": 12, "errors": [] }`

---

### GET /api/oms/sync-status
Get current OMS integration sync status.

**Permissions:** Authenticated (any user)

**Response:**
```json
{
  "store_sync": {
    "last_synced_at": "2026-04-18T10:30:00Z",
    "stores_linked": 244,
    "stores_unlinked": 0
  },
  "customer_import": {
    "last_run_at": "2026-04-18T09:00:00Z",
    "total_imported": 150
  },
  "webhook": {
    "active": true,
    "last_received_at": "2026-04-18T11:00:00Z"
  }
}
```

---

### POST /api/webhooks/oms
Receive webhook events from KFC OMS (Phase 1 — log only).

**Authentication:** None (public webhook). HMAC-SHA256 signature verification via `X-OMS-Signature` header.

**Rate limiting:** 100 requests per minute per IP.

**Body:** OMS webhook payload (order events, store updates, etc.).

**Behavior:**
- Verifies HMAC-SHA256 signature against configured webhook secret
- Logs full payload to `audit_logs` for future processing
- Phase 1: does not create/update CRM records (log-only mode)

**Response:** `200 OK` (body: `{ "received": true }`)

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Human-readable error message"
}
```

Status codes:
- `400` — Bad request (missing fields, invalid values)
- `401` — Not authenticated
- `403` — Insufficient permissions
- `404` — Resource not found
- `409` — Conflict (duplicate)
- `500` — Server error (generic message, details logged server-side)
