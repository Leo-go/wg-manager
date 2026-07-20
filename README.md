# WG Manager

SaaS MVP that turns a bare Linux VPS into a working **VLESS Reality** VPN with one click: add the server in the dashboard, run setup over SSH, get a client-ready `vless://` link and QR code for Hiddify / v2rayNG / Shadowrocket.

**Why it exists:** manual Reality installs (3X-UI panels, key parsing, SNI/port tuning for DPI) are error-prone. WG Manager automates the proven recipe — pinned Xray, reachable Reality dest probing, correct `pbk`, BBR — so you ship a connectable config instead of a timeout.

---

## Architecture

```mermaid
flowchart TB
  subgraph Client["User device"]
    Browser["Browser / Dashboard"]
    Hiddify["VPN client<br/>(Hiddify, v2rayNG, …)"]
  end

  subgraph App["WG Manager — Next.js 15"]
    UI["App Router UI<br/>Auth · Servers · Setup"]
    API["API Route<br/>POST /api/servers/[id]/setup"]
    Script["scripts/install-vless-reality.sh"]
  end

  subgraph Cloud["Supabase"]
    Auth["Auth"]
    DB["Postgres<br/>servers · profiles"]
  end

  subgraph VPS["Customer VPS"]
    SSH["sshd"]
    Xray["Xray-core<br/>VLESS Reality :443"]
  end

  Browser --> UI
  UI --> Auth
  UI --> DB
  UI --> API
  API --> DB
  API -->|"SSH (ssh2) + bash installer"| SSH
  SSH --> Script
  Script --> Xray
  API -->|"vless:// + diagnostics"| UI
  Hiddify -->|"VLESS Reality"| Xray
```

**Happy path**

1. User signs up / logs in (Supabase Auth).
2. Adds a VPS (IP, SSH port/password, optional SNI & VLESS port).
3. Opens **Setup VPN** → API connects over SSH and runs the installer.
4. Installer installs Xray **26.3.27**, probes a reachable Reality dest, writes config, enables BBR, prints `VLESS_CONFIG_URL=…`.
5. Dashboard shows the URL + QR; user imports it into a client and connects.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 15** (App Router) |
| Language | **TypeScript** (`strict: true`) |
| UI | **Tailwind CSS 4**, **shadcn/ui**, Lucide |
| Auth & DB | **Supabase** (`@supabase/ssr` + service role on setup API) |
| Remote install | **Node.js SSH** (`ssh2`) + **Bash** installer |
| Package manager | **pnpm** |

---

## Features (MVP)

- Email/password auth (login, signup, logout) with Supabase session middleware
- Server CRUD in the dashboard (add / list / **delete**)
- One-click **VLESS Reality** setup over SSH
- RU-oriented defaults: port **443**, auto-probed SNI/dest (Cloudflare → Apple → …)
- Pinned **Xray 26.3.27** (avoids broken newer Reality builds)
- Correct Reality `pbk` extraction (`Password` / derived public key — never `Hash32`)
- Setup UI: progress steps, QR code, copyable `vless://` URL, diagnostics panel, retry
- Installation status on the servers table (`pending` / `installing` / `completed` / `error`)
- Helper SQL + diagnostic bash scripts under `scripts/`

---

## Local setup

### Prerequisites

- Node.js **20+** (22 recommended)
- **pnpm** (`corepack enable && corepack prepare pnpm@latest --activate`)
- A [Supabase](https://supabase.com) project
- A Debian/Ubuntu VPS with root SSH for end-to-end testing

### 1. Clone and install

```bash
git clone <your-repo-url> vpn-saas-mvp-wsl
cd vpn-saas-mvp-wsl
pnpm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in values from the Supabase dashboard (**Project Settings → API**):

| Variable | Where to get it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (**secret** — server only) |

### 3. Database

In the Supabase SQL Editor, create at least a `servers` table used by the app (columns aligned with `src/lib/supabase/types.ts`), with RLS so users only see their own rows (`user_id = auth.uid()`), including `INSERT` / `SELECT` / `UPDATE` / `DELETE`.

Useful follow-ups already in the repo:

```bash
# Optional: tweak column defaults (update to match current product defaults if needed)
# scripts/ru-defaults.sql
# scripts/sni-default.sql
```

Enable **Email** auth in Supabase (**Authentication → Providers**).

### 4. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) → sign up → **Add Server** → **Setup VPN**.

### 5. Import the client link

1. Delete any old profile for that IP in Hiddify.
2. Import the new `vless://` URL (or scan the QR).
3. Prefer **System Proxy** if TUN fails with permission errors.
4. Confirm connect; if it fails, check setup diagnostics and that the VPS firewall allows the VLESS port (default **443/tcp**).

---

## Project structure (high level)

```
src/
  app/                  # App Router pages + API
  components/           # UI (dashboard, setup, shadcn)
  lib/                  # Supabase clients, constants, types
scripts/
  install-vless-reality.sh   # Production installer used by the API
  diagnose-fix-reality.sh  # Offline recovery / dest probing
  *.sql                 # Supabase helpers
```

---

## Production notes

- Deploy guide: see [DEPLOY.md](./DEPLOY.md) (Vercel + DNS).
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- SSH passwords are stored in Supabase for setup; treat the DB as sensitive and use RLS.
- Setup can take several minutes (`maxDuration` on the route is elevated); use a host that allows long API runs (or move install to a worker later).
- Rotate any root password that was shared during debugging.
- For RU mobile DPI, Layer 0 Reality may still need a RU relay (Layer 1) on some networks — out of scope for this MVP.

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript `tsc --noEmit` |
| `bash scripts/publish-github.sh` | Local CI checks + commit + GitHub publish |

---

## License

Private / portfolio MVP — adjust as needed before publishing.
