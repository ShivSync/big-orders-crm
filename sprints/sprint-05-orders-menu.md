# Sprint 5: Big Orders & Menu Management

**Status:** PENDING

## Objectives
- Menu categories and items (107 items, 3 categories from official 2025 pricing template)
- Order creation with item selection, quantity, pricing
- Order status lifecycle: draft → confirmed → preparing → ready → fulfilled → cancelled
- Discount and approval workflow (business rules)
- Order status history audit trail
- Price snapshot on order creation

## Database Tables (4)
1. `menu_categories` — name_vi, name_en, slug (unique), sort_order, active. Seed: combo_bo (21 items), combo_hde (24 items), alacard (62 items)
2. `menu_items` — category_id (FK), item_code (POS/Aloha code), pos_name, name_vi, name_en, description_vi, description_en, price (VND incl. 8% VAT), components (breakdown string with POS codes), min_quantity, max_quantity, active, sort_order. Seed: 107 items
3. `orders` — order_number (auto "BO-2026-XXXXX"), customer_id (FK), organization_id (FK nullable), opportunity_id (FK nullable), store_id (FK), contact_name, contact_phone, event_type (birthday/corporate/school_event/meeting/custom), scheduled_date, guest_count, subtotal, discount_pct, discount_amount, total_value, status (draft/confirmed/preparing/ready/fulfilled/cancelled), payment_status (unpaid/partial/paid), delivery_notes, assigned_to (FK), approved_by (FK nullable), aloha_bill_id (nullable), source (crm/landing_page/phone/zalo/facebook/oms_migrated), notes
4. `order_items` — order_id (FK), menu_item_id (FK), item_code (snapshot), name_vi (snapshot), name_en (snapshot), quantity, unit_price (snapshot VND), line_total (qty × price), special_requests
5. `order_status_history` — order_id (FK), from_status (nullable for initial), to_status, changed_by (FK users), notes (required for cancellation), created_at

## Key Behaviors
- Auto-generate order_number: "BO-YYYY-NNNNN" sequential
- Price snapshot: order_items store price at order creation time, not current menu price
- Discount: if discount_pct > business_rules.discount_limit (15%), route to approval_role
- Approval: if total_value > business_rules.approval_threshold (50M VND), route to Omni Head
- Status changes logged to order_status_history automatically
- Cancellation requires notes (reason)
- Fulfilled orders update customer.total_revenue, customer.order_count, customer.last_order_date
- Won opportunity links to order via opportunity.order_id

## UI Pages
- `/orders` — list with filters (status, store, date range, source), search by order_number/contact_name
  - Stats: total orders, pending, fulfilled this month, revenue this month
  - Table: order_number, contact_name, store, event_type, scheduled_date, total_value, status, payment_status
- `/orders/new` — order creation wizard:
  - Step 1: Select customer or enter contact info + select store
  - Step 2: Browse menu by category, add items with quantity
  - Step 3: Review order, apply discount, add delivery notes
  - Step 4: Confirm (creates as draft or confirmed based on rules)
- `/orders/[id]` — order detail:
  - Order info card (all fields)
  - Item list with quantities and prices
  - Status pipeline (clickable, with approval gate)
  - Status history timeline
  - Aloha bill ID input (for preparing stage)
  - Payment status toggle

## i18n Keys
- `orders` section: title, createOrder, orderNumber, contactName, contactPhone, eventType, scheduledDate, guestCount, subtotal, discount, totalValue, paymentStatus, deliveryNotes, alohaBillId, source labels, status labels (draft/confirmed/preparing/ready/fulfilled/cancelled), event_type labels, payment_status labels
- `menu` section: title, categories, items, itemCode, price, components, addItem, quantity

## Acceptance Tests

### Migration Tests
- [ ] menu_categories table with 3 seeded categories
- [ ] menu_items table with 107 seeded items (verify count)
- [ ] orders table with all columns and CHECK constraints
- [ ] order_items table with snapshot columns (item_code, name_vi, name_en, unit_price)
- [ ] order_status_history table
- [ ] order_number UNIQUE constraint
- [ ] Status CHECK: draft, confirmed, preparing, ready, fulfilled, cancelled
- [ ] Payment status CHECK: unpaid, partial, paid
- [ ] Event type CHECK: birthday, corporate, school_event, meeting, custom
- [ ] Source CHECK: crm, landing_page, phone, zalo, facebook, oms_migrated
- [ ] RLS on all tables
- [ ] Indexes on order_number, store_id, status, customer_id, scheduled_date

### Data Integrity Tests
- [ ] Menu items: verify all 107 items have item_code, name_vi, name_en, price > 0
- [ ] Menu categories: combo_bo has 21 items, combo_hde has 24, alacard has 62
- [ ] Price snapshot: changing menu_item.price does NOT affect existing order_items.unit_price

### Type Tests
- [ ] Order type has all fields including order_number, aloha_bill_id
- [ ] OrderItem type has snapshot fields
- [ ] OrderStatus has 6 values
- [ ] PaymentStatus has 3 values
- [ ] EventType has 5 values
- [ ] MenuItem type has item_code, components, price

### i18n Tests
- [ ] orders section in both languages
- [ ] menu section in both languages
- [ ] All status/event_type/source labels translated

### Functional Tests
- [ ] Order creation wizard produces correct subtotal calculation
- [ ] Discount > 15% triggers approval requirement
- [ ] Total > 50M VND triggers approval requirement
- [ ] Status change creates order_status_history record
- [ ] Cancellation requires notes
- [ ] Fulfilled order updates customer revenue stats

### Build Tests
- [ ] `npm run build` passes
- [ ] /orders, /orders/new, /orders/[id] routes generate
