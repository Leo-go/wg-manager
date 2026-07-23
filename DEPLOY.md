# Deploy VLESS Manager to Vercel

Step-by-step guide to publish this MVP from GitHub to production.

> Repo / Vercel project may still be named `wg-manager` — that is legacy naming. The app is a **VLESS Reality** installer, not WireGuard.

## 1. Sign in to Vercel

1. Open [https://vercel.com](https://vercel.com).
2. Click **Log in** and authorize with **GitHub** (same account that owns the repo).

## 2. Import the repository

1. From the Vercel dashboard, click **Add New… → Project**.
2. Import the GitHub repository `wg-manager` (or your fork/rename).
3. Framework preset should detect **Next.js**.
4. Root directory: leave as `.` (repo root).
5. Build command: `pnpm build` (or leave Vercel default if it detects pnpm).
6. Install command: `pnpm install` (Vercel usually auto-detects `pnpm-lock.yaml`).

## 3. Environment variables

Before deploying, open **Environment Variables** and add the same keys as in `.env.example`:

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://….supabase.co` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key | Safe for the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **Secret** — server only; never expose client-side |

Apply them to **Production** (and Preview if you want PR previews to work).

## 4. Deploy

1. Click **Deploy**.
2. Wait for the build to finish (install → lint is local CI; Vercel runs `pnpm build`).
3. Open the generated `*.vercel.app` URL and verify login + dashboard.

> Setup VPN over SSH can take several minutes. On the Hobby plan, long serverless timeouts may be limited — if installs abort early, move the setup worker to a longer-running host or raise function duration where your plan allows (`maxDuration` is already set in the API route).

## 5. Custom domain

1. In the project: **Settings → Domains**.
2. Add your domain (e.g. `wg.example.com` or apex `example.com`).
3. Follow Vercel’s DNS instructions for that domain.

## 6. DNS at your registrar

Typical Vercel records (confirm in the Domains UI — values can change):

| Type | Name | Value |
|------|------|--------|
| **A** | `@` (apex) | `76.76.21.21` |
| **CNAME** | `www` | `cname.vercel-dns.com` |

After DNS propagates, Vercel issues HTTPS certificates automatically.

## Post-deploy checklist

- [ ] Supabase Auth redirect URLs include your production domain (`Authentication → URL Configuration`).
- [ ] RLS policies allow users to manage only their own `servers` rows.
- [ ] Test: sign up → add VPS → Setup VPN → import `vless://` into Hiddify.
- [ ] Never commit real `.env.local` values; rotate any keys that were shared in chat.

## Related docs

- Local development: see [README.md](./README.md)
- Env template: see [.env.example](./.env.example)
