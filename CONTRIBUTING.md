# Contributing to Happy2Help

Thank you for helping schools listen to students. Happy2Help is an AGPL-3.0 erxes plugin plus a Next.js app.

## Ground rules
- **Fictional data only** in issues, screenshots, tests and seeds. Never paste a real student's report, name or school.
- Safety first: changes must keep SOS submission independent of AI, chat and network extras.
- Authorization lives in the plugin resolvers (`api/src/modules/access.ts` and per-module services). UI guards are not security.

## Development
```bash
pnpm install
node tools/dev-stack.mjs          # mongod (memory server, persisted in .data/), Redis stub, plugin, seed, web on :3100
pnpm --filter happy2help_api check
pnpm --filter happy2help_api test          # unit
pnpm --filter happy2help_api test:e2e      # real plugin process + mongod
pnpm --filter happy2help_web exec tsc --noEmit
node tools/smoke-bff.mjs                   # live journey through the running web app
```

## Pull requests
1. Open an issue describing the problem (use the bug / feature templates in your PR description if none exist).
2. Keep PRs focused; add or update an E2E assertion for any authorization change.
3. Run the commands above and paste the results in the PR.
4. Do not commit `.env*`, API keys or recordings of real people.

## Code style
TypeScript strict, named exports, Mongolian Cyrillic for all user-facing copy, `happy2help*` prefix for every GraphQL
type and operation (the erxes supergraph is shared).
