# Judges' Q&A — honest answers

**Is this a real erxes plugin?** Yes in structure and runtime: generated with `@erxes/create-plugin`, started with
`startPlugin` from `@erxes/api-shared@3.3.4`, serves a Federation 2 subgraph with `happy2help*` operations, decodes
the gateway's identity headers, and registers through erxes Redis service discovery (keys verified locally). What is
**not** verified: composition by a running erxes gateway and loading inside erxes Core UI (no Docker/gateway on the
venue laptop; the hosted tenant `zevqora.next.erxes.io` is multi-tenant SaaS with no self-serve plugin install).

**How is access controlled?** Server-side on every resolver: tenant (erxes subdomain) + school membership + base
role (STUDENT/TEACHER) + extra roles (COUNCIL_MODERATOR, PATROL_SUPERVISOR, NURSE, SOCIAL_WORKER, SAFEGUARDING_LEAD).
Case scope: oversight staff see all cases of their school; other adults only cases they are assigned to. Tests cover
cross-student, cross-school, cross-role denials (48/48 E2E, 15/15 live smoke).

**Can a student see staff notes?** No. The staff room is a separate `STAFF_INTERNAL` conversation; students get
`INCIDENT_NOT_FOUND` even with the room id, and it is filtered from their conversation list (tests E6, T04, T05).

**What does Gemma 4 do, and is it live?** After an SOS is committed, the plugin asynchronously sends the fictional
description to Gemma 4 (open-weight, Google DeepMind) through a hosted endpoint (OpenRouter `google/gemma-4-*`, or the
Gemini API id `gemma-4-26b-a4b-it`), validates the JSON against a strict schema and stores a teacher-only summary with
suggested next steps. Today's status: the pipeline is tested with labelled fixtures; a live reply was **not** obtained
(OpenRouter 402 no credits, free tier 429, then no venue network). The UI shows FAILED/QUOTA honestly and retries.
The AI never acknowledges, assigns, closes or escalates.

**Hallucination risk?** Output is advisory, strictly validated, labelled "AI-ийн санал", includes an uncertainty note,
and the model is told the student text is data (prompt-injection case in the eval set). Final decisions are human.

**Privacy of children?** Only fictional data in this demo. In production: keys server-side, no student text in logs,
tenant/school isolation, staff action log with actor and time, and the AI step would require school approval.

**Offline / weak network?** Reports are idempotent (`clientRequestId`): a retry after a lost response never
duplicates. The UI shows "not sent" instead of pretending delivery.

**QR?** A signed zone id only, no identity or school in the QR; the server validates it against the student's own
school. Camera scanning is implemented (`html5-qrcode`) and tested on desktop; not yet on a physical phone today.

**What existed before the Hack Day?** A separate preparation repository (`BeBecpp/Happy2Help`) was used for
architecture reference only; the code in this repository was written on 24 Oct 2026. Brand assets (kitten, wordmark)
are the team's own.

**Next steps?** erxes gateway composition at a host, Core UI remote, Gemma credits for live analysis, phone QR test,
school pilot with real policy content for Happy Academy.
