#!/usr/bin/env bash
# Installs the Exeku judge on Ubuntu 22.04/24.04 (WSL2 with systemd, a local VM, or a cloud server).
#   sudo bash judge/scripts/setup-ubuntu.sh                 # listen on 127.0.0.1:4000 (server behind a proxy or tunnel)
#   sudo bash judge/scripts/setup-ubuntu.sh --listen 0.0.0.0  # reachable from your PC (local VM)
# Safe to run again: it updates the worker and keeps the existing token.
set -euo pipefail

LISTEN_HOST=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --listen) LISTEN_HOST="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

ISOLATE_REF="${ISOLATE_REF:-v2.7}"
JUDGE_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR=/opt/exeku-judge
ENV_FILE=/etc/exeku-judge.env

step() { printf '\n==> %s\n' "$*"; }

[[ $EUID -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }
command -v apt-get >/dev/null || { echo "This script needs Ubuntu or Debian." >&2; exit 1; }
if [[ ! -d /run/systemd/system ]]; then
  echo "systemd is not running. On WSL add this to /etc/wsl.conf, then run 'wsl --shutdown' in PowerShell and reopen Ubuntu:" >&2
  printf '[boot]\nsystemd=true\n' >&2
  exit 1
fi

step "Installing build tools and compilers"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq build-essential git pkg-config libcap-dev libseccomp-dev libsystemd-dev \
  python3 openjdk-17-jdk-headless curl ca-certificates openssl >/dev/null

if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=6)?0:1)' 2>/dev/null; then
  step "Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "node $(node --version)"

step "Building isolate ${ISOLATE_REF}"
rm -rf /usr/local/src/isolate
git clone -q --depth 1 --branch "$ISOLATE_REF" https://github.com/ioi/isolate.git /usr/local/src/isolate
make -s -C /usr/local/src/isolate isolate isolate-cg-keeper
make -s -C /usr/local/src/isolate install
systemctl daemon-reload
systemctl enable --now isolate.service

# Memory limits do not cover swapped-out pages (isolate manual).
swapoff -a || true

step "Checking the sandbox environment"
isolate-check-environment || echo "(Warnings above are tuning tips. Errors mean the sandbox cannot run here.)"
for box in $(seq 0 15); do isolate --cg --box-id="$box" --cleanup >/dev/null 2>&1 || true; done

step "Installing the worker to ${INSTALL_DIR}"
id exeku-judge >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin exeku-judge
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cp -r "$JUDGE_SRC/src" "$JUDGE_SRC/package.json" "$INSTALL_DIR/"
chown -R root:root "$INSTALL_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<EOF
JUDGE_TOKEN=$(openssl rand -hex 32)
JUDGE_HOST=${LISTEN_HOST:-127.0.0.1}
JUDGE_PORT=4000
EOF
elif [[ -n "$LISTEN_HOST" ]]; then
  sed -i "s/^JUDGE_HOST=.*/JUDGE_HOST=${LISTEN_HOST}/" "$ENV_FILE"
fi
chown root:exeku-judge "$ENV_FILE"
chmod 640 "$ENV_FILE"

install -m 644 "$JUDGE_SRC/exeku-judge.service" /etc/systemd/system/exeku-judge.service
systemctl daemon-reload
systemctl enable exeku-judge.service >/dev/null
systemctl restart exeku-judge.service
sleep 2

step "Smoke test"
set -a; source "$ENV_FILE"; set +a
JUDGE_URL="http://127.0.0.1:${JUDGE_PORT}" node --experimental-strip-types --disable-warning=ExperimentalWarning "$INSTALL_DIR/src/check.ts" || {
  echo "Smoke test failed. Logs: journalctl -u exeku-judge -n 50" >&2
  exit 1
}

cat <<EOF

Exeku judge is running on ${JUDGE_HOST}:${JUDGE_PORT}.
Put these in Exeku's .env.local:
  EXECUTION_ENGINE=exeku
  JUDGE_SERVICE_URL=http://<this machine's address>:${JUDGE_PORT}
  JUDGE_TOKEN=${JUDGE_TOKEN}
EOF
