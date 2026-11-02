# Home path baseline (Phase 0)

Captured from agent host against live infra (2026-11-02).

## Public reachability

| Target | Result |
|--------|--------|
| `5.129.215.254:443` | open |
| `5.129.215.254:22` | open |
| `216.57.107.94:22` | open |
| `216.57.107.94:443` | open |
| `216.57.107.94:10443` | open |
| `https://www.wg-manager.online/cdn-check` | HTTP 204 |

## RU relay (`5.129.215.254`) via SSH

- `wg-home0` up; latest handshake **47s** (pass, threshold 180s).
- Peer endpoint `216.57.107.94:51820`, keepalive 25s.
- Transfer observed (non-zero) — tunnel carries traffic.
- Outbound `exit-proxy` → **`10.66.66.1:10443`** (correct WG cutover, not public exit IP).
- Ping `10.66.66.1` OK (~43 ms).

### Live Reality (inbound `ru-relay-in-xhttp` :443)

| Field | Value |
|-------|--------|
| network | xhttp |
| path | `/ru-xhttp` |
| mode | auto |
| sni / dest | `eh.vk.com` / `eh.vk.com:443` |
| shortId | `21d7dc1a` |
| publicKey (x25519) | `shTwZx74NpxOFEQhxmMRky1jcMrS7QsvmZP8qIUQI3U` |
| clients on :443 | 14 |
| TCP fallback :8443 | present (1 client) |

**Expected** `TELEGRAM_BOT_HOME_VLESS_TEMPLATE` host/params must match the table above. Compare on Vercel Production after deploy.

## Exit (`216.57.107.94`)

- TCP ports open from the internet.
- Agent SSH key: **Permission denied** (password/other key required for deeper exit inspection and direct-abroad spike inbound).
- From RU over WG: `10.66.66.1:10443` reachable.

## DB legacy key % 

Not queried here (no local Supabase service role). Use admin `/refreshhomes dry-run` after deploy, or SQL:

```sql
select
  count(*) filter (where vless_tcp_config_url ilike '%94.103%') as legacy_94,
  count(*) filter (where vless_tcp_config_url ilike '%5.129.215.254%') as home_ru,
  count(*) filter (where vless_tcp_config_url is null or vless_tcp_config_url = '') as home_missing,
  count(*) filter (where is_active and subscribed_until > now()) as active_subs
from bot_users;
```

## Verdict

Home **infra path is healthy** (WG + exit-proxy + Reality inbound). User complaints are more likely: stale templates/keys, soft-fail issuance, client/UX dual-profile friction, or ISP blocks of `5.129` — not a dead WG tunnel at capture time.
