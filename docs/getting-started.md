# Getting Started

## Prerequisites

- Node.js 24 LTS
- npm 10+
- Git

## Clone and Install

```bash
git clone https://github.com/ShivSync/big-orders-crm.git
cd big-orders-crm
npm install
```

## Environment Setup

Create `.env.local` in the project root:

```bash
# Supabase CRM instance on EC2
NEXT_PUBLIC_SUPABASE_URL=http://54.179.223.103:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-jwt-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt-key>
SUPABASE_JWT_SECRET=<jwt-secret>
DATABASE_URL=postgresql://postgres:<pg-password>@54.179.223.103:5432/postgres
```

Get the actual values from the project lead or from CLAUDE.md (which contains the full credentials for authorized team members).

## Running Locally

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint check
npx vitest           # Run tests (103+ tests)
npx tsc --noEmit     # Type check
```

## Admin Login

- **URL:** http://localhost:3000 (local) or http://54.179.223.103:3000 (production)
- **Email:** admin@bigorders.vn
- **Password:** BigOrders2026!

## Project Structure

```
big-orders-crm/
├── docs/                    # This documentation
├── sprints/                 # Sprint specs + OVE queue
│   ├── queue.txt           # Sprint execution order
│   └── sprint-*.md         # Individual sprint specs with acceptance tests
├── src/
│   ├── __tests__/          # Vitest tests (types, i18n, migrations, security)
│   ├── app/
│   │   ├── [locale]/       # i18n-wrapped routes
│   │   │   ├── (dashboard)/  # Auth-protected dashboard routes
│   │   │   │   ├── customers/
│   │   │   │   ├── leads/
│   │   │   │   ├── organizations/
│   │   │   │   ├── pipeline/
│   │   │   │   └── users/
│   │   │   ├── login/
│   │   │   └── reset-password/
│   │   └── api/            # Server-side API routes
│   │       ├── leads/[id]/convert/
│   │       ├── leads/[id]/convert-to-opportunity/
│   │       ├── opportunities/
│   │       ├── opportunities/[id]/stage/
│   │       └── users/
│   ├── components/
│   │   ├── layout/         # Sidebar, Topbar
│   │   └── ui/             # shadcn/ui components (base-ui)
│   ├── i18n/               # next-intl config
│   ├── lib/supabase/       # Supabase client (server.ts, client.ts)
│   ├── messages/           # i18n translations (en.json, vi.json)
│   └── types/              # TypeScript type definitions
├── supabase/
│   └── migrations/         # SQL migration files (run on EC2)
└── vitest.config.ts
```

## Key Conventions

1. **Server-side mutations only** — All create/update/delete operations go through `/api/*` routes with permission checks. No direct Supabase writes from client components.
2. **RLS everywhere** — Every table has Row Level Security policies. No bypassing.
3. **Soft delete** — All tables use `deleted_at` timestamptz. Never hard delete.
4. **Bilingual** — All user-facing strings in `src/messages/{vi,en}.json`. Vietnamese is the default locale.
5. **RBAC** — 8 roles with permission slugs like `leads.view`, `pipeline.create`. Checked via `user_has_permission()` RPC.
6. **No PII in client queries** — Phone numbers and emails must not be fetched client-side without masking.
