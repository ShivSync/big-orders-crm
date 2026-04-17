# Sprint 4: Sales Pipeline & Opportunities

**Status:** PENDING

## Objectives
- Opportunity CRUD tied to leads and customers
- Pipeline Kanban board (drag-and-drop stage changes)
- Lead → Opportunity conversion flow
- Expected value and date tracking
- Lost reason tracking

## Database Tables (1)
1. `opportunities` — lead_id (FK), customer_id (FK, set on conversion), title, stage (new/consulting/quoted/negotiating/won/lost), expected_value (VND integer), expected_date, actual_value (VND, filled on won), lost_reason (filled on lost), assigned_to (FK users), notes, order_id (FK, set when won→order), metadata

## Key Behaviors
- Lead at stage 'qualified' can be converted to opportunity
- Opportunity stages: new → consulting → quoted → negotiating → won/lost
- Won opportunity can create a Big Order (Sprint 5 placeholder — set order_id)
- Lost opportunity requires lost_reason
- Activities from lead carry over to opportunity view
- Pipeline value = sum of expected_value for non-lost/non-won opportunities

## UI Pages
- `/pipeline` — Kanban board with columns per stage:
  - Cards show: title, expected_value (formatted VND), expected_date, assigned_to
  - Drag card between columns to change stage
  - Click card → opportunity detail
  - "Won" column: show actual_value
  - "Lost" column: show lost_reason
  - Pipeline summary bar: count + total value per stage
- Opportunity detail (dialog or inline on pipeline page):
  - All fields editable
  - Activity timeline (reuses activities table with entity_type='opportunity')
  - Link to source lead
  - Link to customer (if converted)

## i18n Keys
- `pipeline` section: title, createOpportunity, stage labels (stageNew, stageConsulting, stageQuoted, stageNegotiating, stageWon, stageLost), expectedValue, expectedDate, actualValue, lostReason, pipelineValue, convertToOrder

## Acceptance Tests

### Migration Tests
- [ ] opportunities table exists with all columns
- [ ] Stage CHECK constraint: new, consulting, quoted, negotiating, won, lost
- [ ] Foreign keys: lead_id → leads, customer_id → individual_customers, assigned_to → users, order_id → orders (nullable)
- [ ] RLS enabled
- [ ] Indexes on stage, lead_id, customer_id, assigned_to, expected_date
- [ ] Soft delete (deleted_at)

### Type Tests
- [ ] Opportunity type has all fields
- [ ] OpportunityStage has 6 values
- [ ] expected_value and actual_value are numbers (VND integer)

### i18n Tests
- [ ] pipeline section exists in both languages
- [ ] All 6 stage labels translated
- [ ] Pipeline-specific terms (expectedValue, lostReason, etc.) translated

### Functional Tests
- [ ] Can create opportunity from qualified lead
- [ ] Dragging card changes stage in DB
- [ ] Won stage requires actual_value
- [ ] Lost stage requires lost_reason
- [ ] Pipeline value calculation correct
- [ ] Activities linked to opportunity display correctly

### Build Tests
- [ ] `npm run build` passes
- [ ] /pipeline route generates
