import { NextResponse } from "next/server";
import { isNotionConfigured, setCheckbox } from "@/lib/notion";

const FIELDS = {
  task: ["Done", "Complete"],
  note: ["Reviewed", "Review"],
} as const;

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    pageId?: string;
    kind?: keyof typeof FIELDS;
    value?: boolean;
  };

  if (!body.pageId || !body.kind || !(body.kind in FIELDS) || typeof body.value !== "boolean") {
    return NextResponse.json(
      { error: "pageId, kind (task|note) and boolean value are required" },
      { status: 400 },
    );
  }

  if (!isNotionConfigured()) {
    return NextResponse.json({ error: "Notion is not configured" }, { status: 400 });
  }

  try {
    await setCheckbox(body.pageId, [...FIELDS[body.kind]], body.value);
    return NextResponse.json({ ok: true, message: "Synced to Notion Student OS." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notion update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
