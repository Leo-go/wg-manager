# Home path: WireGuard cutover (prod)

## Current production path

Client → RU relay `5.129.215.254:443` (VLESS Reality + xHTTP) → outbound `exit-proxy` → WireGuard `wg-home0` → `10.66.66.1:10443` (Reality inbound on exit) → internet egress (`216.57.107.94`).

Direct RU→exit Reality/xHTTP over the public internet was unstable (AMS DPI). Origin hop was an interim; WG is the durable home uplink.

## Do not blindly re-run installers

- `scripts/install-ru-relay.sh` still targets public `EXIT_IP:10443` xHTTP Reality and can **overwrite** `config.json` / wipe clients.
- Before any reinstall: back up `/usr/local/etc/xray/config.json` on RU and exit; preserve `clients` on `ru-relay-in-xhttp`.
- Do not tear down `wg-home0` without a rollback plan.

## Ops checklist

1. `wg show wg-home0` on RU — recent handshake to exit.
2. RU outbound `exit-proxy` address must be `10.66.66.1:10443` (not public exit IP).
3. Smoke: local xray client with a known home UUID → `api.ipify.org` should return exit egress IP.
4. Bot env: `TELEGRAM_BOT_HOME_*`, `TELEGRAM_BOT_HOME_SSH_NO_JUMP=1`, `TELEGRAM_BOT_HOME_VLESS_TEMPLATE` must match live Reality `pbk` / `sid` / `sni` / `path`.

## Rollback (emergency)

Point RU `exit-proxy` back to the previous hop (Origin uplink Reality) **or** restore the pre-cutover `exit-proxy` JSON backup on RU. Keep WG interface until traffic is confirmed.

## Security note

If `_askpass.sh` (or similar) with a root password was ever committed or shared, rotate that VPS password and any reused credentials on Origin / relay / exit.
