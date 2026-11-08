import "server-only";
import type { SchoolLocation, SchoolOption } from "@/types/account";
import { domainMatches, type SchoolLookup, type SchoolRecord } from "./rules";

// shortcut: seeded in code and added schools are not saved, replace with database queries behind these same methods when Supabase lands.
const SCHOOLS: SchoolRecord[] = [
  {
    id: "lspu",
    name: "Laguna State Polytechnic University",
    shortName: "LSPU",
    locationId: "laguna",
    locationName: "Laguna",
    emailDomains: ["lspu.edu.ph"],
    programs: [{ id: "bscpe", name: "BSCPE" }],
    campuses: [
      { id: "santa-cruz", name: "Santa Cruz Campus (Main)" },
      { id: "siniloan", name: "Siniloan Campus (Host)" },
      { id: "san-pablo", name: "San Pablo City Campus" },
      { id: "los-banos", name: "Los Baños Campus" },
    ],
  },
];

export const schoolDirectory: SchoolLookup & {
  listLocations(): Promise<SchoolLocation[]>;
  listSchools(locationId: string): Promise<SchoolOption[]>;
} = {
  async listLocations() {
    const byId = new Map(SCHOOLS.map((s) => [s.locationId, s.locationName]));
    return [...byId].map(([id, name]) => ({ id, name }));
  },
  async listSchools(locationId) {
    return SCHOOLS.filter((s) => s.locationId === locationId).map(({ id, name, shortName, campuses, programs }) => ({ id, name, shortName, campuses, programs }));
  },
  async findSchool(id) {
    return SCHOOLS.find((s) => s.id === id) ?? null;
  },
  async findSchoolByDomain(domain) {
    return SCHOOLS.find((s) => s.emailDomains.some((d) => domainMatches(domain, d))) ?? null;
  },
};
