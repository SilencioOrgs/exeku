import { NextResponse } from "next/server";
import { getEventsFeed } from "@/lib/competition/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return NextResponse.json(await getEventsFeed(searchParams.get("viewer") ?? "", searchParams.get("campus") ?? undefined));
}
