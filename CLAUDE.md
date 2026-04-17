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

## Commands
```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint         # ESLint
```

## DB Migrations
SQL files in `supabase/migrations/`. Run against EC2 Supabase CRM instance.

## Supabase CRM Instance
- Kong: supabasekong-xi90e5re1c8yfxd2zx4gntof.54.179.223.103.sslip.io:8000
- Coolify project: Big Orders CRM (gvep39jqki1tyzjj6jmmfkqq)
