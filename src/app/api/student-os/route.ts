import { NextResponse } from "next/server";
import { createFreshDemoState } from "@/lib/demo-store";
import { fetchNotionStudentOs, isNotionConfigured } from "@/lib/notion";
import { buildSnapshot } from "@/lib/priority";

function demoSnapshot(dailyMinutes: number) {
  const s = createFreshDemoState();
  return buildSnapshot(
    "demo",
    s.courses,
    s.assignments,
    s.exams,
    dailyMinutes,
    s.tasks,
    s.notes,
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceDemo = searchParams.get("demo") === "1";
  const minutes = Number(searchParams.get("minutes") ?? "180");
  const dailyMinutes = Number.isFinite(minutes) ? Math.max(60, minutes) : 180;

  if (forceDemo || !isNotionConfigured()) {
    return NextResponse.json({
      ...demoSnapshot(dailyMinutes),
      ...(forceDemo
        ? {}
        : {
            warning:
              "Notion is not connected yet (add NOTION_API_KEY and database IDs to .env.local). Showing demo Student OS data.",
          }),
    });
  }

  try {
    const live = await fetchNotionStudentOs();
    return NextResponse.json(
      buildSnapshot(
        "notion",
        live.courses,
        live.assignments,
        live.exams,
        dailyMinutes,
        live.tasks,
        live.notes,
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Student OS data";
    return NextResponse.json({
      ...demoSnapshot(dailyMinutes),
      warning: `Notion sync failed (${message}). Showing demo Student OS data instead.`,
    });
  }
}
