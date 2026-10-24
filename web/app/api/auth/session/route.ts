import { NextResponse } from "next/server";
import { demoPersonasAllowed, serverConfig } from "@/lib/server/config";
import { DEMO_PERSONAS } from "@/lib/server/demo-personas";
import { callPlugin } from "@/lib/server/erxes";
import { readSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Who am I, as confirmed by the plugin (role, display name, school). Also tells the
 * client which sign-in UI to show: real credentials (gateway) or the labelled
 * fictional personas (dev-direct).
 */
export async function GET() {
  const session = await readSession();
  const base = {
    mode: serverConfig.mode,
    personas: demoPersonasAllowed
      ? DEMO_PERSONAS.map(({ key, kind, label, subtitle, school }) => ({ key, kind, label, subtitle, school }))
      : [],
  };
  if (!session) return NextResponse.json({ ...base, session: null });
  const me = await callPlugin<{ happy2helpMe: { principalType: string; role: "STUDENT" | "TEACHER"; roles: string[]; displayName: string; classLabel: string | null; schoolId: string; schoolNameMn: string } }>("Me", {}, session);
  if (!me.data?.happy2helpMe) {
    const code = me.errors?.[0]?.extensions?.code;
    return NextResponse.json({ ...base, session: null, error: code ?? "UNKNOWN" }, { status: code === "TEMPORARY_FAILURE" ? 502 : 200 });
  }
  const m = me.data.happy2helpMe;
  return NextResponse.json({
    ...base,
    session: {
      role: m.role === "TEACHER" ? "teacher" : "student",
      roles: m.roles ?? [],
      displayName: m.displayName,
      classLabel: m.classLabel,
      schoolName: m.schoolNameMn,
    },
  });
}
