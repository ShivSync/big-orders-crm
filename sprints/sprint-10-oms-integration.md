# Sprint 10: OMS Integration

**Status:** PENDING

## Objectives
- Store master data sync from OMS (one-time + periodic refresh)
- Historical Big Order data seed from OMS big_order_customers
- OMS webhook receiver for future ATO integration (endpoint ready, not wired)
- Store sync scheduled job

## Database Changes
- No new tables
- Enhance `stores` table: add `oms_store_id`, `last_synced_at` columns
- Enhance `individual_customers`: populate oms_customer_id from matched records

## API Endpoints
- `POST /api/webhooks/oms` — OMS webhook receiver (ready for Phase 2 ATO)
- `POST /api/oms/sync-stores` — trigger store master sync
- `POST /api/oms/seed-customers` — one-time historical Big Order customer import
- `GET /api/oms/sync-status` — show last sync timestamps

## Environment Variables
- `OMS_API_BASE_URL` — OMS API endpoint
- `OMS_API_KEY` — API key for OMS store sync

## Key Behaviors
- Store sync: call OMS store list API → upsert into CRM stores table (match by aloha_id)
- Preserve manually added store data (territory_radius_km, lat, lng)
- Customer seed: read OMS big_order.big_order_customers → deduplicate by phone → create individual_customers with oms_customer_id set
- Skip customers already existing in CRM (phone match)
- Scheduled job: daily store sync check (cron or Supabase edge function)
- OMS webhook endpoint: accept POST, log to audit, ready for Phase 2 ATO data

## UI Pages
- `/settings/integrations` — OMS integration panel:
  - Store sync: last synced, store count, "Sync Now" button
  - Customer seed: "Import Historical Data" button (one-time), progress indicator
  - OMS connection status (test API connectivity)
  - Webhook URL for OMS to configure

## i18n Keys
- `integrations` section: omsSync, syncStores, syncNow, lastSynced, storeCount, importHistory, importing, importComplete, connectionStatus, connected, disconnected, webhookUrl

## Acceptance Tests

### Store Sync Tests
- [ ] POST /api/oms/sync-stores calls OMS API and upserts stores
- [ ] Existing stores updated (name, address), not duplicated
- [ ] New OMS stores created in CRM
- [ ] Manual fields (territory_radius_km, lat, lng) preserved during sync
- [ ] last_synced_at updated after sync

### Customer Seed Tests
- [ ] POST /api/oms/seed-customers reads OMS big_order_customers
- [ ] Deduplication by phone: existing CRM customers not duplicated
- [ ] oms_customer_id set on imported customers
- [ ] Only runs once (idempotent — skips already-imported records)

### Webhook Tests
- [ ] POST /api/webhooks/oms accepts valid payload
- [ ] Payload logged to audit_logs
- [ ] Returns 200 OK (no processing in Phase 1)

### Migration Tests
- [ ] stores.oms_store_id column added
- [ ] stores.last_synced_at column added

### Build Tests
- [ ] `npm run build` passes
- [ ] /settings/integrations route generates
