# Sprint Log

Each sprint includes: DB migration, UI pages, API routes, i18n keys, tests, and Codex adversarial security review.

---

## Sprint 1: Foundation (Auth + RBAC + i18n)

**Status:** DONE | **Commit:** `7974cd5`

**Built:**
- 13 database tables (users, roles, permissions, objects, role_permissions, role_objects, teams, user_roles, user_teams, user_stores, stores, audit_logs, business_rules)
- 8 RBAC roles seeded (admin, big_order_manager, omni_head, sales, marketing, store_manager, operations, viewer)
- `user_has_permission()` RPC function
- Supabase Auth integration (email/password)
- Dashboard layout with sidebar navigation
- Pages: login, reset-password, dashboard, users, roles, teams
- next-intl with vi/en support
- Dockerfile for Coolify deployment

---

## Sprint 2: Lead Management

**Status:** DONE | **Commit:** `0978bc1`

**Built:**
- 2 tables: `leads`, `activities`
- Lead stages: new → contacted → qualified → converted → lost
- Lead types: individual, parent, school, company
- Lead sources: manual, event, campaign, platform, web_app, company_school, google_maps, oms_sync
- `/leads` list page with filters, search, stats cards, create dialog
- `/leads/[id]` detail page with inline edit, clickable stage pipeline, activity timeline
- 50+ i18n keys

---

## Sprint 2.5: Security Hardening (Codex Review #1)

**Status:** DONE | **Migration:** `20260417200000_security_fixes.sql`

**Issues found and fixed:**
- CRITICAL: `users_update` privilege escalation → split self/admin RLS policies
- CRITICAL: leads/activities RLS too permissive → permission checks added
- HIGH: Search filter injection → `sanitizeSearch()` function
- HIGH: Client-side admin.createUser → `/api/users` server route
- MEDIUM: Missing write policies, N+1 queries, silent errors → all fixed

---

## Sprint 3: Customers & Organizations

**Status:** DONE | **Commit:** `0978bc1`

**Built:**
- 3 tables: `individual_customers`, `organizations`, `customer_org_links`
- Contact types: parent, employee, teacher, event_organizer, other
- Organization types: company, school, university, hotel, club, government_office, event_venue, other
- `/customers` list + `/customers/[id]` detail (with org links)
- `/organizations` list + `/organizations/[id]` detail (with contact links)
- Lead → Customer conversion API (`POST /api/leads/[id]/convert`)
- 90+ i18n keys

**Security (Codex Review #2):** Migration `20260417400000_sprint3_security_fixes.sql`
- CRITICAL: 3 issues fixed (customers/orgs RLS)
- HIGH: 2 issues fixed
- MEDIUM: 1 issue fixed

---

## Sprint 4: Sales Pipeline & Opportunities

**Status:** DONE | **Commit:** `b3b3970` + `2f62b80`

**Built:**
- 1 table: `opportunities` (6-stage pipeline)
- Opportunity stages: new → consulting → quoted → negotiating → won/lost
- `/pipeline` Kanban board with @dnd-kit drag-and-drop
- Pipeline summary bar (total, open, pipeline value, won value)
- Won stage requires actual_value, Lost stage requires lost_reason
- Create opportunity dialog with lead/customer/user selectors
- Opportunity detail dialog
- Lead → Opportunity conversion API (`POST /api/leads/[id]/convert-to-opportunity`)
- Server-side API routes (`POST /api/opportunities`, `PATCH /api/opportunities/[id]/stage`)
- 40+ i18n keys
- Pipeline permissions seeded (pipeline.view, pipeline.create, pipeline.edit, pipeline.delete)

**Security (Codex Review #3):** Migration `20260417600000_sprint4_security_fixes.sql`
- HIGH-1: Client-side mutations → moved to server-side API routes
- HIGH-2: Edit/delete RLS separation → separate policies
- HIGH-3: Entity reference validation → server-side checks
- HIGH-4: PII exposure → removed phone/email from client queries
- MEDIUM-1: Non-idempotent conversion → existence check + unique index
- MEDIUM-2: Raw DB errors → generic error messages

---

## Sprint 5: Big Orders & Menu Management

**Status:** DONE | **Commit:** `dabbeb9` + `80140c4`

**Built:**
- 5 tables: `menu_categories`, `menu_items`, `orders`, `order_items`, `order_status_history`
- 3 menu categories seeded: combo_bo (21 items), combo_hde (24 items), alacard (62 items) = 107 total
- Menu items with POS codes, bilingual names, VND prices (incl. 8% VAT), component breakdown
- Order number auto-generation: "BO-YYYY-NNNNN" via sequence
- Order status lifecycle: draft → confirmed → preparing → ready → fulfilled → cancelled
- Payment status: unpaid / partial / paid
- Event types: birthday, corporate, school_event, meeting, custom
- Sources: crm, landing_page, phone, zalo, facebook, oms_migrated
- Price snapshot: order_items store price at creation time, not current menu price
- Discount rules: >15% requires approval, >50M VND requires approval
- Fulfilled orders update customer revenue stats
- Cancellation requires notes
- `/orders` list page with status/store filters, search, stats cards
- `/orders/new` 4-step creation wizard (customer → menu → review → confirm)
- `/orders/[id]` detail page with status pipeline, items table, status history, payment toggle, Aloha bill ID
- Server-side API routes: `POST /api/orders`, `PATCH /api/orders/[id]/status`, `GET /api/menu`
- 60+ i18n keys (orders + menu sections, both languages)
- Order permissions seeded: orders.view, orders.create, orders.edit, orders.delete, orders.approve + menu.view, menu.edit
- RLS on all 5 tables with permission checks
- 138 tests passing (up from 103)

**Security (Codex Review #4):** Migration `20260417800000_sprint5_security_fixes.sql`
- CRITICAL-1: Client-side Supabase mutations (payment, aloha) → server-side `PATCH /api/orders/[id]`
- CRITICAL-2: Store-scoping RLS gap → deferred to Sprint 11 (consistent with all prior tables)
- CRITICAL-3: Missing `opportunity_id` validation → added existence check
- CRITICAL-4: No `payment_status` allowlist → added validation
- HIGH-1: `approved_by` set without `orders.approve` check → approval permission enforced
- HIGH-2: Non-atomic order creation → orphaned order cleanup on items failure
- MEDIUM-1: `entity_type: "opportunity"` bug → fixed to `"order"`
- MEDIUM-2: No phone format validation → regex added
- MEDIUM-3: Past dates accepted → server-side date validation added
- Permission grants: omni_head gets orders.approve; big_order_manager/sales get orders CRUD; rgm/area_manager get orders.view

---

## Sprint 6: Campaigns & Recurring Events

**Status:** DONE | **Commit:** `29fb56b`

**Built:**
- 3 tables: `campaigns`, `campaign_recipients`, `recurring_events`
- Campaign types: sms, email
- Campaign status lifecycle: draft → scheduled → sending → sent / cancelled
- Recipient statuses: pending → sent → delivered / failed / bounced
- Segment builder: filter customers by type, city, store, revenue band, last order date
- Template variables: {{customer_name}}, {{store_name}}, {{event_date}}
- Recurring event types: birthday, company_anniversary, children_day, custom
- `/campaigns` list page with status/type filters, stats cards
- `/campaigns/[id]` detail page with segment builder, template editor, recipient list, delivery stats bar
- Customer detail page: recurring events section with add/delete
- Server-side API routes: `POST /api/campaigns`, `PATCH /api/campaigns/[id]`, `POST /api/campaigns/[id]/send`, `GET/POST /api/campaigns/[id]/recipients`, `POST /api/campaigns/segment`, `POST /api/recurring-events`, `PATCH/DELETE /api/recurring-events/[id]`
- 60+ i18n keys (campaigns + events sections, both languages)
- Campaign permissions seeded: campaigns.view, campaigns.create, campaigns.edit, campaigns.delete, campaigns.send
- Event permissions seeded: events.view, events.create, events.edit, events.delete
- RLS on all 3 tables with permission checks
- 169 tests passing (up from 138)

**Security (Codex Review #5):** Migration `20260417950000_sprint6_security_fixes.sql`
- HIGH-1: Segment endpoint missing permission check → added campaigns.view check + stripped PII
- HIGH-2: Recipients derived from client-supplied destinations → server-side DB lookup by customer IDs
- HIGH-3: Campaign IDOR → by design, campaigns are team-shared (consistent with leads/orders)
- HIGH-4: recurring_events RLS used campaigns.* slugs → fixed to events.* slugs
- MEDIUM-1: Customer detail client-side mutations → deferred (pre-existing, all sprints)
- MEDIUM-2: Customer detail PII reads → deferred (Sprint 11)

---

## Upcoming Sprints

| Sprint | Name | Key Deliverables |
|--------|------|-----------------|
| 7 | Discovery & Landing | Geo-based lead discovery, public landing page |
| 8 | Landing Page & Chat | CMS-driven content, live chat (WebSocket) |
| 9 | Channel Integration | Zalo OA, Facebook, Vihat SMS/ZNS |
| 10 | OMS Integration | Store sync, historical data seed |
| 11 | Reports & Dashboards | Analytics, KPIs, export |
| 12 | Settings & Polish | Admin settings, UX polish, final QA |
