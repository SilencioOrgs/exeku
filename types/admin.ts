export interface ManagedProblemView { id: string; title: string; difficulty: string; category: string; sampleCount: number; hiddenCount: number }

export interface PickableProblem { id: string; title: string; difficulty: string; category: string; totalTests: number }
export interface ProblemSetView { id: string; name: string; problems: { id: string; title: string }[] }
export interface ScheduledEvent { id: string; title: string; startsAt: string; endsAt: string; problemCount: number; status: "upcoming" | "live" | "ended"; audience: string }
export interface AdminUser { id: string; name: string; avatarId: string; borderId: string; schoolEmail?: string; campus?: string; program?: string; solved: number; points: number; isAdmin: boolean; joinedAt: string }
export interface EventsOverview {
  problems: PickableProblem[];
  sets: ProblemSetView[];
  orgs: { id: string; name: string }[];
  campuses: { id: string; name: string }[];
  events: ScheduledEvent[];
}
