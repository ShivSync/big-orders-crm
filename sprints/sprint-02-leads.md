# Sprint 2: Lead Management

**Status:** COMPLETE

## Objectives
- Lead CRUD with full field set from architecture doc
- Activity/interaction logging per lead
- Lead list with filtering (stage, source, store), search, pagination
- Lead detail view with inline edit and stage pipeline
- Activity timeline on lead detail

## Database Tables (2)
1. `leads` — full_name, gender, dob, phone, email, address (ward/district/city), store_id, lead_type, lead_source, stage, assigned_to, notes, oms_customer_id, metadata, timestamps, soft delete
2. `activities` — entity_type (lead/customer/opportunity), entity_id, activity_type (call/email/meeting/note/sms/system), subject, description, created_by

## Database Constraints
- lead_type: individual, parent, school, company
- lead_source: manual, event, campaign, platform, web_app, company_school, google_maps, oms_sync
- stage: new, contacted, qualified, converted, lost
- activity_type: call, email, meeting, note, sms, system
- entity_type: lead, customer, opportunity

## Database Indexes
- leads: phone, email, stage, lead_type, lead_source, store_id, assigned_to, created_at, deleted_at (partial)
- activities: (entity_type, entity_id), activity_type, created_at

## RLS Policies
- leads: SELECT/INSERT/UPDATE for authenticated users, deleted_at IS NULL filter
- activities: SELECT/INSERT for authenticated users

## UI Pages
- `/leads` — list page with:
  - Stats cards (total, new, qualified, converted)
  - Search by name/phone/email
  - Filters: stage, source, store
  - Table: name, phone, type, source, stage (color-coded), store, assigned_to, created_at
  - Create lead dialog with all fields
  - Row click → navigate to detail
- `/leads/[id]` — detail page with:
  - Stage pipeline (clickable to change)
  - Detail card with all fields (view/edit toggle)
  - Activity timeline (right column) with icons per type
  - Add activity dialog
  - Delete lead (soft delete)

## i18n Keys Added
- `leads` section: 50+ keys covering all fields, stages, sources, types, activities

## Acceptance Tests

### Migration Tests
- [ ] leads table exists with all columns per architecture doc
- [ ] activities table exists with correct constraints
- [ ] All lead stages present in CHECK constraint
- [ ] All lead sources present in CHECK constraint
- [ ] All activity types present in CHECK constraint
- [ ] RLS enabled on both tables
- [ ] Indexes exist on key columns
- [ ] Foreign keys to stores and users tables

### Type Tests
- [ ] Lead type has all required fields
- [ ] LeadStage has 5 values
- [ ] LeadType has 4 values
- [ ] LeadSource has 8 values
- [ ] ActivityType has 6 values
- [ ] Activity type has entity_type, entity_id, activity_type

### i18n Tests
- [ ] leads section exists in both en.json and vi.json
- [ ] All stage labels have translations
- [ ] All source labels have translations
- [ ] All type labels have translations
- [ ] All activity type labels have translations
- [ ] Key counts match between languages

### Build Tests
- [ ] `npm run build` passes with zero errors
- [ ] /leads and /leads/[id] routes generate
