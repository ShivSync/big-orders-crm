# CLAUDE.md — Big Orders CRM

## What This Is
KFC Vietnam Big Order CRM. Manages B2B bulk/corporate/party orders for 260+ stores.

## Stack
- **Frontend:** Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
- **Backend:** Supabase self-hosted on AWS EC2 (54.179.223.103)
- **Auth:** Supabase Auth (email/password), RLS for row-level security
- **i18n:** next-intl — Vietnamese (default) + English
- **Deployment:** Coolify on EC2 (Docker, auto-deploy from GitHub)

## Architecture Decisions (LOCKED)
All 23 decisions in `~/Shiv-1/tech/big-orders/ARCHITECTURE.md` are LOCKED.
Key ones: D-2 (Next.js + Supabase), D-3 (CRM owns Big Order lifecycle), D-6 (RLS), D-7 (soft delete), D-14 (OMS-aligned RBAC), D-15 (dual language).

## Conventions
- TypeScript strict mode
- Supabase client: `@/lib/supabase/server` (server components), `@/lib/supabase/client` (client components)
- All DB tables use `deleted_at` soft delete (Decree 13 compliance)
- RLS on every table — no bypassing
- Bilingual: all user-facing strings in `src/messages/{vi,en}.json`
- RBAC: 8 roles, permission slugs like `leads.view`, `orders.create`
- Store filtering: ALL/SOME/ONE per role-object combo
- Data masking: `mask_phone()` / `mask_email()` in DB, gated by permission
- Server-side API routes for mutations (not client-side Supabase calls) — enforced after Sprint 3 Codex review
- Tests: vitest with config in `vitest.config.ts`
- Documentation: `docs/` folder updated with every sprint (sprint-log.md, api-reference.md, database.md)

## Commands
```bash
npm run dev          # local dev server (needs .env.local)
npm run build        # production build
npm run lint         # ESLint
npx vitest           # run tests
```

---

## EC2 Server & Infrastructure

### AWS EC2 Instance
- **IP:** 54.179.223.103
- **SSH:** `ssh -i ~/.ssh/shiv-ec2.pem ubuntu@54.179.223.103`
- **SSH key location (M4):** `~/.ssh/shiv-ec2.pem`
- **Docker access:** requires `sudo` (user `ubuntu` is not in docker group)
- **AWS Security Group ports:** 22, 80, 443, 3000, 6001, 6002, 8000, 8080

### Coolify
- **Dashboard:** http://54.179.223.103:8080
- **CRM project ID:** gvep39jqki1tyzjj6jmmfkqq
- **CRM app container:** `ljzfdlhn3y8u43mm11dm9fbw-133655279748`
- **Auto-deploy:** from GitHub on push to main
- **CRM app URL:** http://54.179.223.103:3000

### Supabase CRM Instance
- **Coolify UUID:** xi90e5re1c8yfxd2zx4gntof
- **Kong API endpoint:** http://54.179.223.103:8000 (via Docker socat container `crm-kong-proxy`)
- **Kong sslip.io:** supabasekong-xi90e5re1c8yfxd2zx4gntof.54.179.223.103.sslip.io:8000
- **DB container:** `supabase-db-xi90e5re1c8yfxd2zx4gntof`
- **PG password:** `1ZA8Xgk7DQcyS01GVuAlQfy8vPvg5c8M`
- **JWT secret:** `c82LLX48u5srZmvV77NPuhlO8T4osne3`
- **Anon key:** `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NjQyMDEyMCwiZXhwIjo0OTMyMDkzNzIwLCJyb2xlIjoiYW5vbiJ9.mduj8kqAEu6uhQLZCEeL8N9hwKZpFWkxre3yAvaDTT8`
- **Service role key:** `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NjQyMDEyMCwiZXhwIjo0OTMyMDkzNzIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.dkB_fdmD3Ej_P_jTurfLC_fVeV9jGHyj2_hwBLJiPAw`

### LMS Supabase Instance (separate, same EC2)
- **Coolify UUID:** p7woejz3xihxi3abcwlhw2yt
- **PG password:** `AofC0KCOmGMfEOhZy4W8MN34FQDq0Y7p`

### How to Run Migrations
```bash
# Pipe SQL file through SSH to the CRM Postgres container:
cat supabase/migrations/<filename>.sql | ssh -i ~/.ssh/shiv-ec2.pem ubuntu@54.179.223.103 \
  "sudo docker exec -i supabase-db-xi90e5re1c8yfxd2zx4gntof psql -U postgres -d postgres"
```

### Admin Login
- **Email:** admin@bigorders.vn
- **Password:** BigOrders2026!

### Known Issues
- **Socat fragility:** `crm-kong-proxy` container uses Docker DNS to reach Kong. If Kong container restarts with a new name, socat breaks. Long-term fix: Coolify proxy (Traefik/Caddy).
- **Sprint 1 table ownership:** Tables created by Coolify's Supabase setup are owned by `supabase_admin`, not `postgres`. ALTER TABLE commands from `postgres` user may fail with "must be owner" — use `supabase_admin` or run via Supabase Studio for DDL changes on Sprint 1 tables.
- **DNS/domain:** Not yet configured. Currently IP-only access.

---

## DB Migrations
SQL files in `supabase/migrations/`. Applied migrations:

| Migration | Sprint | Status |
|-----------|--------|--------|
| (Sprint 1 tables created via Coolify Supabase setup) | 1 | APPLIED |
| 20260417100000_sprint2_leads.sql | 2 | APPLIED |
| 20260417200000_security_fixes.sql | 2.5 | APPLIED (partial — ownership errors on Sprint 1 tables, policies OK) |
| 20260417300000_sprint3_customers_orgs.sql | 3 | APPLIED |
| 20260417400000_sprint3_security_fixes.sql | 3 | APPLIED |
| 20260417700000_sprint5_orders_menu.sql | 5 | APPLIED (menu tables + seeds; orders FK fixed by patch) |
| 20260417750000_sprint5_orders_fix_storeid.sql | 5 | APPLIED (orders/order_items/order_status_history with text store_id) |
| 20260417800000_sprint5_security_fixes.sql | 5 | APPLIED |
| 20260417900000_sprint6_campaigns_events.sql | 6 | APPLIED |
| 20260417950000_sprint6_security_fixes.sql | 6 | APPLIED |
| 20260418000000_sprint7_store_seeds.sql | 7 | APPLIED (244 KFC stores + 665 competitor locations) |
| 20260418100000_sprint7_settings_discovery.sql | 7 | APPLIED (system_settings, discovery+settings permissions) |
| 20260418200000_sprint8_landing_chat.sql | 8 | APPLIED (landing_page_content, chat_sessions, chat_messages, bot_faq + Realtime) |
| 20260418300000_sprint9_channels.sql | 9 | APPLIED (channel_messages + RLS + Realtime, channels permissions, lead_source extension) |
| 20260418400000_sprint10_oms_integration.sql | 10 | APPLIED (oms_store_id, last_synced_at on stores, integrations permissions) |
| 20260418500000_sprint11_reports_kpi.sql | 11 | PENDING (kpi_targets table, reports permissions) |
| 20260418510000_sprint11_kpi_policy_fix.sql | 11 | PENDING (restrict kpi_targets INSERT/UPDATE to root only) |
| 20260418520000_sprint11_seed_test_data.sql | 11 | PENDING (10 leads, 6 customers, 3 orgs, 6 opps, 5 orders, activities, events) |

---

## Sprint Progress

| Sprint | Name | Status |
|--------|------|--------|
| 1 | Foundation (Auth+RBAC+i18n) | DONE |
| 2 | Lead Management | DONE |
| 2.5 | Security Hardening (Codex review) | DONE |
| 3 | Customers & Organizations | DONE |
| 4 | Sales Pipeline & Opportunities | DONE |
| 5 | Big Orders & Menu | DONE — commit `80140c4` |
| 6 | Campaigns & Events | DONE — commit `29fb56b` |
| 7 | Discovery Engine | DONE — commit `c996e73` |
| 8 | Landing Page & Live Chat | DONE — commit `52992a5` |
| 9 | Channel Integrations + Help | DONE — commit `a05bd198` |
| 10 | OMS Integration | DONE — commit `32cff8f` |
| 11 | Reports & Dashboard + UX Polish | DONE — commit `5557d6a` |
| 12 | Settings & Final Polish | QUEUED (OVE) |

## Deferred Items
- Dropdown scoping (store filter on link dialogs) → Sprint 12

## OVE Sprint Queue
Sprint specs in `sprints/`. Queue in `sprints/queue.txt`. Run with `ove bigorders`.
