import { redirect } from "next/navigation";
import { readSession } from "@/lib/server/session";
import { callPlugin } from "@/lib/server/erxes";

export const dynamic = "force-dynamic";

export default async function Index() {
  const session = await readSession();
  if (!session) redirect("/sign-in");
  const me = await callPlugin<{ happy2helpMe: { role: "STUDENT" | "TEACHER" } }>("Me", {}, session);
  if (!me.data?.happy2helpMe) redirect("/sign-in");
  redirect(me.data.happy2helpMe.role === "TEACHER" ? "/teacher/incidents" : "/student");
}
