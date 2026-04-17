# Sprint 8: Landing Page & Live Chat

**Status:** PENDING

## Objectives
- Public landing page at /book-party for party/big order bookings
- CMS-driven content (hero, menu showcase, gallery)
- Lead capture form (creates lead with source = 'web_app')
- Embeddable lead form widget (/api/embed/lead-form.js)
- Live chat bot with configurable flow and human handoff
- Chat via Supabase Realtime (WebSocket)

## Database Tables (3)
1. `landing_page_content` — section (hero/menu/gallery/form_config/footer), content (jsonb), sort_order, active, updated_by (FK), updated_at
2. `chat_sessions` — visitor_id (anonymous UUID), visitor_name, visitor_phone, status (active/closed/escalated), assigned_agent (FK users nullable), lead_id (FK nullable — set when lead created), metadata, created_at, closed_at
3. `chat_messages` — session_id (FK), sender_type (visitor/bot/agent), content, metadata (attachments, quick_replies), created_at
4. `bot_faq` — question_vi, question_en, answer_vi, answer_en, keywords[], category, sort_order, active

## API Endpoints (Public — no auth)
- `POST /api/leads/public` — landing page form submission → creates lead
- `POST /api/leads/embed` — embeddable widget form submission
- `WS /api/chat` — WebSocket for live chat (Supabase Realtime channel)

## Key Behaviors
- Landing page: SSR for SEO, Vietnamese-first, mobile-responsive
- CMS: admin can edit hero banner, menu showcase, gallery images via settings
- Form: collects name, phone, event_type, guest_count, preferred_date, notes → creates lead
- Embeddable form: JS widget loads via script tag, posts to /api/leads/embed
- Chat bot flow: greet → ask event_type → ask guest_count → suggest menu → collect name+phone → create lead
- FAQ matching: keyword search against bot_faq table
- Human handoff: 2 consecutive unmatched questions → escalate to Call Center agent
- Agent sees chat in CRM dashboard (real-time via Supabase Realtime subscription)

## UI Pages
- `/book-party` — PUBLIC landing page (no auth):
  - Hero banner with CTA
  - Menu showcase (top combos from menu_categories)
  - Photo gallery
  - Booking form
  - Chat widget (floating bubble, opens chat panel)
  - Footer with contact info
- Admin: `/settings/landing-page` — CMS editor for each section
- Admin: `/settings/chat` — bot FAQ management, flow configuration

## i18n Keys
- `landing` section: heroTitle, heroSubtitle, bookNow, menuShowcase, gallery, formTitle, formName, formPhone, formEventType, formGuestCount, formDate, formNotes, formSubmit, formSuccess
- `chat` section: greeting, askEventType, askGuestCount, suggestMenu, askContact, thankYou, talkToHuman, faqNotFound, escalated

## Acceptance Tests

### Landing Page Tests
- [ ] /book-party loads without auth (public route)
- [ ] Hero section renders CMS content
- [ ] Booking form submits and creates lead with source = 'web_app'
- [ ] Form validates required fields (name, phone)
- [ ] Page is mobile-responsive
- [ ] Vietnamese is default language

### Embed Tests
- [ ] /api/leads/embed accepts POST and creates lead
- [ ] Returns success response with lead_id
- [ ] Validates required fields

### Chat Tests
- [ ] Chat widget renders on landing page
- [ ] Bot greeting message appears on open
- [ ] Bot follows configured flow steps
- [ ] FAQ keyword matching returns correct answer
- [ ] 2 unmatched questions trigger escalation
- [ ] Lead created at flow completion
- [ ] Agent can see and respond to escalated chats

### Migration Tests
- [ ] landing_page_content table with section CHECK
- [ ] chat_sessions with status CHECK
- [ ] chat_messages with sender_type CHECK
- [ ] bot_faq with keywords array
- [ ] RLS: landing_page_content readable by all, writable by admin
- [ ] RLS: chat_sessions/messages readable by agents

### Build Tests
- [ ] `npm run build` passes
- [ ] /book-party route generates (public, no middleware auth)
- [ ] WebSocket endpoint accessible
