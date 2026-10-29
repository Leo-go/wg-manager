#!/bin/bash
# Bring up persistent WireGuard uplink wg-home0 between RU relay and exit.
#
# Usage:
#   On EXIT (public IP, listens for RU):
#     ROLE=exit EXIT_WG_ADDR=10.66.66.1/30 RU_WG_ADDR=10.66.66.2/30 \
#       RU_PUBLIC_IP=5.129.215.254 bash setup-wg-home0.sh
#
#   On RU (dialer):
#     ROLE=ru EXIT_WG_ADDR=10.66.66.1/30 RU_WG_ADDR=10.66.66.2/30 \
#       EXIT_PUBLIC_IP=216.57.107.94 EXIT_WG_PUBKEY=... RU_WG_PRIVKEY=... \
#       bash setup-wg-home0.sh
#
# If keys are omitted, generates new ones and prints them (copy to the peer).
# Does NOT rewrite xray config — use patch-ru-exit-proxy-wg.sh after WG is up.
set -euo pipefail

ROLE="${ROLE:?ROLE=ru|exit required}"
IFACE="${IFACE:-wg-home0}"
LISTEN_PORT="${LISTEN_PORT:-51820}"
EXIT_WG_ADDR="${EXIT_WG_ADDR:-10.66.66.1/30}"
RU_WG_ADDR="${RU_WG_ADDR:-10.66.66.2/30}"
CONF_DIR="/etc/wireguard"
CONF="${CONF_DIR}/${IFACE}.conf"

if [ "$EUID" -ne 0 ]; then
  echo "ERROR: run as root" >&2
  exit 1
fi

apt-get update -qq 2>/dev/null || true
apt-get install -y -qq wireguard wireguard-tools 2>/dev/null || true

gen_keypair() {
  umask 077
  PRIV=$(wg genkey)
  PUB=$(printf '%s' "$PRIV" | wg pubkey)
  printf '%s %s' "$PRIV" "$PUB"
}

case "$ROLE" in
  exit)
    LOCAL_ADDR="$EXIT_WG_ADDR"
    PEER_ADDR="${RU_WG_ADDR%%/*}/32"
    if [ -z "${EXIT_WG_PRIVKEY:-}" ]; then
      read -r EXIT_WG_PRIVKEY EXIT_WG_PUBKEY < <(gen_keypair)
      echo "Generated EXIT keypair. Public: $EXIT_WG_PUBKEY"
    fi
    if [ -z "${RU_WG_PUBKEY:-}" ]; then
      echo "ERROR: set RU_WG_PUBKEY (peer public key from RU)" >&2
      exit 1
    fi
    ENDPOINT_LINE=""
    if [ -n "${RU_PUBLIC_IP:-}" ]; then
      ENDPOINT_LINE="Endpoint = ${RU_PUBLIC_IP}:${LISTEN_PORT}"
    fi
    mkdir -p "$CONF_DIR"
    umask 077
    cat > "$CONF" <<EOF
[Interface]
Address = ${LOCAL_ADDR}
ListenPort = ${LISTEN_PORT}
PrivateKey = ${EXIT_WG_PRIVKEY}
# NAT client traffic from WG to public egress (home path)
PostUp = sysctl -w net.ipv4.ip_forward=1; iptables -C FORWARD -i ${IFACE} -j ACCEPT 2>/dev/null || iptables -A FORWARD -i ${IFACE} -j ACCEPT; iptables -t nat -C POSTROUTING -s 10.66.66.0/30 ! -o ${IFACE} -j MASQUERADE 2>/dev/null || iptables -t nat -A POSTROUTING -s 10.66.66.0/30 ! -o ${IFACE} -j MASQUERADE
PostDown = iptables -D FORWARD -i ${IFACE} -j ACCEPT 2>/dev/null || true; iptables -t nat -D POSTROUTING -s 10.66.66.0/30 ! -o ${IFACE} -j MASQUERADE 2>/dev/null || true

[Peer]
PublicKey = ${RU_WG_PUBKEY}
AllowedIPs = ${PEER_ADDR}
PersistentKeepalive = 25
${ENDPOINT_LINE}
EOF
    ;;
  ru)
    LOCAL_ADDR="$RU_WG_ADDR"
    PEER_ADDR="${EXIT_WG_ADDR%%/*}/32"
    if [ -z "${RU_WG_PRIVKEY:-}" ]; then
      read -r RU_WG_PRIVKEY RU_WG_PUBKEY < <(gen_keypair)
      echo "Generated RU keypair. Public: $RU_WG_PUBKEY"
      echo "Set RU_WG_PUBKEY=$RU_WG_PUBKEY on EXIT and re-run ROLE=exit."
    fi
    if [ -z "${EXIT_WG_PUBKEY:-}" ]; then
      echo "ERROR: set EXIT_WG_PUBKEY" >&2
      exit 1
    fi
    if [ -z "${EXIT_PUBLIC_IP:-}" ]; then
      echo "ERROR: set EXIT_PUBLIC_IP" >&2
      exit 1
    fi
    mkdir -p "$CONF_DIR"
    umask 077
    cat > "$CONF" <<EOF
[Interface]
Address = ${LOCAL_ADDR}
PrivateKey = ${RU_WG_PRIVKEY}

[Peer]
PublicKey = ${EXIT_WG_PUBKEY}
Endpoint = ${EXIT_PUBLIC_IP}:${LISTEN_PORT}
AllowedIPs = ${PEER_ADDR}
PersistentKeepalive = 25
EOF
    ;;
  *)
    echo "ERROR: ROLE must be ru or exit" >&2
    exit 1
    ;;
esac

systemctl enable "wg-quick@${IFACE}"
systemctl restart "wg-quick@${IFACE}"
wg show "$IFACE"
echo "OK: ${IFACE} up (${ROLE}). Next on RU: bash scripts/patch-ru-exit-proxy-wg.sh"
