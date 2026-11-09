import "server-only";
import { db, must } from "@/lib/db/client";
import type { SchoolLocation, SchoolOption } from "@/types/account";
import { domainMatches, type SchoolLookup, type SchoolRecord } from "./rules";

// shortcut: loads every school and filters here, upgrade to per-query filters past a few hundred schools.
async function loadSchools(): Promise<SchoolRecord[]> {
  const rows = must(await db().from("schools").select("*").order("name")) as {
    id: string; name: string; short_name: string; location_id: string; location_name: string;
    email_domains: string[]; programs: SchoolRecord["programs"]; campuses: SchoolRecord["campuses"];
  }[];
  return rows.map((r) => ({
    id: r.id, name: r.name, shortName: r.short_name, locationId: r.location_id, locationName: r.location_name,
    emailDomains: r.email_domains, programs: r.programs, campuses: r.campuses,
  }));
}

export const schoolDirectory: SchoolLookup & {
  listLocations(): Promise<SchoolLocation[]>;
  listSchools(locationId: string): Promise<SchoolOption[]>;
} = {
  async listLocations() {
    const byId = new Map((await loadSchools()).map((s) => [s.locationId, s.locationName]));
    return [...byId].map(([id, name]) => ({ id, name }));
  },
  async listSchools(locationId) {
    return (await loadSchools()).filter((s) => s.locationId === locationId).map(({ id, name, shortName, campuses, programs }) => ({ id, name, shortName, campuses, programs }));
  },
  async findSchool(id) {
    return (await loadSchools()).find((s) => s.id === id) ?? null;
  },
  async findSchoolByDomain(domain) {
    return (await loadSchools()).find((s) => s.emailDomains.some((d) => domainMatches(domain, d))) ?? null;
  },
};
