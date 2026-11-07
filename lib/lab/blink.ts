/**
 * Tiny Arduino "sketch" reader for the Lab preview. It understands the blink pattern:
 * pinMode, digitalWrite(pin, HIGH|LOW), delay(ms) and Serial.println("text") inside loop().
 * shortcut: not a real AVR emulator; upgrade to an avr8js-based simulator for full sketches.
 */
export type Step =
  | { kind: "write"; pin: number; high: boolean }
  | { kind: "delay"; ms: number }
  | { kind: "print"; text: string };

export interface Sketch { outputPins: number[]; steps: Step[]; error?: string }

const MIN_DELAY = 50;
const MAX_DELAY = 10_000;

function pinNumber(token: string): number | null {
  const t = token.trim();
  if (t === "LED_BUILTIN") return 13;
  return /^\d+$/.test(t) ? Number(t) : null;
}

function bodyOf(code: string, signature: RegExp): string | null {
  const match = signature.exec(code);
  if (!match) return null;
  let depth = 0;
  for (let i = code.indexOf("{", match.index); i >= 0 && i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}" && --depth === 0) return code.slice(code.indexOf("{", match.index) + 1, i);
  }
  return null;
}

export function parseSketch(source: string): Sketch {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const setup = bodyOf(code, /void\s+setup\s*\(\s*\)/);
  const loop = bodyOf(code, /void\s+loop\s*\(\s*\)/);
  if (setup === null || loop === null) return { outputPins: [], steps: [], error: "A sketch needs both void setup() { } and void loop() { }." };

  const outputPins = [...setup.matchAll(/pinMode\s*\(\s*(\w+)\s*,\s*OUTPUT\s*\)/g)]
    .map((m) => pinNumber(m[1])).filter((p): p is number => p !== null);

  const steps: Step[] = [];
  const statement = /digitalWrite\s*\(\s*(\w+)\s*,\s*(HIGH|LOW|1|0)\s*\)|delay\s*\(\s*(\d+)\s*\)|Serial\.println\s*\(\s*"((?:\\.|[^"\\])*)"\s*\)/g;
  for (const m of loop.matchAll(statement)) {
    if (m[1] !== undefined) {
      const pin = pinNumber(m[1]);
      if (pin !== null) steps.push({ kind: "write", pin, high: m[2] === "HIGH" || m[2] === "1" });
    } else if (m[3] !== undefined) {
      steps.push({ kind: "delay", ms: Math.min(Math.max(Number(m[3]), MIN_DELAY), MAX_DELAY) });
    } else if (m[4] !== undefined) {
      steps.push({ kind: "print", text: m[4] });
    }
  }
  if (!steps.some((s) => s.kind === "delay")) return { outputPins, steps, error: "Add at least one delay(ms) to loop() so the LED has time to blink." };
  return { outputPins, steps };
}

export const BLINK_SKETCH = `// Blink the LED wired to pin 13
void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("LED on");
  delay(500);
  digitalWrite(13, LOW);
  Serial.println("LED off");
  delay(500);
}
`;
