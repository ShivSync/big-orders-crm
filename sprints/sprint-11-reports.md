# Sprint 11: Reports & Dashboards

**Status:** PENDING

## Objectives
- Enhanced dashboard with real data from all CRM entities
- Recharts-powered visualizations (bar, line, funnel, pie)
- Reports page with configurable date range, store, region filters
- KPI targets and actuals comparison
- Data export (CSV) for leads, customers, orders

## Database Changes
- No new tables
- Add `kpi_targets` table: role, store_id, period (month), metric (leads_target, orders_target, revenue_target), value, created_by

## Charts (Recharts)
1. **Pipeline funnel** — leads by stage (new → contacted → qualified → converted)
2. **Revenue by store** — bar chart, monthly
3. **Revenue by source** — pie chart (lead_source breakdown)
4. **Lead conversion rate** — line chart over time
5. **Order status distribution** — stacked bar
6. **Top performing stores** — horizontal bar (by revenue)
7. **Monthly trend** — line chart (leads created, orders fulfilled, revenue)
8. **KPI gauge** — actual vs target per metric

## UI Pages
- `/dashboard` (enhanced) — replace placeholder stats with real data:
  - Total leads (with % change from last month)
  - Active opportunities (sum expected_value)
  - Pending orders (count where status in draft/confirmed/preparing)
  - Monthly revenue (sum total_value where status = fulfilled, this month)
  - Quick charts: pipeline funnel + monthly trend
- `/reports` — full reporting page:
  - Date range picker (this month, last month, quarter, custom)
  - Store filter, region filter
  - All 8 charts above
  - Data tables below charts with export CSV buttons
  - KPI section: set targets, view actuals

## Export Functionality
- Leads export: CSV with all lead fields + store name + assigned user name
- Customers export: CSV with profile + revenue stats
- Orders export: CSV with order details + items summary
- Export logged in audit_logs (Decree 13 compliance)

## i18n Keys
- `reports` section: title, dateRange, thisMonth, lastMonth, quarter, custom, export, exportCSV, pipelineFunnel, revenueByStore, revenueBySource, conversionRate, orderStatus, topStores, monthlyTrend, kpiTarget, kpiActual, setTarget
- Update `dashboard` section with new metric labels

## Acceptance Tests

### Dashboard Tests
- [ ] Total leads count matches leads table (non-deleted)
- [ ] Active opportunities value matches sum of expected_value (non-won/lost)
- [ ] Pending orders count matches orders with status in (draft, confirmed, preparing)
- [ ] Monthly revenue matches sum of fulfilled orders this month
- [ ] % change calculation correct vs previous month

### Chart Tests
- [ ] Pipeline funnel shows correct count per stage
- [ ] Revenue by store aggregates correctly
- [ ] Revenue by source matches lead_source on orders
- [ ] Monthly trend data points correct for each month
- [ ] Charts render without errors (no hydration mismatches)

### Export Tests
- [ ] Leads CSV contains all expected columns
- [ ] Customers CSV contains revenue stats
- [ ] Orders CSV includes item summary
- [ ] Export creates audit_log entry with user_id and export parameters
- [ ] Large export (1000+ rows) completes without timeout

### KPI Tests
- [ ] Can set monthly KPI target per store
- [ ] Actual calculated from real data
- [ ] KPI gauge shows correct percentage

### i18n Tests
- [ ] reports section in both languages
- [ ] All chart labels translated
- [ ] Date range options translated

### Build Tests
- [ ] `npm run build` passes
- [ ] Recharts loads correctly (no SSR issues — dynamic import)
- [ ] /reports route generates
