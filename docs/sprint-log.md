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

## Upcoming Sprints

| Sprint | Name | Key Deliverables |
|--------|------|-----------------|
| 5 | Big Orders & Menu | menu_categories, menu_items (107 seed), orders, order_items, order_status_history |
| 6 | Campaigns & Events | Campaign CRUD, event management |
| 7 | Discovery & Landing | Geo-based lead discovery, public landing page |
| 8 | Landing Page & Chat | CMS-driven content, live chat (WebSocket) |
| 9 | Channel Integration | Zalo OA, Facebook, Vihat SMS/ZNS |
| 10 | OMS Integration | Store sync, historical data seed |
| 11 | Reports & Dashboards | Analytics, KPIs, export |
| 12 | Settings & Polish | Admin settings, UX polish, final QA |
