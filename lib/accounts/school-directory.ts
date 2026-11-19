import "server-only";
import { db, must } from "@/lib/db/client";
import type { SchoolLocation, SchoolOption } from "@/types/account";
import { domainMatches, type SchoolLookup, type SchoolRecord } from "./rules";

interface SchoolRow {
  id: string;
  name: string;
  short_name: string;
  location_id: string;
  location_name: string;
  email_domains: string[];
  programs: SchoolRecord["programs"];
  campuses: SchoolRecord["campuses"];
}

const toSchoolRecord = (r: SchoolRow): SchoolRecord => ({
  id: r.id,
  name: r.name,
  shortName: r.short_name,
  locationId: r.location_id,
  locationName: r.location_name,
  emailDomains: r.email_domains,
  programs: r.programs,
  campuses: r.campuses,
});

/** Candidate parent domains for an email host (e.g. "sc.lspu.edu.ph" -> ["sc.lspu.edu.ph", "lspu.edu.ph", "edu.ph"]). */
function domainSuffixes(domain: string): string[] {
  const clean = domain.trim().toLowerCase();
  const parts = clean.split(".").filter(Boolean);
  const suffixes: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) {
    suffixes.push(parts.slice(i).join("."));
  }
  return suffixes;
}

export const schoolDirectory: SchoolLookup & {
  listLocations(): Promise<SchoolLocation[]>;
  listSchools(locationId: string): Promise<SchoolOption[]>;
} = {
  async listLocations() {
    const rows = must(await db().from("schools").select("location_id,location_name").order("name")) as Pick<SchoolRow, "location_id" | "location_name">[];
    const byId = new Map(rows.map((r) => [r.location_id, r.location_name]));
    return [...byId].map(([id, name]) => ({ id, name }));
  },
  async listSchools(locationId) {
    const rows = must(
      await db().from("schools").select("id,name,short_name,campuses,programs").eq("location_id", locationId).order("name"),
    ) as Pick<SchoolRow, "id" | "name" | "short_name" | "campuses" | "programs">[];
    return rows.map((r) => ({ id: r.id, name: r.name, shortName: r.short_name, campuses: r.campuses, programs: r.programs }));
  },
  async findSchool(id) {
    const row = must(await db().from("schools").select("*").eq("id", id).maybeSingle()) as SchoolRow | null;
    return row ? toSchoolRecord(row) : null;
  },
  async findSchoolByDomain(domain) {
    const candidates = domainSuffixes(domain);
    if (candidates.length === 0) return null;
    const rows = must(await db().from("schools").select("*").overlaps("email_domains", candidates).order("name")) as SchoolRow[];
    const found = rows.find((r) => r.email_domains.some((d) => domainMatches(domain, d)));
    return found ? toSchoolRecord(found) : null;
  },
};
