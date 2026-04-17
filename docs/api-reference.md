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
