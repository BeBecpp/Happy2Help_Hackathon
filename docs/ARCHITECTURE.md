# Architecture

```
┌──────────────────────────┐        ┌──────────────────────────────┐        ┌──────────────────────┐
│  Phone / laptop browser  │  HTTPS │  web/  Next.js 15 (App Router)│  HTTP  │  api/  erxes plugin  │
│  student · staff · MN UI │ ─────▶ │  BFF: /api/graphql allow-list │ ─────▶ │  startPlugin (SDK)   │
│                          │ cookie │  HttpOnly session, identity   │ headers│  Federation 2 subgraph│
└──────────────────────────┘        └──────────────────────────────┘        │  resolvers + ACL     │
                                                                             └──────────┬───────────┘
                                   dev-direct: BFF → plugin /graphql directly            │ Mongoose (tenant)
                                   gateway:    BFF → erxes gateway → plugin              ▼
                                                                             ┌──────────────────────┐
                                                                             │ MongoDB happy2help_* │
                                                                             └──────────────────────┘
                                   async, after SOS commit ──▶ Gemma 4 (OpenRouter / Gemini API) ──▶ happy2help_ai_analyses
                                   erxes Redis ◀── service discovery (erxes-service-happy2help, config, owner)
```

## Plugin (`api/`)
- `src/main.ts` — `startPlugin` from `@erxes/api-shared@3.3.4`: `/graphql`, `/health`, gateway header decoding, Redis registration.
- `src/graphql/schema.ts` — SDL + resolvers, all `happy2help*`. `markResolvers(skipPermission)` then Happy2Help's own ACL.
- `src/modules/access.ts` — actor = tenant (subdomain) + membership (school, role, extra roles) + case scope.
- `src/modules/incidents` — SOS model, severity/routing, assignment, status transitions, action log.
- `src/modules/chat` — one engine: DIRECT, INCIDENT, CARE, STAFF_INTERNAL rooms; members; messages (idempotent).
- `src/modules/council`, `patrol`, `care`, `school` (zones, floor plan, QR HMAC), `ai` (Gemma 4 pipeline, retry sweeper).
- `src/seed/demo.ts` — fictional school, rooms, people (idempotent).

## Web (`web/`)
- `lib/server/operations.ts` — the only GraphQL documents the browser can trigger (by name).
- `lib/server/erxes.ts` — upstream call; dev-direct sets `user`/`cpuser` headers, gateway forwards erxes tokens.
- `features/happy2help/*` — screens (student, teacher), chat, floor map, QR scanner, Council/Patrol/Care, AI card.

## Data (MongoDB, all `happy2help_` prefixed)
schools, zones, memberships, incidents, ai_analyses, conversations, conversation_members, messages,
council_proposals, council_votes, patrol_shifts, patrol_observations, care_requests. Unique indexes enforce
idempotent SOS, one vote per student, one room per key, idempotent messages.

## What is verified vs not
Verified locally: plugin process, Redis registration, offline supergraph composition, all flows (48 E2E, 15 smoke),
one live Gemma 4 reply. Not verified: a running erxes gateway composing the plugin, Core UI remote, hosted tenant install.
