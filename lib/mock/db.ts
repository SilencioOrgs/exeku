import "server-only";
import { MOCK_EVENTS, MOCK_SCORES } from "./competition";
import { MOCK_MEMBERS, MOCK_ORGS } from "./orgs";

export interface MockApplication {
  id: string;
  orgId: string;
  applicantId: string;
  name: string;
  program?: string;
  status: "pending" | "rejected";
}

const seed = () => ({
  orgs: [...MOCK_ORGS],
  members: [...MOCK_MEMBERS],
  applications: [] as MockApplication[],
  events: [...MOCK_EVENTS],
  scores: [...MOCK_SCORES],
});

// shortcut: in-memory on the server, so changes vanish on restart and are shared by every browser. Replaced by the database.
// Kept on globalThis because Next can load this module separately for each route.
// Bump the version when the seed's shape changes, or a running dev server keeps serving the old shape.
const holder = globalThis as unknown as { __exekuMockDbV3?: ReturnType<typeof seed> };
export const mockDb = (holder.__exekuMockDbV3 ??= seed());
