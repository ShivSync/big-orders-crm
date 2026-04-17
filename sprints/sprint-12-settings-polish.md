# Sprint 12: Settings & Polish

**Status:** PENDING

## Objectives
- Settings page: user preferences, business rules UI, system configuration
- Business rules admin (edit approval thresholds, discount limits)
- Data protection workflows (Decree 13): consent management, data export request, deletion request
- Final QA pass: fix all edge cases, responsive design, accessibility
- Performance optimization: loading states, error boundaries, pagination
- Security review: RLS audit, input validation, CSRF tokens

## UI Pages
- `/settings` — settings hub:
  - **Profile:** user name, phone, language preference, password change
  - **Business Rules:** edit approval_threshold, discount_limit, reassignment rules (admin only)
  - **System:** audit log viewer (admin only), data export tools
  - **Integrations:** (from Sprint 10) OMS sync panel
  - **Landing Page CMS:** (from Sprint 8) content editor
  - **Chat Config:** (from Sprint 8) bot FAQ, flow settings
  - **Data Protection:** consent report, deletion request queue

## Key Behaviors
- Business rules: admin can edit rule_value jsonb, changes take effect immediately
- Audit log viewer: filterable by entity_type, user, date range
- Consent report: list customers with consent_given status, export for compliance
- Deletion request: soft-delete customer record, archive to cold storage, log in audit
- Password change: uses Supabase Auth updateUser
- Language preference: saved to DB, applied on next page load

## Cross-Sprint Polish
- [ ] All pages have loading skeleton states (not just "Loading...")
- [ ] All pages have error boundaries with retry
- [ ] All tables have pagination (25 per page default)
- [ ] All forms have proper validation with error messages (bilingual)
- [ ] Mobile responsive: sidebar collapses, tables scroll horizontally
- [ ] Keyboard navigation: tab order, enter to submit, escape to close dialogs
- [ ] Toast notifications for all CRUD operations (sonner)
- [ ] Consistent date formatting per locale
- [ ] Empty states with helpful messaging and CTAs

## Security Checklist
- [ ] RLS policies verified on ALL tables (no bypass paths)
- [ ] Service role key NEVER exposed to client
- [ ] All form inputs sanitized (XSS prevention via React, SQL injection prevented by Supabase parameterized queries)
- [ ] CSRF protection on all mutation endpoints
- [ ] Rate limiting on public endpoints (/api/leads/public, /api/leads/embed, webhooks)
- [ ] Webhook signature verification (Zalo, Facebook, Antbuddy)
- [ ] No PII in server logs
- [ ] Data masking enforced for unauthorized roles

## i18n Keys
- `settings` section: title, profile, businessRules, system, dataProtection, changePassword, currentPassword, newPassword, confirmPassword, passwordChanged, approvalThreshold, discountLimit, auditLog, consentReport, deletionRequest

## Acceptance Tests

### Settings Tests
- [ ] Profile update saves name, phone, language_preference
- [ ] Password change works via Supabase Auth
- [ ] Business rules editable by admin only (non-admin sees read-only)
- [ ] Rule changes take effect immediately (no restart needed)

### Data Protection Tests
- [ ] Consent report lists customers with consent_given = true/false
- [ ] Consent report exportable as CSV
- [ ] Deletion request soft-deletes customer and all related data
- [ ] Deletion logged in audit_logs with user_id and reason
- [ ] Deleted customer no longer appears in any query (RLS filter)

### Security Tests
- [ ] Non-admin cannot access business rules edit
- [ ] Non-admin cannot access audit log viewer
- [ ] Service role key not in any client-side code
- [ ] Public endpoints reject malformed input
- [ ] Phone/email masking works for unauthorized roles
- [ ] Webhook endpoints reject invalid signatures

### Polish Tests
- [ ] All 12+ pages have loading states
- [ ] All forms show validation errors in current locale
- [ ] Sidebar collapses on mobile (< 768px)
- [ ] Tables paginate at 25 rows
- [ ] Toast appears for every create/update/delete action
- [ ] Date/time formatted per locale (vi-VN / en-US)

### Build Tests
- [ ] `npm run build` passes with zero warnings
- [ ] /settings route and sub-routes generate
- [ ] Bundle size < 500KB first load JS
- [ ] Lighthouse accessibility score > 90
