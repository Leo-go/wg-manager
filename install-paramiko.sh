#!/bin/bash
set -euo pipefail
which expect || true
which plink || true
pip3 install --user paramiko 2>&1 | tail -20
python3 -c 'import paramiko; print("paramiko_ok", paramiko.__version__)' 2>&1
echo DONE_PIP