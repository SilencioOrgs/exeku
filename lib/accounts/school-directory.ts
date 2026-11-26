import "server-only";
import { getOrLoadPublic } from "@/lib/cache/public-cache";
import { db, must } from "@/lib/db/client";
import type { SchoolLocation, SchoolOption } from "@/types/account";
import { domainMatches, type SchoolLookup, type SchoolRecord } from "./rules";

const SCHOOLS_CACHE_TTL_MS = 300_000;

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
  listAllCampuses(): Promise<SchoolRecord["campuses"]>;
} = {
  async listLocations() {
    return getOrLoadPublic("schools:locations", SCHOOLS_CACHE_TTL_MS, async () => {
      const rows = must(await db().from("schools").select("location_id,location_name").order("name")) as Pick<SchoolRow, "location_id" | "location_name">[];
      const byId = new Map(rows.map((r) => [r.location_id, r.location_name]));
      return [...byId].map(([id, name]) => ({ id, name }));
    });
  },
  async listSchools(locationId) {
    return getOrLoadPublic(`schools:location:${locationId}`, SCHOOLS_CACHE_TTL_MS, async () => {
      const rows = must(
        await db().from("schools").select("id,name,short_name,campuses,programs").eq("location_id", locationId).order("name"),
      ) as Pick<SchoolRow, "id" | "name" | "short_name" | "campuses" | "programs">[];
      return rows.map((r) => ({ id: r.id, name: r.name, shortName: r.short_name, campuses: r.campuses, programs: r.programs }));
    });
  },
  async listAllCampuses() {
    return getOrLoadPublic("schools:campuses", SCHOOLS_CACHE_TTL_MS, async () => {
      const rows = must(await db().from("schools").select("campuses").order("name")) as Pick<SchoolRow, "campuses">[];
      const seen = new Set<string>();
      const campuses: SchoolRecord["campuses"] = [];
      for (const row of rows) {
        for (const campus of row.campuses ?? []) {
          if (!seen.has(campus.id)) {
            seen.add(campus.id);
            campuses.push(campus);
          }
        }
      }
      return campuses;
    });
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
