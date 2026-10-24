# Happy2Help — Astra frontend handoff (UNTESTED)

This package contains five files extracted from Astra's generated code. It is **not** a complete app, erxes plugin, or tested integration. Do not replace existing code wholesale.

Files are under `astra-frontend/src/happy2help/` to avoid overwriting Claude's working implementation. Claude should compare and selectively port components and CSS into the actual app framework, maintaining existing plugin routing and erxes auth integration.

## Required integration steps

1. Confirm actual erxes frontend framework and plugin host version. Do not assume standalone Next.js.
2. Match `HappyApi` queries/mutations and all returned fields in `api.ts` to the real GraphQL schema. Do not expose internal GraphQL with auth-header spoofing.
3. Supply actual authenticated `HappyAuth` and `HappyApi` props. Confirm school/role/tenant permissions server-side.
4. Verify the brand assets against the original brand board; the vector in `HappyBrand.tsx` is Astra's reconstruction, not the confirmed original mascot.
5. Test real SOS persistence and staff acknowledgment first; Gemma card must show real persisted analysis or unavailable state, never fake success.
6. Run TypeScript build and browser QA for 390/768/1440px before declaring done.

### Warning

No node_modules, package.json, build setup, live browser test, or deployment are included. The code has not been typechecked or compiled here. Keep this `astra-frontend/` folder separate from the actual app until integrated.
