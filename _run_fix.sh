#!/bin/bash
set -euo pipefail
chmod +x /home/user/vpn-saas-mvp-wsl/_askpass.sh
export SSH_ASKPASS=/home/user/vpn-saas-mvp-wsl/_askpass.sh
export SSH_ASKPASS_REQUIRE=force
export DISPLAY=:0
setsid -w ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o PreferredAuthentications=password -o PubkeyAuthentication=no -o ConnectTimeout=25 root@92.51.45.35 'bash -s' < /home/user/vpn-saas-mvp-wsl/_remote_fix.sh | tee /home/user/vpn-saas-mvp-wsl/vps-reality-fix-report.txt
echo RUNNER_FIX_DONE