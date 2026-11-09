export const MILESTONES = [1, 3, 5, 10, 25, 50, 100];

/** Whether this solved count is a milestone, and the next one to reach. */
export function milestoneStatus(solved: number) {
  return {
    reached: MILESTONES.includes(solved),
    previous: MILESTONES.filter((m) => m <= solved).at(-1) ?? 0,
    next: MILESTONES.find((m) => m > solved) ?? null,
  };
}
