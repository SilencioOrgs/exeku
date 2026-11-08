# Exeku judge

The code runner behind Run and Submit. Exeku (Next.js) keeps the problems, hidden tests and verdicts; this worker only compiles and runs code.

```
Browser -> Next.js /api/judge (tests, verdicts) -> POST /v1/run (token) -> exeku-judge -> isolate sandbox
```

- **Sandbox:** [isolate](https://github.com/ioi/isolate) v2, the IOI sandbox. It needs a Linux host with cgroup v2 and systemd, which is the default on Ubuntu 22.04 and 24.04. No GRUB changes.
- **Per submission:** compile once, then run each test input in a fresh box. Limits: CPU time, wall time, memory (cgroup), file size, processes. No network and no host files.
- **Languages:** Python 3, C, C++ (GCC) and Java 17, whichever are installed.
- **No dependencies:** Node 22.6+ runs the TypeScript directly.

## Try it locally on Windows

You need a real Linux kernel, so the judge runs in WSL2 or a VM. Next.js keeps running on Windows as usual.

### Option A: WSL2 (try this first)

1. In PowerShell: `wsl --install -d Ubuntu-24.04`, then open Ubuntu.
2. Turn on systemd. Run `sudo nano /etc/wsl.conf`, add the two lines below, save, run `wsl --shutdown` in PowerShell and reopen Ubuntu:
   ```
   [boot]
   systemd=true
   ```
3. Switch WSL to cgroup v2 only (by default it mounts v1 and v2 side by side, and isolate cannot start). In Windows, open `%UserProfile%\.wslconfig` (create it) and add the lines below, then run `wsl --shutdown` and reopen Ubuntu. `mount | grep cgroup` should then show a single `cgroup2 on /sys/fs/cgroup` line.
   ```
   [wsl2]
   kernelCommandLine = cgroup_no_v1=all systemd.unified_cgroup_hierarchy=1
   ```
4. Clone the repo inside Ubuntu (not under `/mnt/c`) and run the setup:
   ```
   git clone https://github.com/SilencioOrgs/exeku.git ~/exeku
   cd ~/exeku
   sudo bash judge/scripts/setup-ubuntu.sh
   ```
   It installs the compilers, Node 22 and isolate, starts the `exeku-judge` service, runs a smoke test and prints your token.
5. On Windows, create `.env.local` in your Exeku folder:
   ```
   JUDGE_SERVICE_URL=http://localhost:4000
   JUDGE_TOKEN=<token from step 4>
   ```
6. Run `npm run dev`, open a problem and press Run. `http://localhost:3000/api/health` should show `"isAvailable": true`.

If the smoke test fails on the memory or sandbox checks, your WSL kernel does not give isolate what it needs. Use option B.

### Option B: Multipass VM

1. Install [Multipass](https://canonical.com/multipass). Windows Pro and Education use Hyper-V, so the VM's IP is reachable from Windows.
2. In PowerShell:
   ```
   multipass launch 24.04 --name judge --cpus 2 --memory 2G --disk 15G
   multipass shell judge
   ```
3. Inside the VM:
   ```
   git clone https://github.com/SilencioOrgs/exeku.git ~/exeku
   cd ~/exeku
   sudo bash judge/scripts/setup-ubuntu.sh --listen 0.0.0.0
   ```
4. Get the VM's IP with `multipass list` and set `JUDGE_SERVICE_URL=http://<VM IP>:4000` in `.env.local`, plus the token.

### Daily use

| Task | Command (inside WSL or the VM) |
| --- | --- |
| Start / stop | `sudo systemctl start exeku-judge` / `sudo systemctl stop exeku-judge` |
| Logs | `journalctl -u exeku-judge -f` |
| Re-test | `sudo bash -c 'set -a; . /etc/exeku-judge.env; cd /opt/exeku-judge && npm run check'` |
| Update after a pull | `git pull && sudo bash judge/scripts/setup-ubuntu.sh` (keeps the token) |
| Show the token | `sudo cat /etc/exeku-judge.env` |

## Put it online (Azure for Students)

1. Create a VM: Ubuntu Server 24.04 LTS, size B2s, region Southeast Asia, SSH key login, and only port 22 open. Turn on Auto-shutdown and add a budget alert.
2. SSH in, clone the repo and run `sudo bash judge/scripts/setup-ubuntu.sh`. The worker listens on `127.0.0.1` only.
3. Give it HTTPS without opening the port to everyone:
   - **Cloudflare Tunnel** (no open ports): `cloudflared tunnel` to `http://localhost:4000` on a hostname such as `judge.yourdomain.com`.
   - **Caddy**: open port 443 and use `reverse_proxy localhost:4000`. Caddy gets the certificate itself.
4. In Vercel, set `JUDGE_SERVICE_URL=https://judge.yourdomain.com`, `JUDGE_TOKEN` and `TRUST_PROXY=1`.

## API

`GET /v1/health` returns the version, installed languages and queue size. It needs no token.

`POST /v1/run` needs `Authorization: Bearer <JUDGE_TOKEN>`.

```json
{
  "language": "cpp",
  "files": [{ "name": "main.cpp", "content": "..." }],
  "stdins": ["1 2\n", "3 4\n"],
  "timeLimitMs": 2000,
  "memoryLimitKb": 131072
}
```

It returns `{ "compile": { "ok", "output", "timeMs" } | null, "runs": [{ "status", "exitCode", "stdout", "stderr", "timeMs", "memoryKb" }] }`. The `status` is one of SUCCESS, RUNTIME_ERROR, TIME_LIMIT_EXCEEDED, MEMORY_LIMIT_EXCEEDED or INTERNAL_ERROR. After a compile error, `runs` is empty.

## Settings (`/etc/exeku-judge.env`)

| Variable | Default | Meaning |
| --- | --- | --- |
| `JUDGE_TOKEN` | generated | Shared secret with Exeku. At least 16 characters. |
| `JUDGE_HOST` | `127.0.0.1` | Use `0.0.0.0` only on a private VM. |
| `JUDGE_PORT` | `4000` | |
| `JUDGE_CONCURRENCY` | CPU count | Submissions running at once, one sandbox each. |
| `JUDGE_MAX_QUEUE` | `100` | Waiting submissions before the judge answers 429. |

Run `sudo systemctl restart exeku-judge` after changing a setting.
