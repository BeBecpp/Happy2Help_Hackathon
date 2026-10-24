# Happy2Help — deployment and erxes integration (infra branch `infra/erxes-deploy`)

Status date: 2026-10-24, ~16:30 Asia/Ulaanbaatar. Every row says what was actually run.

## 1. What infrastructure exists (checked, not assumed)
| Resource | Result |
|---|---|
| Docker / real Redis / mongod on the laptop (Windows + WSL kali/Ubuntu) | none installed |
| AWS CLI | present, **no credentials** (`NoCredentials`) |
| Vercel / Fly / Railway / DigitalOcean / GCP / Azure CLIs | not installed |
| GitHub (`gh`, account BeBecpp) | authenticated, scopes `repo`, `workflow` → **GitHub Actions is the only authorized compute** |
| Hosted erxes `zevqora.next.erxes.io` | operator-managed multi-tenant SaaS; no self-serve plugin install → **blocked on erxes operator** |
| Public DNS name / TLS certificate / VPS | none provided |

Consequence: no public production URL exists. Real infrastructure verification is done on GitHub Actions
service containers (`redis:7`, `mongo:7`) with the production builds — see §3.

## 2. Security changes on this branch
- `web/lib/server/config.ts` fails closed: with `NODE_ENV=production`, an unset or unknown `H2H_MODE` means
  `gateway`; the fictional persona switcher (`dev-direct`) runs in production only with the explicit opt-in
  `H2H_ALLOW_DEMO_PERSONAS=fictional-local-only` (localhost judging / CI). `/api/auth/session` returns no personas
  and `/api/auth/login` refuses persona keys otherwise.
- The plugin trusts the erxes gateway's forwarded `user` / `cpuser` headers (that is how erxes subgraphs work),
  so it must never be publicly reachable: `deploy/docker-compose.prod.yml` keeps it on an `internal: true`
  network with no published port. Only Caddy (80/443) is public.
- Secrets live in `deploy/.env.prod` on the server only (gitignored); `deploy/.env.prod.example` lists names.

## 3. Real Redis + MongoDB verification (GitHub Actions)
Workflow: `.github/workflows/infra-verify.yml` (runs on `main` and `infra/**`). Steps, all against real services:
1. `pnpm install --frozen-lockfile`, API + web typecheck, unit tests.
2. Production builds: `pnpm --filter happy2help_api build` (plugin `dist`) and `next build`.
3. Start `node api/dist/main.js` with `NODE_ENV=production`, `REDIS_HOST=127.0.0.1:6379` (real Redis), real MongoDB.
4. Seed fictional data; read erxes service-discovery keys from real Redis (`tools/redis-keys.mjs` + `redis-cli KEYS 'erxes*'`).
5. `tools/federation-check.mjs` composes the live subgraph into a Federation 2 supergraph.
6. `next start` (production) → `tools/smoke-bff.mjs`: SOS from a floor-2 zone → critical inbox → acknowledge →
   assign → two-way follow-up chat → staff-only room denials → student status → cross-school denial.
7. Production auth guard: a second `next start` without opt-in must report `mode=gateway`, zero personas, and refuse persona login.
8. Full E2E suite (`test:e2e`).
Result: see §6 (filled in from the actual run).

## 4. Self-hosted production shape (prepared, NOT yet run on a server)
```bash
# on a Linux host with Docker, a DNS name pointing at it, and an erxes stack reachable as ERXES_GRAPHQL_URL
git clone https://github.com/BeBecpp/Happy2Help_Hackathon.git && cd Happy2Help_Hackathon
cp deploy/.env.prod.example deploy/.env.prod   # fill values on the server
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
docker compose -f deploy/docker-compose.prod.yml exec plugin-happy2help-api node -e "fetch('http://127.0.0.1:3399/health').then(r=>console.log(r.status))"
```
Services: `mongo:7` (replica set, volume), `redis:7` (password, AOF), `plugin-happy2help-api` (root `Dockerfile`,
production `dist`, healthcheck), `web` (`web/Dockerfile`, `H2H_MODE=gateway`), `caddy:2` (automatic HTTPS, HSTS).

## 5. Installing into a real erxes host (operator steps)
1. Run the plugin image on the erxes host's network with the **same** `MONGO_URL` and Redis as erxes core, and
   `LOAD_BALANCER_ADDRESS=http://plugin-happy2help-api:3399` (address the gateway can reach).
2. Add `happy2help` to the gateway's enabled plugins (`ENABLED_PLUGINS` / `ENABLED_PLUGINS_ONLY_API`, per erxes version).
3. Restart the gateway; it reads `erxes-service-happy2help` / `erxesservice:config:happy2help` from Redis and composes the subgraph.
4. Point the web app at the gateway: `H2H_MODE=gateway`, `ERXES_GRAPHQL_URL`, `ERXES_CP_ID`, `ERXES_CP_APP_TOKEN`.
5. Map real erxes users to school memberships: `pnpm seed` with a map file (`api/src/scripts/seed.ts`) — fictional demo only until a school approves.

## 6. Verification results
| Check | Where | Result |
|---|---|---|
| Whole workflow | [run 40077436989](https://github.com/BeBecpp/Happy2Help_Hackathon/actions/runs/40077436989), commit on `infra/erxes-deploy`, 2026-10-24 16:17–16:20 | **success** |
| Typecheck (API + web), unit tests, production builds (plugin `dist`, `next build`) | same run | PASS |
| Plugin `node api/dist/main.js` (`NODE_ENV=production`) healthy against real `redis:7` + `mongo:7` | same run | PASS |
| erxes service discovery in **real Redis** | same run | `redis 127.0.0.1:6379 · 3 erxes keys`, `erxes-service-happy2help = http://127.0.0.1:3399` (also listed by `redis-cli KEYS 'erxes*'`) |
| Federation composition of the live subgraph | same run | `PASS composed supergraph: 18831 chars · 40/40 happy2help fields present` |
| Judge journey through production web → plugin → real Mongo/Redis (`tools/smoke-bff.mjs`) | same run | `15/15 passed · incident #DIIT` |
| Production auth guard (no opt-in) | same run | `/api/auth/session` → `{"mode":"gateway","personas":[],"session":null}`; persona login → HTTP 500 `ERXES_GRAPHQL_URL is required in gateway mode.`, no session cookie |
| Full E2E suite | same run | `tests 48 · pass 48 · fail 0` |
| Gemma 4 in CI | — | not run (no repository secret configured; local live proof in `docs/ai-proof/latest.json`) |

## 7. Remaining gaps (honest)
- No public HTTPS URL: no authorized host, DNS or cloud credentials were available.
- No real erxes gateway composition and no erxes Core UI remote (Module Federation): not implemented, and nothing
  to load it into. `erxes.json`'s `ui` block is declarative only.
- Gateway-mode login (`web/lib/server/erxes.ts`) has never run against a real gateway.
- Gemma 4 in production depends on `OPENROUTER_API_KEY` credits; free slugs are frequently rate-limited upstream.
