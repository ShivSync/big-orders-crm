# Database Schema

## Overview

PostgreSQL via Supabase self-hosted on EC2. All tables have RLS enabled, soft delete via `deleted_at`, and `updated_at` triggers.

## Tables (33 total as of Sprint 11)

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

### Sprint 5: Orders & Menu (5 tables)

| Table | Purpose |
|-------|---------|
| `menu_categories` | Menu category groupings (combo_bo, combo_hde, alacard) |
| `menu_items` | Menu items with POS codes, bilingual names, VND prices (107 seeded) |
| `orders` | Big orders with status lifecycle, discount, approval |
| `order_items` | Order line items with price snapshot at creation time |
| `order_status_history` | Audit trail for order status changes |

**Order statuses:** draft → confirmed → preparing → ready → fulfilled / cancelled
**Payment statuses:** unpaid / partial / paid
**Event types:** birthday, corporate, school_event, meeting, custom
**Sources:** crm, landing_page, phone, zalo, facebook, oms_migrated
**Business rules:** discount >15% or total >50M VND → requires approval

### Sprint 6: Campaigns & Events (3 tables)

| Table | Purpose |
|-------|---------|
| `campaigns` | SMS/email campaign definitions with segment builder |
| `campaign_recipients` | Per-recipient delivery tracking (pending → sent → delivered/failed/bounced) |
| `recurring_events` | Customer recurring events (birthdays, anniversaries, etc.) |

**Campaign statuses:** draft → scheduled → sending → sent / cancelled
**Campaign types:** sms, email

### Sprint 7: Discovery Engine (2 tables + seeds)

| Table | Purpose |
|-------|---------|
| `system_settings` | Key-value system configuration store |

**Seeds:** 244 KFC stores, 665 competitor locations

### Sprint 8: Landing Page & Chat (4 tables)

| Table | Purpose |
|-------|---------|
| `landing_page_content` | CMS-driven landing page sections |
| `chat_sessions` | Live chat session tracking |
| `chat_messages` | Chat message history (WebSocket-backed) |
| `bot_faq` | FAQ entries for chat bot auto-responses |

### Sprint 9: Channel Integrations (1 table)

| Table | Purpose |
|-------|---------|
| `channel_messages` | Unified multi-channel message store (Zalo, Facebook, SMS, ZNS, Antbuddy) |

#### `channel_messages` — Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Message ID |
| `channel` | `text` | NOT NULL, CHECK (`zalo`, `facebook`, `sms`, `zns`, `antbuddy`) | Source channel |
| `direction` | `text` | NOT NULL, CHECK (`inbound`, `outbound`) | Message direction |
| `lead_id` | `uuid` | FK → `leads(id)`, nullable | Linked lead |
| `customer_id` | `uuid` | FK → `individual_customers(id)`, nullable | Linked customer |
| `sender_id` | `text` | nullable | External sender ID (Zalo UID, FB PSID, phone) |
| `recipient_id` | `text` | nullable | External recipient ID |
| `message_body` | `text` | nullable | Message text content |
| `template_id` | `text` | nullable | ZNS template ID (outbound ZNS only) |
| `template_data` | `jsonb` | nullable | ZNS template variables |
| `external_id` | `text` | nullable | Provider message ID (Vihat, Zalo, FB) |
| `campaign_id` | `uuid` | FK → `campaigns(id)`, nullable | Linked campaign (for campaign sends) |
| `status` | `text` | NOT NULL, default `'pending'`, CHECK (`pending`, `sent`, `delivered`, `failed`, `read`) | Delivery status |
| `is_read` | `boolean` | NOT NULL, default `false` | Read flag for inbox UI |
| `metadata` | `jsonb` | nullable | Channel-specific payload (attachments, call data, etc.) |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last update (trigger) |
| `deleted_at` | `timestamptz` | nullable | Soft delete |
| `created_by` | `uuid` | FK → `users(id)`, nullable | CRM user who sent (outbound only) |

#### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_channel_messages_channel` | `channel` | Filter by channel |
| `idx_channel_messages_lead_id` | `lead_id` | Messages tab on lead 360 |
| `idx_channel_messages_customer_id` | `customer_id` | Messages tab on customer 360 |
| `idx_channel_messages_campaign_id` | `campaign_id` | Campaign delivery tracking |
| `idx_channel_messages_created_at` | `created_at DESC` | Inbox chronological sort |
| `idx_channel_messages_status` | `status` | Filter by delivery status |

#### RLS Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `channel_messages_select` | SELECT | `deleted_at IS NULL` AND (`is_root` OR `user_has_permission(uid, 'channels.view')`) |
| `channel_messages_insert` | INSERT | `is_root` OR `user_has_permission(uid, 'channels.send')` |
| `channel_messages_update` | UPDATE | `deleted_at IS NULL` AND (`is_root` OR `user_has_permission(uid, 'channels.send')`) |
| `channel_messages_delete` | UPDATE (soft) | `deleted_at IS NULL` AND (`is_root` OR `user_has_permission(uid, 'channels.send')`) |

#### Permissions

| Slug | Description |
|------|-------------|
| `channels.view` | View channel messages in inbox and 360 views |
| `channels.send` | Send outbound messages (SMS, ZNS) and manage messages |

### Sprint 10: OMS Integration (schema changes)

**Modified table: `stores`**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `oms_store_id` | `text` | nullable, unique | OMS external store identifier |
| `last_synced_at` | `timestamptz` | nullable | Last successful OMS sync timestamp |

#### New Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_stores_oms_store_id` | `oms_store_id` | OMS store lookup during sync |
| `idx_stores_aloha_id` | `aloha_id` | Store matching by Aloha POS ID |

#### Permissions

| Slug | Description |
|------|-------------|
| `integrations.view` | View OMS integration status and sync history |
| `integrations.manage` | Trigger OMS sync, seed customers, manage webhook settings |

### Sprint 11: Reports & Analytics (1 table)

| Table | Purpose |
|-------|---------|
| `kpi_targets` | KPI target definitions for reports comparison and goal tracking |

#### `kpi_targets` — Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Target ID |
| `metric` | `text` | NOT NULL | Metric identifier (e.g. `monthly_revenue`, `lead_conversion`, `orders_count`) |
| `target_value` | `numeric` | NOT NULL | Target value for the metric |
| `period_start` | `date` | NOT NULL | Period start date |
| `period_end` | `date` | NOT NULL | Period end date |
| `store_id` | `uuid` | FK → `stores(id)`, nullable | Store scope (null = company-wide) |
| `region` | `text` | nullable | Region scope (N, S, C) |
| `created_by` | `uuid` | FK → `users(id)`, nullable | User who created the target |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last update (trigger) |
| `deleted_at` | `timestamptz` | nullable | Soft delete |

#### RLS Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `kpi_targets_select` | SELECT | `deleted_at IS NULL` AND (`is_root` OR `user_has_permission(uid, 'reports.view')`) |
| `kpi_targets_insert` | INSERT | `is_root` OR `user_has_permission(uid, 'reports.export')` |
| `kpi_targets_update` | UPDATE | `deleted_at IS NULL` AND (`is_root` OR `user_has_permission(uid, 'reports.export')`) |
| `kpi_targets_delete` | UPDATE (soft) | `deleted_at IS NULL` AND (`is_root` OR `user_has_permission(uid, 'reports.export')`) |

#### Permissions

| Slug | Description |
|------|-------------|
| `reports.view` | View reports, analytics dashboards, and KPI targets |
| `reports.export` | Export CRM data as CSV and manage KPI targets |

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
| `20260417700000_sprint5_orders_menu.sql` | 5 | menu_categories, menu_items (107 seed), orders, order_items, order_status_history, permissions |

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
