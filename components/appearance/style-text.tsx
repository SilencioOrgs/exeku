import type { ReactNode } from "react";

export function StyleText({ arcade, clarity, command = clarity }: { arcade: ReactNode; clarity: ReactNode; command?: ReactNode }) {
  return <><span className="arcade-copy">{arcade}</span><span className="clarity-copy">{clarity}</span><span className="command-copy">{command}</span></>;
}
