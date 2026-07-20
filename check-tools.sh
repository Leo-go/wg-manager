#!/bin/bash
set -euo pipefail
echo PATH_TOOLS
which ssh || true
which sshpass || true
which python3 || true
python3 -c 'import paramiko; print("paramiko", paramiko.__version__)' 2>&1 || echo no_paramiko
timeout 45 sudo -n true 2>&1 && echo sudo_nopass_ok || echo sudo_needs_pass
timeout 90 sudo -n apt-get install -y sshpass 2>&1 || echo apt_failed
which sshpass || true
echo DONE_CHECK