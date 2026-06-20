# Wayfinder Web — Architecture & Deployment

_Last updated: 2026-06-20_

The marketing site (`wayfinderapp.life`) + internal admin dashboard
(`admin.wayfinderapp.life`) for the Wayfinder iOS app. Separate repo from the Expo
app; shares only the Supabase backend.

---

## 1. What this is

| Surface | URL | Purpose |
|---|---|---|
| **Landing** | `wayfinderapp.life` | TikTok/App Store funnel — hero, "not astrology", how it works, archetypes, pricing |
| **Privacy / About / Terms** | `/privacy` `/about` `/terms` | Real legal/marketing copy (mirrors the app's `InfoScreen`); unblocks App Store review |
| **Admin** | `admin.wayfinderapp.life` | Auth-gated dashboard: acquisition/revenue, retention/engagement, archetype mix, AI cost |

## 2. Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind**, `output: 'standalone'`
- **Supabase** — same project as the app (`ygqfxetqsldusdzfjlwu`). Two keys:
  - *anon key* (public) — admin login session via `@supabase/ssr`
  - **service role key** (server-only) — reads cross-user aggregates for the dashboard
- **Hetzner CX22** VPS + **Docker Compose** + **Caddy** (automatic HTTPS)
- Design system mirrors the app: "soft dusk" palette, Newsreader / Hanken Grotesk / IBM Plex Mono

## 3. Architecture

```
TikTok bio link ─▶ wayfinderapp.life ─▶ App Store
                         │
   admin.wayfinderapp.life (same Next app, /admin tree via middleware)
                         │  service role key (server env only)
                         ▼
                   Supabase (DB · Auth · Edge Functions)   ← managed, NOT on the VPS
```

The DB stays on Supabase (managed). The VPS runs only the Next.js app + Caddy.
**Upgrade Supabase to Pro before the marketing push** — the free tier auto-pauses
after ~7 days idle and has no daily backups, neither of which is acceptable for a
live paid app.

## 4. Project layout

```
app/
  page.tsx              Landing
  about|privacy|terms/  Content pages (real app copy)
  admin/
    page.tsx            Gated dashboard (server component)
    login/page.tsx      Supabase password login (client)
components/             Constellation, SiteChrome (Nav/Footer/AppStoreButton), DocPage
lib/
  env.ts               Validated env access (public vs server-only)
  auth.ts              getAdminUser() — session + email allowlist gate
  metrics.ts           getOverview() — all dashboard aggregates (service role)
  supabase/
    admin.ts           service-role client (server-only)
    server.ts          ssr cookie client (auth)
    browser.ts         anon client (login form)
middleware.ts          admin subdomain → /admin rewrite + session refresh
Dockerfile             multi-stage standalone build
docker-compose.yml     web + caddy
Caddyfile              TLS + reverse proxy for both domains
```

## 5. Admin security model

1. `admin.wayfinderapp.life` is rewritten onto `/admin/*` by `middleware.ts`.
2. `getAdminUser()` (`lib/auth.ts`) requires a valid Supabase session **and** an email
   on `ADMIN_EMAILS` (default `scosmor@gmail.com`). Anything else → redirect to `/admin/login`.
3. All analytics run **server-side** with the service role key; raw user data never
   reaches the browser — only aggregate numbers.
4. The service role key lives only in the server's `.env`, never in a `NEXT_PUBLIC_*` var.

**To create the admin login:** the email must exist as a Supabase Auth user. Either sign
up once through the app with `scosmor@gmail.com`, or create the user in Supabase
Dashboard → Authentication → Users, then sign in at `/admin/login`.

## 6. Metrics (and their sources)

| Group | Metrics | Source |
|---|---|---|
| Acquisition & revenue | total users, signups today/7d/30d, tier counts, paid share | `profiles` |
| Retention & engagement | DAU, WAU, syncs/readings/journals/feedback (30d), journal & feedback rates | `movement_syncs`, `readings`, `journal_entries`, `reading_feedback` |
| Archetype distribution | Pacer/Weaver/Wanderer/Anchor/Spiral over 30d | `movement_syncs.dna_type` |
| AI health & cost | readings today/7d, reviews 30d, estimated cost | `readings`, `weekly_reviews`, `monthly_reports` × per-call estimate |

All migration-free (plain count/select). Two known follow-ups, both noted inline:
- **Exact revenue** (MRR/trials/churn): wire the RevenueCat REST API in `lib/metrics.ts`.
- **Exact AI cost/errors**: log each Claude call from the Edge Functions into an
  `ai_call_log` table instead of estimating from row counts.

## 7. Local development

```bash
cp .env.example .env     # fill in the Supabase keys
npm install
npm run dev              # http://localhost:3000  (admin at /admin)
```

## 8. Deploy to Hetzner (CX22)

**One-time server setup**

```bash
# DNS (already done): A records for @, www, admin → 46.225.137.138
ssh root@46.225.137.138

# Install Docker + compose plugin
curl -fsSL https://get.docker.com | sh

# Add 2 GB swap so `next build` never OOMs on a 4 GB box
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

**Deploy**

```bash
git clone <this-repo> /opt/wayfinder-web && cd /opt/wayfinder-web
cp .env.example .env && nano .env          # fill in real keys
docker compose up -d --build               # builds + starts web + caddy
```

Caddy provisions TLS automatically for all three hostnames on first request. Done.

**Update**

```bash
cd /opt/wayfinder-web && git pull && docker compose up -d --build
```

## 9. After first deploy

- [ ] Set the Privacy Policy URL in **App Store Connect** → `https://wayfinderapp.life/privacy`
- [ ] Put `https://wayfinderapp.life` in the **TikTok bio** (the funnel target)
- [ ] Set the real **App Store URL** in `NEXT_PUBLIC_APP_STORE_URL`
- [ ] Create the admin Supabase user and verify login at `admin.wayfinderapp.life`
- [ ] Upgrade Supabase to **Pro** before driving real traffic
