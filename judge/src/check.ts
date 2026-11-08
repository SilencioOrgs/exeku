/**
 * Smoke test for a running judge: each language must print the right answer, and the
 * sandbox must stop an endless loop, a memory hog and a network call.
 * Usage: JUDGE_TOKEN=... [JUDGE_URL=http://127.0.0.1:4000] npm run check
 */
const url = (process.env.JUDGE_URL || `http://127.0.0.1:${process.env.JUDGE_PORT || 4000}`).replace(/\/$/, "");
const token = process.env.JUDGE_TOKEN ?? "";

interface Case {
  name: string;
  language: string;
  file: string;
  source: string;
  expect: (run: { status: string; stdout: string }) => boolean;
  want: string;
}

const echoDouble: Record<string, [string, string]> = {
  python: ["main.py", "print(int(input()) * 2)\n"],
  c: ["main.c", '#include <stdio.h>\nint main(){int n;scanf("%d",&n);printf("%d\\n",n*2);return 0;}\n'],
  cpp: ["main.cpp", "#include <iostream>\nint main(){int n;std::cin>>n;std::cout<<n*2<<'\\n';}\n"],
  java: ["Main.java", "import java.util.*;\npublic class Main{public static void main(String[] a){System.out.println(new Scanner(System.in).nextInt()*2);}}\n"],
};

const cases: Case[] = [
  ...Object.entries(echoDouble).map(([language, [file, source]]) => ({
    name: `${language} runs`,
    language,
    file,
    source,
    expect: (run: { status: string; stdout: string }) => run.status === "SUCCESS" && run.stdout.trim() === "42",
    want: "SUCCESS, prints 42",
  })),
  { name: "endless loop stops", language: "python", file: "main.py", source: "while True:\n    pass\n", expect: (r) => r.status === "TIME_LIMIT_EXCEEDED", want: "TIME_LIMIT_EXCEEDED" },
  {
    name: "memory hog stops",
    language: "c",
    file: "main.c",
    source: '#include <stdlib.h>\n#include <string.h>\nint main(){for(int i=0;i<64;i++){char*p=malloc(16<<20);if(!p)return 3;memset(p,1,16<<20);}return 0;}\n',
    expect: (r) => r.status === "MEMORY_LIMIT_EXCEEDED" || r.status === "RUNTIME_ERROR",
    want: "MEMORY_LIMIT_EXCEEDED or RUNTIME_ERROR",
  },
  {
    name: "network is blocked",
    language: "python",
    file: "main.py",
    source: "import socket\nsocket.create_connection(('1.1.1.1', 80), timeout=2)\nprint('connected')\n",
    expect: (r) => !r.stdout.includes("connected"),
    want: "no connection",
  },
];

let failed = 0;
const health = await fetch(`${url}/v1/health`).then((res) => res.json()).catch((err: Error) => ({ error: err.message }));
console.log("health:", JSON.stringify(health));
const installed: string[] = Array.isArray(health.languages) ? health.languages : [];

for (const test of cases) {
  if (!installed.includes(test.language)) {
    console.log(`SKIP  ${test.name} (${test.language} not installed)`);
    continue;
  }
  const res = await fetch(`${url}/v1/run`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ language: test.language, files: [{ name: test.file, content: test.source }], stdins: ["21\n"], timeLimitMs: 2000, memoryLimitKb: 128 * 1024 }),
  });
  const body = await res.json();
  const run = body.runs?.[0];
  const ok = res.ok && run && test.expect(run);
  if (!ok) failed++;
  const got = run ? `${run.status} ${JSON.stringify(run.stdout.slice(0, 40))} ${run.timeMs}ms ${run.memoryKb}KB` : `HTTP ${res.status} ${JSON.stringify(body.compile ?? body.error)}`;
  console.log(`${ok ? "PASS" : "FAIL"}  ${test.name}: ${got}${ok ? "" : ` (wanted ${test.want})`}`);
}

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
