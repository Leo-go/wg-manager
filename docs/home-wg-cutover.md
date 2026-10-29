# Home path: WireGuard cutover (prod)

## Current production path

Client → RU relay `5.129.215.254:443` (VLESS Reality + xHTTP) → outbound `exit-proxy` → WireGuard `wg-home0` → `10.66.66.1:10443` (Reality inbound on exit) → internet egress (`216.57.107.94`).

Direct RU→exit Reality/xHTTP over the public internet was unstable (AMS DPI). Origin hop was an interim; WG is the durable home uplink.

**Default for new installs:** `EXIT_VIA_WG=1` when running [`scripts/install-ru-relay.sh`](../scripts/install-ru-relay.sh).

## Scripts (do not run blindly on prod)

1. [`scripts/setup-wg-home0.sh`](../scripts/setup-wg-home0.sh) — create/persist `wg-home0` on `ROLE=exit` then `ROLE=ru`.
2. [`scripts/patch-ru-exit-proxy-wg.sh`](../scripts/patch-ru-exit-proxy-wg.sh) — only rewrite `exit-proxy` → `10.66.66.1:10443`.
3. [`scripts/patch-ru-xray-api.sh`](../scripts/patch-ru-xray-api.sh) — enable local Xray API `:10085` for hot client add/remove.
4. Full reinstall: `FORCE_REINSTALL=1 MERGE_CLIENTS=1 PRESERVE_REALITY=1 EXIT_VIA_WG=1 bash scripts/install-ru-relay.sh …`

## Do not blindly re-run installers

- Without `FORCE_REINSTALL=1`, `install-ru-relay.sh` refuses to overwrite an existing `config.json`.
- Even with force: always keep a backup; prefer `MERGE_CLIENTS=1` + `PRESERVE_REALITY=1`.
- Do not tear down `wg-home0` without a rollback plan.

## Ops checklist

1. `wg show wg-home0` on RU — recent handshake to exit (&lt; ~3 min).
2. RU outbound `exit-proxy` address must be `10.66.66.1:10443` (not public exit IP).
3. Smoke: local xray client with a known home UUID → `api.ipify.org` should return exit egress IP.
4. Bot env: `TELEGRAM_BOT_HOME_*`, `TELEGRAM_BOT_HOME_SSH_NO_JUMP=1`, `TELEGRAM_BOT_HOME_VLESS_TEMPLATE` must match live Reality `pbk` / `sid` / `sni` / `path`.
5. Health cron (`/api/cron/bot-health` every 30m) checks TCP `:443`, CDN `/cdn-check`, and WG handshake via SSH.

## Rollback (emergency)

Point RU `exit-proxy` back to the previous hop (Origin uplink Reality) **or** restore the pre-cutover `exit-proxy` JSON backup on RU. Keep WG interface until traffic is confirmed.

## Security note

If `_askpass.sh` (or similar) with a root password was ever committed or shared, rotate that VPS password and any reused credentials on Origin / relay / exit.
