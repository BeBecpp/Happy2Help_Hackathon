# Security policy

Happy2Help handles reports from children. Please treat any vulnerability as sensitive.

## Reporting
Email the maintainers (see the GitHub profile of `BeBecpp`) with a private description. Do **not** open a public issue
for a vulnerability, and never include a real student's data in a report. We acknowledge within 72 hours during the
pilot phase.

## Scope and design notes
- Every GraphQL resolver re-derives tenant (erxes subdomain), school membership and roles server-side; nothing from the
  browser is trusted as authority.
- Students can never read staff-only rooms, staff action logs or AI output; Council and Patrol never see case data.
- QR codes carry only an HMAC-signed zone id (no identity, no school id).
- The web BFF exposes an allow-list of operations and stores sessions in an HttpOnly cookie.
- **dev-direct mode** (one-tap fictional personas) is for local development only and must never be deployed publicly;
  use `H2H_MODE=gateway` behind a real erxes gateway.
- AI keys stay server-side; the model receives only fictional data in this prototype and its output is advisory.
