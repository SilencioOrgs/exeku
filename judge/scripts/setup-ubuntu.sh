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
git -c advice.detachedHead=false clone -q --depth 1 --branch "$ISOLATE_REF" https://github.com/ioi/isolate.git /usr/local/src/isolate
make -s -C /usr/local/src/isolate isolate isolate-cg-keeper
make -s -C /usr/local/src/isolate install

# isolate v2 takes its sandbox UIDs from the subuid range of an "isolate" user (same as its Debian package).
getent group isolate >/dev/null || groupadd --system isolate
if ! getent passwd isolate >/dev/null; then
  useradd --gid isolate --home-dir /nonexistent --no-create-home --shell /usr/sbin/nologin isolate
fi
add_range() { # $1 = /etc/subuid or /etc/subgid
  grep -q '^isolate:' "$1" && return
  local start
  start=$(awk -F: 'BEGIN{m=100000} {e=$2+$3; if (e>m) m=e} END{print m}' "$1")
  echo "isolate:${start}:65536" >> "$1"
}
add_range /etc/subuid
add_range /etc/subgid
# Only root and the isolate group may start sandboxes.
chgrp isolate /usr/local/bin/isolate
chmod 4754 /usr/local/bin/isolate

systemctl daemon-reload
systemctl enable isolate.service >/dev/null
if ! systemctl restart isolate.service; then
  systemctl status isolate.service --no-pager -n 10 || true
  echo >&2
  echo "isolate needs the cgroup v2 hierarchy at /sys/fs/cgroup. Current mounts:" >&2
  mount | grep cgroup >&2 || true
  if grep -qi microsoft /proc/version && mount | grep -q 'type cgroup '; then
    cat >&2 <<'HINT'

WSL mounts cgroup v1 and v2 side by side by default. Switch it to v2 only:
  1. In Windows, open %UserProfile%\.wslconfig (create it) and add:
       [wsl2]
       kernelCommandLine = cgroup_no_v1=all systemd.unified_cgroup_hierarchy=1
  2. In PowerShell: wsl --shutdown
  3. Reopen Ubuntu and run this script again.
HINT
  fi
  exit 1
fi

# Memory limits do not cover swapped-out pages (isolate manual).
swapoff -a || true

step "Checking the sandbox environment"
isolate-check-environment || echo "(Warnings above are tuning tips. Errors mean the sandbox cannot run here.)"
for box in $(seq 0 15); do isolate --cg --box-id="$box" --cleanup >/dev/null 2>&1 || true; done

step "Installing the worker to ${INSTALL_DIR}"
id exeku-judge >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin exeku-judge
usermod -aG isolate exeku-judge
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
  JUDGE_SERVICE_URL=http://<this machine's address>:${JUDGE_PORT}
  JUDGE_TOKEN=${JUDGE_TOKEN}
EOF
