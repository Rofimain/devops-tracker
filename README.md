# 🚀 DevOps Tracker

Internal DevOps project tracking portal — manage all your projects, tools, and documentation in one place.

## Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL 16 + Prisma ORM
- **Auth**: NextAuth.js v5 (Google OAuth + email domain restriction)
- **UI**: Tailwind CSS + custom design system (light/dark mode)
- **Deployment**: Docker + GitHub Actions CI/CD
- **Proxy**: Nginx + Let's Encrypt SSL
- **CDN/DNS**: Cloudflare

## Features
- 🔐 Login restricted to specific email domain
- 👑 Super Admin role (auto-assigned via env variable)
- 📋 Project management dengan infra detail (Target Group, Load Balancer, Hosting, CDN, DB, dll.)
- 🔧 Tools catalog dengan usage tracking per project
- 📄 Documentation dengan Markdown support
- 📊 Dashboard dengan overview dan activity log
- 🌙 Dark / Light mode

## Quick Start (Development)

```bash
# 1. Install dependencies
npm install

# 2. Start database
make db-up

# 3. Setup env
cp .env.example .env.local
# Edit .env.local dengan kredensial kamu

# 4. Run migrations
make migrate

# 5. Seed data (opsional)
make seed

# 6. Start dev server
make dev
```

Buka http://localhost:3000

## Deployment

Lihat [SETUP-GUIDE.md](./SETUP-GUIDE.md) untuk panduan lengkap deploy ke Ubuntu server.

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          ← Login page
│   ├── (dashboard)/           ← All protected pages
│   │   ├── page.tsx           ← Dashboard
│   │   ├── projects/          ← Projects CRUD
│   │   ├── tools/             ← Tools catalog
│   │   ├── docs/              ← Documentation
│   │   ├── admin/users/       ← User management
│   │   └── settings/          ← App settings
│   └── api/                   ← API routes
├── components/                ← Shared components
├── lib/                       ← Auth, Prisma, utils
└── middleware.ts              ← Auth guard
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth secret (min 32 chars) |
| `NEXTAUTH_URL` | App URL (https://yourdomain.com) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `ALLOWED_EMAIL_DOMAIN` | Only this domain can login (e.g. `company.com`) |
| `SUPER_ADMIN_EMAIL` | Auto-promoted to Super Admin on first login |
