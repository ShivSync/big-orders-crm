# Architecture

## Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Next.js 16 │────▶│  Supabase Kong   │────▶│  PostgreSQL     │
│  App Router │     │  (API Gateway)   │     │  (with RLS)     │
│  + Tailwind │     │  port 8000       │     │                 │
│  port 3000  │     └──────────────────┘     └─────────────────┘
└─────────────┘            EC2 54.179.223.103
```

## 23 Locked Architecture Decisions

Full list in `~/Shiv-1/tech/big-orders/ARCHITECTURE.md`. Key decisions:

| ID | Decision | Rationale |
|----|----------|-----------|
| D-2 | Next.js + Supabase | Modern stack, self-hosted control |
| D-3 | CRM owns Big Order lifecycle | OMS doesn't natively support Big Orders |
| D-6 | RLS for authorization | Database-level enforcement, not middleware |
| D-7 | Soft delete everywhere | Decree 13 compliance (data retention) |
| D-14 | OMS-aligned RBAC | 8 roles matching OMS admin schema |
| D-15 | Dual language (vi/en) | Vietnamese default, English secondary |
| D-19 | Hard entity separation | individual_customers + organizations with optional links |
| D-21 | CRM-managed menu (107 items) | 3 categories, POS codes, bilingual |

## Data Flow

### Authentication
1. User submits email/password at `/login`
2. Supabase Auth validates credentials, returns JWT
3. JWT stored in cookie, sent with every request
4. RLS policies use `auth.uid()` to enforce row-level access

### RBAC
1. User → `user_roles` → `roles` → `role_permissions` → `permissions`
2. Each permission has a slug like `leads.view`, `pipeline.create`
3. RLS policies call `user_has_permission(auth.uid(), 'slug')` to check access
4. Store filtering: `role_objects` controls ALL/SOME/ONE store access per role

### Mutations
1. Client calls server API route (e.g., `POST /api/opportunities`)
2. Route authenticates user via `supabase.auth.getUser()`
3. Route checks permission via `user_has_permission` RPC
4. Route validates input and referenced entities
5. Route performs Supabase insert/update (RLS provides second layer of defense)
6. Generic error returned to client (no raw DB errors)

## i18n Architecture

- **Library:** next-intl
- **Routing:** `[locale]` dynamic segment — `/vi/dashboard`, `/en/dashboard`
- **Messages:** `src/messages/vi.json` and `src/messages/en.json`
- **Default locale:** Vietnamese (`vi`)
- **Convention:** Every user-facing string must be in both message files
