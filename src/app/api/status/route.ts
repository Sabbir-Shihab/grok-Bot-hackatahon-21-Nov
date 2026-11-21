import { NextResponse } from "next/server";
import { isNotionConfigured, updateAssignmentStatus } from "@/lib/notion";
import type { AssignmentStatus } from "@/lib/types";

const ALLOWED: AssignmentStatus[] = [
  "Not started",
  "In progress",
  "Submitted",
  "Graded",
];

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    assignmentId?: string;
    status?: AssignmentStatus;
    mode?: "demo" | "notion";
  };

  if (!body.assignmentId || !body.status || !ALLOWED.includes(body.status)) {
    return NextResponse.json(
      { error: "assignmentId and a valid status are required" },
      { status: 400 },
    );
  }

  if (body.mode === "demo" || !isNotionConfigured()) {
    return NextResponse.json({
      ok: true,
      mode: "demo",
      assignmentId: body.assignmentId,
      status: body.status,
      message: "Demo mode — status updated locally only.",
    });
  }

  try {
    await updateAssignmentStatus(body.assignmentId, body.status);
    return NextResponse.json({
      ok: true,
      mode: "notion",
      assignmentId: body.assignmentId,
      status: body.status,
      message: "Synced status back to Notion Student OS.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update Notion page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
