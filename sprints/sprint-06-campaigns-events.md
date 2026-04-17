# Sprint 6: Campaigns & Recurring Events

**Status:** PENDING

## Objectives
- Campaign builder (SMS + email) with segment filtering
- Campaign send tracking (pending/sent/delivered/failed)
- Amazon SES integration for email campaigns
- Recurring event reminders (birthdays, anniversaries)
- Reminder notification pipeline

## Database Tables (3)
1. `campaigns` — name, type (sms/email), segment_filters (jsonb: customer_type, city, store, last_order, revenue range), subject, template (body with {{variables}}), status (draft/scheduled/sending/sent/cancelled), scheduled_at, sent_count, delivered_count, failed_count, created_by (FK)
2. `campaign_recipients` — campaign_id (FK), customer_id (FK individual_customers), channel (sms/email), destination (phone/email), status (pending/sent/delivered/failed/bounced), sent_at, error
3. `recurring_events` — customer_id (FK), event_type (birthday/company_anniversary/children_day/custom), event_name, event_date (recurring date), reminder_days_before (default 30), last_reminded_at, active

## Key Behaviors
- Segment builder: filter customers by type, city, store, revenue band, last_order date
- Template variables: {{customer_name}}, {{store_name}}, {{event_date}}
- Email via Amazon SES (API integration)
- SMS via Vihat Gateway (Sprint 9 dependency — stub in Sprint 6, wire in Sprint 9)
- Recurring events: daily cron checks event_date (month+day) minus reminder_days_before
- Reminder creates an activity on the customer record + optionally triggers campaign

## UI Pages
- `/campaigns` — list with filters (status, type), create button
  - Table: name, type, status, scheduled_at, sent/delivered/failed counts
- `/campaigns/[id]` — campaign detail:
  - Segment filter builder (visual)
  - Template editor with variable picker
  - Preview with sample customer data
  - Recipient list (after segment calculated)
  - Send/schedule buttons
  - Delivery stats (bar chart: sent/delivered/failed)
- Customer detail page: recurring events section (list events, add new, edit)

## i18n Keys
- `campaigns` section: title, createCampaign, type labels, status labels, template, subject, segmentFilters, schedule, send, preview, recipientCount, deliveryStats
- `events` section: title, addEvent, eventType labels, eventDate, reminderDays, lastReminded

## Acceptance Tests

### Migration Tests
- [ ] campaigns table with all columns and status CHECK constraint
- [ ] campaign_recipients with status CHECK constraint
- [ ] recurring_events with event_type CHECK constraint
- [ ] Foreign keys: campaign_recipients.customer_id → individual_customers
- [ ] Foreign keys: recurring_events.customer_id → individual_customers
- [ ] RLS on all 3 tables
- [ ] Indexes on campaigns.status, campaign_recipients.(campaign_id, status)

### Type Tests
- [ ] Campaign type with segment_filters as jsonb
- [ ] CampaignRecipient with status tracking
- [ ] RecurringEvent with event_type enum
- [ ] CampaignStatus has 5 values
- [ ] RecipientStatus has 5 values
- [ ] EventType has 4 values

### i18n Tests
- [ ] campaigns section in both languages
- [ ] events section in both languages
- [ ] All status and type labels translated

### Functional Tests
- [ ] Segment filter returns correct customer subset
- [ ] Template variable replacement works with sample data
- [ ] Campaign status transitions: draft → scheduled → sending → sent
- [ ] Recipient status tracking per individual
- [ ] Recurring event reminder triggers at correct day offset
- [ ] Cancelled campaign stops sending

### Build Tests
- [ ] `npm run build` passes
- [ ] /campaigns, /campaigns/[id] routes generate
