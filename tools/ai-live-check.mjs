#!/usr/bin/env node
// Live AI check through the running BFF: stored Gemma 4 analysis state of an incident (staff view)
// and one student Happy AI turn. Prints states/model ids only — never secrets.
//   node tools/ai-live-check.mjs <incidentId> [http://localhost:3100]
const [incidentId, BASE = "http://localhost:3100"] = process.argv.slice(2);

async function login(personaKey) {
  const res = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ personaKey }) });
  return (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}
const op = async (cookie, name, variables = {}) =>
  (await fetch(`${BASE}/api/graphql`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ op: name, variables }) })).json();

if (incidentId) {
  const staff = await login("oyunaa");
  const r = await op(staff, "TeacherIncident", { _id: incidentId });
  const ai = r.data?.happy2helpTeacherIncident?.ai;
  console.log("incident AI:", JSON.stringify({ state: ai?.state, provider: ai?.provider, modelId: ai?.modelId, failureReason: ai?.failureReason, summaryMn: ai?.summaryMn, latencyMs: ai?.latencyMs }));
}
const student = await login("temuulen");
const a = await op(student, "AssistantAsk", { messages: [{ role: "user", content: "Ангийнхан намайг шоолоод байвал яах вэ?" }] });
console.log("assistant:", a.errors ? `ERROR ${a.errors[0].extensions?.code}: ${a.errors[0].message}` : JSON.stringify(a.data.happy2helpAssistantAsk));
