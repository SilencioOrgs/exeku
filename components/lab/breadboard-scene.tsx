/**
 * Illustrated Arduino Uno + breadboard + LED circuit: pin 13 -> 220 Ω resistor -> LED -> GND rail -> GND.
 * Pure SVG so it stays crisp, themable and offline.
 */
const HOLE_COLS = 18;
const HOLE_ROWS = 5;

export function BreadboardScene({ ledOn, className }: { ledOn: boolean; className?: string }) {
  const holes: React.ReactNode[] = [];
  for (const top of [64, 152]) {
    for (let r = 0; r < HOLE_ROWS; r++) {
      for (let c = 0; c < HOLE_COLS; c++) {
        holes.push(<rect key={`${top}-${r}-${c}`} x={262 + c * 13} y={top + r * 13} width="5" height="5" rx="1" fill="var(--bb-hole)" />);
      }
    }
  }
  return (
    <svg viewBox="0 0 520 270" className={className} role="img" aria-label={`Arduino Uno wired to an LED on pin 13. The LED is ${ledOn ? "on" : "off"}.`}>
      <defs>
        <linearGradient id="bb-board" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--bb-board-top)" />
          <stop offset="1" stopColor="var(--bb-board)" />
        </linearGradient>
        <linearGradient id="bb-uno" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5fc4c6" />
          <stop offset="1" stopColor="#2f9ea3" />
        </linearGradient>
        <radialGradient id="bb-glow">
          <stop offset="0" stopColor="#ff7a6b" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ff7a6b" stopOpacity="0" />
        </radialGradient>
        <filter id="bb-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#4a3014" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Arduino Uno */}
      <g filter="url(#bb-shadow)">
        <rect x="14" y="40" width="200" height="160" rx="12" fill="url(#bb-uno)" stroke="#23787c" />
        <rect x="14" y="120" width="34" height="30" rx="3" fill="#c9ced3" stroke="#8a9096" />
        <rect x="18" y="168" width="26" height="22" rx="3" fill="#2b2b2b" />
        <rect x="96" y="96" width="78" height="26" rx="3" fill="#1f2a30" />
        <text x="135" y="113" textAnchor="middle" fontSize="11" fontWeight="700" fill="#e6f7f7" fontFamily="var(--font-code)">UNO</text>
        <rect x="70" y="46" width="138" height="12" rx="2" fill="#1f1f1f" />
        {Array.from({ length: 14 }, (_, i) => <rect key={i} x={73 + i * 9.6} y="49" width="5" height="6" fill="#bfa76a" />)}
        <text x="78" y="70" fontSize="8" fill="#e6f7f7" fontFamily="var(--font-code)">GND</text>
        <text x="113" y="70" fontSize="8" fill="#e6f7f7" fontFamily="var(--font-code)">13</text>
        <circle cx="166" cy="140" r="4" fill={ledOn ? "#ffd54f" : "#6c7a6c"} />
        <text x="174" y="143" fontSize="7" fill="#e6f7f7" fontFamily="var(--font-code)">L</text>
      </g>

      {/* Breadboard */}
      <g filter="url(#bb-shadow)">
        <rect x="246" y="34" width="262" height="212" rx="12" fill="url(#bb-board)" stroke="var(--bb-edge)" />
        <rect x="252" y="134" width="250" height="10" rx="3" fill="var(--bb-channel)" />
        {/* Top rail is ground (blue), bottom rail is power (red). */}
        <rect x="252" y="42" width="250" height="3" rx="1.5" fill="#5b8def" opacity="0.8" />
        <rect x="252" y="236" width="250" height="3" rx="1.5" fill="#e06c6c" opacity="0.7" />
        {holes}
      </g>

      {/* Resistor: row 2, columns 3-7 */}
      <g>
        <line x1="303" y1="92" x2="368" y2="92" stroke="#8d8d8d" strokeWidth="2" />
        <rect x="318" y="85" width="36" height="14" rx="6" fill="#e9cfa5" stroke="#b9996a" />
        {[324, 331, 338, 346].map((x, i) => <rect key={x} x={x} y="85" width="3" height="14" fill={["#b03a2e", "#b03a2e", "#5a3a1e", "#c9a227"][i]} />)}
      </g>

      {/* LED: anode col 9, cathode col 10 (top), legs into the board */}
      <g>
        {ledOn && <circle cx="384" cy="70" r="34" fill="url(#bb-glow)" />}
        <line x1="378" y1="80" x2="378" y2="94" stroke="#9a9a9a" strokeWidth="2" />
        <line x1="391" y1="80" x2="391" y2="120" stroke="#9a9a9a" strokeWidth="2" />
        <path d="M372 80 v-12 a12 12 0 0 1 24 0 v12 z" fill={ledOn ? "#ff5a4f" : "#c98a85"} stroke="#9c3b34" />
        <ellipse cx="380" cy="64" rx="3" ry="5" fill="#ffffff" opacity={ledOn ? 0.8 : 0.4} />
      </g>

      {/* Wires */}
      <path d="M116 52 C 116 10, 290 10, 300 92" fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
      <path d="M80 52 C 80 -8, 460 -8, 470 43" fill="none" stroke="#3a3a3a" strokeWidth="4" strokeLinecap="round" />
      <path d="M391 120 Q 436 112 440 44" fill="none" stroke="#3a3a3a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
