# Database Schema

## Overview

PostgreSQL via Supabase self-hosted on EC2. All tables have RLS enabled, soft delete via `deleted_at`, and `updated_at` triggers.

## Tables (19 total as of Sprint 4)

### Sprint 1: Foundation (13 tables)

| Table | Purpose |
|-------|---------|
| `users` | CRM user accounts (linked to Supabase Auth) |
| `roles` | RBAC roles (admin, big_order_manager, etc.) |
| `permissions` | Permission definitions (leads.view, pipeline.create, etc.) |
| `objects` | CRM objects (leads, pipeline, customers, etc.) |
| `role_permissions` | Which roles have which permissions |
| `role_objects` | Store filtering rules per role-object combo |
| `teams` | Team groupings by region |
| `user_roles` | User → role assignments |
| `user_teams` | User → team assignments |
| `user_stores` | User → store assignments |
| `stores` | KFC store locations (260+ stores) |
| `audit_logs` | Action audit trail |
| `business_rules` | Configurable business rules (approval thresholds, etc.) |

### Sprint 2: Lead Management (2 tables)

| Table | Purpose |
|-------|---------|
| `leads` | Sales leads (individual, parent, school, company) |
| `activities` | Activity log (calls, emails, meetings, notes) for leads/customers/opportunities |

**Lead stages:** new → contacted → qualified → converted → lost

### Sprint 3: Customers & Organizations (3 tables)

| Table | Purpose |
|-------|---------|
| `individual_customers` | B2B contact persons |
| `organizations` | Companies, schools, hotels, etc. |
| `customer_org_links` | Many-to-many relationship between individuals and organizations |

### Sprint 4: Sales Pipeline (1 table)

| Table | Purpose |
|-------|---------|
| `opportunities` | Sales opportunities with stage tracking |

**Opportunity stages:** new → consulting → quoted → negotiating → won/lost

## RLS Pattern

Every table follows this pattern:

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

-- SELECT: requires <object>.view permission
CREATE POLICY <table>_select ON <table>
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_root = true)
      OR user_has_permission(auth.uid(), '<object>.view')
    )
  );

-- INSERT: requires <object>.create permission
-- UPDATE: requires <object>.edit, only non-deleted rows
-- SOFT DELETE: requires <object>.delete, separate policy
```

## Migrations

SQL files in `supabase/migrations/`. Applied in order:

| File | Sprint | Content |
|------|--------|---------|
| `20260417000000_sprint1_foundation.sql` | 1 | 13 tables, RBAC, stores, audit |
| `20260417100000_sprint2_leads.sql` | 2 | leads, activities |
| `20260417200000_security_fixes.sql` | 2.5 | RLS hardening (Codex review) |
| `20260417300000_sprint3_customers_orgs.sql` | 3 | customers, organizations, links |
| `20260417400000_sprint3_security_fixes.sql` | 3 | RLS hardening (Codex review) |
| `20260417500000_sprint4_pipeline.sql` | 4 | opportunities, pipeline permissions |
| `20260417600000_sprint4_security_fixes.sql` | 4 | RLS fix: edit/delete separation, unique index |

### Running Migrations

```bash
cat supabase/migrations/<file>.sql | \
  ssh -i ~/.ssh/shiv-ec2.pem ubuntu@54.179.223.103 \
  "sudo docker exec -i supabase-db-xi90e5re1c8yfxd2zx4gntof psql -U postgres -d postgres"
```

## Key Functions

| Function | Purpose |
|----------|---------|
| `user_has_permission(user_id, slug)` | Check if user has a specific permission |
| `update_updated_at()` | Trigger function to auto-set `updated_at` on row update |
