# Big Orders CRM — Developer Documentation

KFC Vietnam Big Order CRM. Manages B2B bulk/corporate/party orders for 260+ stores.

## Quick Links

| Document | Description |
|----------|-------------|
| [Getting Started](./getting-started.md) | Local dev setup, env vars, running the app |
| [Architecture](./architecture.md) | Tech stack, decisions, data flow |
| [Database](./database.md) | Tables, RLS policies, migrations |
| [API Reference](./api-reference.md) | Server-side API routes |
| [Sprint Log](./sprint-log.md) | What was built in each sprint |
| [Deployment](./deployment.md) | EC2, Coolify, CI/CD |

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + Tailwind CSS + shadcn/ui (base-ui)
- **Backend:** Supabase self-hosted on AWS EC2
- **Auth:** Supabase Auth (email/password) + RLS
- **i18n:** next-intl (Vietnamese default + English)
- **Deployment:** Coolify on EC2 (Docker, auto-deploy from GitHub)
- **Tests:** Vitest (103+ tests)
