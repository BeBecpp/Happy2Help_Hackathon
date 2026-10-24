import { NextResponse } from "next/server";
import { assertServerConfig } from "@/lib/server/config";
import { callPlugin } from "@/lib/server/erxes";
import { isOperationName } from "@/lib/server/operations";
import { readSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Allow-listed GraphQL proxy. Body: { op: OperationName, variables?: object }.
 * The server owns the query text and attaches the caller's identity from the
 * HttpOnly session cookie. The plugin enforces authorization server-side.
 */
export async function POST(request: Request) {
  try {
    assertServerConfig();
  } catch (error) {
    return NextResponse.json({ errors: [{ message: (error as Error).message, extensions: { code: "TEMPORARY_FAILURE" } }] }, { status: 500 });
  }
  let body: { op?: unknown; variables?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ errors: [{ message: "bad json", extensions: { code: "VALIDATION_ERROR" } }] }, { status: 400 });
  }
  if (!isOperationName(body.op)) {
    return NextResponse.json({ errors: [{ message: "unknown operation", extensions: { code: "VALIDATION_ERROR" } }] }, { status: 400 });
  }
  const variables = body.variables && typeof body.variables === "object" ? (body.variables as Record<string, unknown>) : {};
  const session = await readSession();
  if (!session && body.op !== "Status") {
    return NextResponse.json({ errors: [{ message: "Нэвтрээгүй байна.", extensions: { code: "UNAUTHENTICATED" } }] }, { status: 401 });
  }
  const result = await callPlugin(body.op, variables, session);
  const code = result.errors?.[0]?.extensions?.code;
  const status = code === "UNAUTHENTICATED" ? 401 : code === "TEMPORARY_FAILURE" ? 502 : 200;
  return NextResponse.json(result, { status });
}
