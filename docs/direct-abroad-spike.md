# Direct abroad spike (Phase 1)

## Goal

Measure whether **Client (RU) → Exit (abroad)** Reality still works without RU relay / CDN.

Production home path stays: RU `5.129.215.254:443` → WG → exit.

## Install on exit

```bash
# from laptop (password/SSH as you prefer)
scp scripts/spike-direct-abroad.sh root@216.57.107.94:/tmp/
ssh root@216.57.107.94 'bash /tmp/spike-direct-abroad.sh'
```

Creates temporary inbounds:

- TCP Reality `:9443` (tag `spike-direct-tcp`)
- xHTTP Reality `:9444` path `/spike-xhttp` (tag `spike-direct-xhttp`)

Script prints two `vless://` URLs. Import into Happ/INCY.

## Test matrix (manual)

| Network | TCP :9443 | xHTTP :9444 | Notes |
|---------|-----------|-------------|-------|
| Home Wi-Fi (ISP) | | | ipify = exit? |
| LTE operator A | | | |
| LTE operator B | | | |

Pass = stable exit IP ≥ 10 min + YouTube without kill-switch drops.

## Go / no-go

- **Go**: at least one protocol works on Wi-Fi **and** one mobile operator → consider third bot profile `DIRECT` later.
- **No-go** (expected): both fail or only flaky → keep RU-hop home; do not replace prod home.

## Cleanup

```bash
ssh root@216.57.107.94 'bash /tmp/spike-direct-abroad.sh remove'
```

## Baseline note (2026-11-02)

From agent: exit `:443`/`:8443` did **not** accept plain TCP from RU hop probes the same way `:10443` (WG Reality) does. Treat public direct ports as unproven until this spike runs from a RU client network.
