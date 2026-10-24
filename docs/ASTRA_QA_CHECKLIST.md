# ASTRA_QA_CHECKLIST.md

## Happy2Help Hack Day acceptance checklist

Record the tested build/commit and tester initials beside this checklist. Use two fictional students, two fictional teachers, and at least two schools or tenants where possible. Mark an item complete only after observing its behavior in the running app and persisted plugin data.

### Real erxes integration

- [ ] The UI calls the actual erxes XOS plugin GraphQL endpoint.
- [ ] Incident creation writes to the plugin’s persistent store; refresh or service restart does not erase it.
- [ ] Teacher queue reads incidents from that same store.
- [ ] Acknowledgment changes the persisted record and records teacher and time.
- [ ] Demo success does not depend on static JSON, local storage, or a mocked mutation.
- [ ] Plugin setup, required environment variables, schema registration, and migrations are documented.

### Student SOS creation

- [ ] A signed-in student sees only zones assigned to their school.
- [ ] The student can select a zone, choose a category, and submit with or without optional text.
- [ ] Required fields and the 1,000-character limit are enforced in both UI and resolver.
- [ ] Double tap or retry after a lost response creates only one incident.
- [ ] The success screen displays the server-returned incident ID and `SUBMITTED` status through the app’s route, without exposing the ID unnecessarily in UI copy.
- [ ] Submission failure preserves the student’s input and offers retry.
- [ ] A signed-out user cannot create an incident.

### Staff authorization and acknowledgment

- [ ] A verified teacher sees incidents for their authorized school.
- [ ] A student cannot call teacher list, detail, or acknowledgment operations directly.
- [ ] A teacher cannot read or acknowledge an incident from another school or tenant by changing the URL or GraphQL ID.
- [ ] A teacher can acknowledge a `SUBMITTED` incident once.
- [ ] Repeating acknowledgment is safe and does not duplicate timestamps or timeline events.
- [ ] The teacher detail and queue update after acknowledgment.
- [ ] A concurrent acknowledgment by another teacher resolves to the persisted current state.

### Student status and privacy

- [ ] The reporting student sees `SUBMITTED` immediately after creation.
- [ ] After teacher acknowledgment, refresh shows “Багш хүлээн авсан” and the correct time.
- [ ] Another student cannot read the incident by guessing or copying its ID.
- [ ] Out-of-scope IDs do not reveal whether an incident exists.
- [ ] Student views do not expose teacher internal IDs, other students’ details, or unrelated school data.
- [ ] Logs, analytics, screenshots, and README examples contain no real student data.

### Tenant isolation

- [ ] Tenant and school are derived from authenticated server context, not trusted from browser input.
- [ ] Zone IDs are checked against the student’s authorized school during creation.
- [ ] Student list/detail and teacher list/detail queries filter by tenant and school server-side.
- [ ] Changing a request variable, route parameter, or browser state cannot cross tenant boundaries.
- [ ] A user with no valid school membership receives a clear access state.

### Mobile and responsive design

- [ ] At 390px wide, sign-in, home, zone picker, SOS form, timeline, teacher queue, and teacher detail have no horizontal overflow.
- [ ] Primary actions remain reachable above browser safe areas and while the keyboard is open.
- [ ] Tap targets are at least 44×44px.
- [ ] The first student home viewport shows the SOS action clearly.
- [ ] At 768px, cards and forms use deliberate spacing without awkward stretching.
- [ ] At 1440px, reading widths remain controlled and the teacher queue does not become a generic full-width table.
- [ ] The kitten mascot, brand colors, and card styles remain consistent across all seven screens.

### Language and accessibility

- [ ] Every visible UI string, including errors, loading states, empty states, placeholders, dates, and button labels, is Mongolian Cyrillic; Happy2Help remains the brand exception.
- [ ] Keyboard navigation reaches every action in a sensible order.
- [ ] Focus is visible on buttons, links, cards, category choices, and zone choices.
- [ ] Inputs have labels; validation errors are associated with their fields.
- [ ] Status and errors are announced by screen readers.
- [ ] Status is understandable without color.
- [ ] Text and control contrast meet WCAG AA.
- [ ] 200% zoom works without clipped text or blocked actions.
- [ ] Reduced-motion preference removes nonessential movement.

### Public repository and demo readiness

- [ ] Public GitHub repository has a concise README with the problem, working MVP path, stack, setup, and demo steps.
- [ ] README distinguishes implemented features from future vision.
- [ ] README explains the erxes plugin integration and where incidents are persisted.
- [ ] Setup works from a clean clone using documented configuration.
- [ ] No secrets, production credentials, or real student data are committed.
- [ ] Demo accounts and seed incidents are fictional and clearly labeled.
- [ ] Screenshots show the 390px student flow and teacher acknowledgment flow.
- [ ] The demo script runs the full path live: student submits → teacher acknowledges → student refreshes and sees status.
- [ ] Prototype wording says it is not an emergency dispatch service and directs immediate danger to a nearby trusted adult.

### Final demo gate

The project is ready to present when one incident completes the entire path in the running application, the GraphQL and persistent store reflect both state changes, role and tenant checks hold, and the 390px student experience is polished and fully in Mongolian Cyrillic.
