import { NextResponse } from "next/server";
import { assertServerConfig, demoPersonasAllowed, serverConfig } from "@/lib/server/config";
import { findPersona } from "@/lib/server/demo-personas";
import { callErxesCore, callPlugin } from "@/lib/server/erxes";
import { ERXES_CORE } from "@/lib/server/operations";
import { encodeSession, SESSION_COOKIE, sessionCookieOptions, type Session } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_FAIL = "Нэвтэрч чадсангүй. Мэдээллээ шалгаад дахин оролдоно уу.";

/**
 * gateway mode:    { kind: "staff" | "student", login: string, password: string }
 * dev-direct mode: { personaKey: string }   (fictional demo personas only)
 * On success the plugin's `happy2helpMe` is called to confirm the membership before
 * the cookie is issued, so a login without a school membership is rejected here.
 */
export async function POST(request: Request) {
  try {
    assertServerConfig();
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  let session: Session;

  if (serverConfig.mode === "dev-direct") {
    if (!demoPersonasAllowed) return NextResponse.json({ error: GENERIC_FAIL }, { status: 403 });
    const persona = typeof body.personaKey === "string" ? findPersona(body.personaKey) : null;
    if (!persona) return NextResponse.json({ error: GENERIC_FAIL }, { status: 401 });
    session = {
      mode: "dev-direct",
      kind: persona.kind,
      personaKey: persona.key,
      principalId: persona.principalId,
      email: persona.email,
      issuedAt: Date.now(),
    };
  } else {
    const kind = body.kind === "staff" ? "staff" : body.kind === "student" ? "student" : null;
    const login = typeof body.login === "string" ? body.login.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!kind || !login || !password) return NextResponse.json({ error: GENERIC_FAIL }, { status: 400 });
    if (kind === "staff") {
      const r = await callErxesCore<{ login: string }>(ERXES_CORE.staffLogin, { email: login, password });
      if (!r.data?.login) return NextResponse.json({ error: GENERIC_FAIL }, { status: 401 });
      session = { mode: "gateway", kind, token: r.data.login, issuedAt: Date.now() };
    } else {
      if (!serverConfig.erxesClientPortalId) return NextResponse.json({ error: "ERXES_CP_ID тохируулаагүй байна." }, { status: 500 });
      const r = await callErxesCore<{ clientPortalUserLoginWithCredentials: string }>(ERXES_CORE.studentLogin, {
        clientPortalId: serverConfig.erxesClientPortalId,
        login,
        password,
      });
      if (!r.data?.clientPortalUserLoginWithCredentials) return NextResponse.json({ error: GENERIC_FAIL }, { status: 401 });
      session = { mode: "gateway", kind, token: r.data.clientPortalUserLoginWithCredentials, issuedAt: Date.now() };
    }
  }

  // Server-confirmed role + school membership from the plugin, before issuing the cookie.
  const me = await callPlugin<{ happy2helpMe: { role: "STUDENT" | "TEACHER"; displayName: string; schoolNameMn: string } }>("Me", {}, session);
  if (!me.data?.happy2helpMe) {
    const code = me.errors?.[0]?.extensions?.code;
    const message = code === "FORBIDDEN"
      ? "Энэ бүртгэл Happy2Help-д холбогдсон сургуульд бүртгэлгүй байна."
      : code === "TEMPORARY_FAILURE"
        ? "Сервертэй холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу."
        : GENERIC_FAIL;
    return NextResponse.json({ error: message }, { status: code === "TEMPORARY_FAILURE" ? 502 : 403 });
  }

  const res = NextResponse.json({ ok: true, me: me.data.happy2helpMe });
  res.cookies.set(SESSION_COOKIE, encodeSession(session), sessionCookieOptions());
  return res;
}
