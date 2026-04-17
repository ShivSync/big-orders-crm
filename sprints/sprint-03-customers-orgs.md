# Sprint 3: Customers & Organizations

**Status:** PENDING

## Objectives
- Individual customer CRUD (converted from leads or created directly)
- Organization CRUD (company, school, university, hotel, etc.)
- Contact-organization linking (customer_org_links)
- Lead → Customer conversion flow
- Customer/Organization 360-degree view

## Database Tables (3)
1. `individual_customers` — lead_id, oms_customer_id, full_name, phone (unique where not deleted), email, contact_type (parent/employee/teacher/event_organizer/other), gender, dob, address (ward/district/city), store_id, total_revenue (cached), order_count (cached), last_order_date (cached), consent_given, consent_date, tags[], metadata
2. `organizations` — name_vi, name_en, tax_id (unique where not deleted), organization_type (company/school/university/hotel/club/government_office/event_venue/other), industry, size (small/medium/large/enterprise), address (ward/district/city), website, main_phone, main_email, store_id, lat, lng, total_revenue (cached), order_count (cached), last_order_date (cached), tags[], metadata
3. `customer_org_links` — individual_id, organization_id (unique combo), role_title, is_primary_contact, start_date, active

## Key Behaviors
- Lead conversion: when lead stage = 'converted', create individual_customer from lead data, set lead.oms_customer_id
- Phone is primary match key (D-4) — dedup on phone when creating customer
- Organization revenue = aggregate of all linked contacts' orders
- Consent tracking (Decree 13) — consent_given + consent_date required for marketing
- Tags for flexible categorization

## UI Pages
- `/customers` — list with filters (contact_type, store, city), search, stats (total, with orders, revenue)
- `/customers/[id]` — 360 view: profile, linked organizations, order history (placeholder), activities, revenue stats
- `/organizations` — list with filters (type, industry, city, store), search
- `/organizations/[id]` — 360 view: profile, linked contacts, aggregate revenue, activities
- Lead detail page: add "Convert to Customer" button when stage = qualified/contacted

## i18n Keys
- `customers` section: title, createCustomer, editCustomer, contactType, consentGiven, totalRevenue, orderCount, lastOrder, convertFromLead, all contact_type labels
- `organizations` section: title, createOrg, editOrg, orgType, industry, size, taxId, all organization_type labels, all industry labels, all size labels

## Acceptance Tests

### Migration Tests
- [ ] individual_customers table exists with all columns
- [ ] organizations table exists with all columns
- [ ] customer_org_links table exists with unique constraint on (individual_id, organization_id)
- [ ] Phone unique constraint on individual_customers (where deleted_at IS NULL)
- [ ] Tax_id unique constraint on organizations (where not null, not deleted)
- [ ] contact_type CHECK constraint with all 5 values
- [ ] organization_type CHECK constraint with all 8 values
- [ ] RLS enabled on all 3 tables
- [ ] Foreign keys to stores table
- [ ] Soft delete (deleted_at) on customers and organizations

### Type Tests
- [ ] IndividualCustomer type has all fields including consent_given, consent_date
- [ ] Organization type has name_vi and name_en
- [ ] CustomerOrgLink type has role_title and is_primary_contact
- [ ] ContactType has 5 values
- [ ] OrganizationType has 8 values

### i18n Tests
- [ ] customers section exists in both languages with matching keys
- [ ] organizations section exists in both languages with matching keys
- [ ] All contact_type labels translated
- [ ] All organization_type labels translated

### Functional Tests
- [ ] Can create individual customer from lead data
- [ ] Phone dedup prevents duplicate customer creation
- [ ] Can link customer to organization with role_title
- [ ] Can view customer 360 with linked organizations
- [ ] Can view organization 360 with linked contacts

### Build Tests
- [ ] `npm run build` passes
- [ ] /customers, /customers/[id], /organizations, /organizations/[id] routes generate
