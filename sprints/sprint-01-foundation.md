# Sprint 1: Foundation — Auth + RBAC + i18n + Base Layout

**Status:** COMPLETE

## Objectives
- Set up Next.js 15 App Router with Tailwind + shadcn/ui
- Supabase Auth (email/password) with session middleware
- OMS-aligned RBAC (roles, permissions, objects, store filtering)
- Dual language support (Vietnamese default + English)
- Base layout (sidebar, topbar, dashboard)
- Dockerfile for Coolify deployment

## Database Tables (13)
1. `users` — auth-linked profile with region, language_preference, is_root
2. `roles` — 8 seeded roles (bilingual)
3. `permissions` — 28 permissions across 12 objects
4. `objects` — 12 CRM screen objects
5. `role_permissions` — N:N role-permission
6. `role_objects` — role-scoped object access with filter_store (ALL/SOME/ONE)
7. `teams` — team groupings with region
8. `user_roles` — N:N user-role
9. `user_teams` — N:N user-team
10. `user_stores` — N:N user-store with is_primary
11. `stores` — 5 test stores (2 North, 1 Central, 2 South)
12. `business_rules` — 3 seeded rules (order threshold, discount limit, reassignment)
13. `audit_logs` — change tracking

## Database Functions
- `mask_phone(text)` — returns masked phone (e.g., 0912***456)
- `mask_email(text)` — returns masked email (e.g., s***@email.com)
- `user_has_permission(uuid, text)` — checks role-permission chain, root bypass
- `update_updated_at()` — trigger function for updated_at columns

## UI Pages
- `/login` — email/password form, error handling
- `/reset-password` — email input, sends reset link
- `/dashboard` — 4 stat cards (total leads, active opportunities, pending orders, monthly revenue)
- `/users` — CRUD table with create dialog, role assignment, status toggle
- `/roles` — expandable permission matrix, toggle permissions, create role
- `/teams` — list with member count, create with region

## Layout Components
- `Sidebar` — 4 nav sections (dashboard, CRM, analytics, admin), active highlighting
- `Topbar` — user dropdown, locale switcher (VI/EN), logout

## Acceptance Tests

### Migration Tests
- [ ] All 13 tables exist with correct columns
- [ ] RLS enabled on all tables
- [ ] 8 roles seeded with correct slugs
- [ ] 12 objects seeded
- [ ] 28 permissions seeded
- [ ] 5 stores seeded with correct regions
- [ ] 3 business rules seeded
- [ ] mask_phone and mask_email functions exist
- [ ] user_has_permission function exists and root bypass works

### i18n Tests
- [ ] en.json and vi.json have identical key sets
- [ ] All sections present: common, nav, auth, users, roles, teams, dashboard, regions
- [ ] No empty string values

### Build Tests
- [ ] `npm run build` passes with zero errors
- [ ] All pages generate (login, reset-password, dashboard, users, roles, teams)
