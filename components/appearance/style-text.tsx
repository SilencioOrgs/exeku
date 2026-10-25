import type { ReactNode } from "react";

/** Legacy copy variants remain accepted for backwards compatibility. */
export function StyleText({ clarity }: { arcade: ReactNode; clarity: ReactNode; command?: ReactNode }) {
  return <>{clarity}</>;
}
