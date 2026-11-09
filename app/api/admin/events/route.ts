import { NextResponse } from "next/server";
import { readJson } from "@/lib/accounts/read-json";
import { isObject } from "@/lib/accounts/rules";
import { createCompetition, createEvent, createSet, deleteEvent, deleteSet, getEventsOverview, rescheduleEvent } from "@/lib/admin/events";
import { requireAdmin } from "@/lib/admin/guard";

const ACTIONS = { createCompetition, createSet, deleteSet, createEvent, rescheduleEvent, deleteEvent };
const isAction = (value: unknown): value is keyof typeof ACTIONS => typeof value === "string" && Object.hasOwn(ACTIONS, value);

export async function GET() {
  const admin = await requireAdmin();
  if ("denied" in admin) return admin.denied;
  return NextResponse.json(await getEventsOverview());
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("denied" in admin) return admin.denied;
  const body = await readJson(request);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });
  const action = isObject(body.value) ? body.value.action : undefined;
  if (!isAction(action)) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const result = await ACTIONS[action](body.value);
  if (!result.ok) return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: result.status });
  return NextResponse.json({ ok: true });
}
