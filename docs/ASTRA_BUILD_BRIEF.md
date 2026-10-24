# ASTRA_BUILD_BRIEF.md

## Happy2Help — MVP build brief

**Product promise:** A student can ask a trusted adult at school for help, and see when a teacher has acknowledged the request.

**Hack Day demo path:** Student signs in → selects a school zone → submits an SOS report → the erxes plugin persists an incident → an authorized teacher sees it → the teacher acknowledges it → the student sees the updated status.

The official challenge page and repositories were unavailable to read during this session. This brief uses the project information supplied in chat. Claude should map the illustrative GraphQL names below to the actual erxes XOS plugin interfaces in the workspace.

### Scope and priorities

Build one working vertical slice backed by persistent data. The two incident states required for the demo are `SUBMITTED` and `ACKNOWLEDGED`. Avoid messaging, AI summaries, school maps, council features, and elaborate case management until this path works end to end.

Implementation order:

1. Plugin data model, tenant and school scoping, and authorization.
2. Student creation mutation and student incident query.
3. Teacher queue query and acknowledgment mutation.
4. Student screens for sign-in, zone selection, SOS, and status.
5. Teacher queue and incident detail.
6. Responsive polish, accessibility, realistic demo data, README, and final verification.

### Roles and access

| Role | Allowed | Denied |
|---|---|---|
| Student | View available zones for their school; create an incident for their own account; read their own incidents and statuses | Read another student’s report; acknowledge; choose a different school or tenant |
| Teacher | List and read incidents in their authorized school; acknowledge an incident | Read another school’s incidents; impersonate the reporting student; edit a submitted report |
| Unauthenticated | View sign-in and general help information | Read zones, incidents, or staff queues; submit or acknowledge |

Resolve `tenantId`, `schoolId`, `userId`, and role from trusted erxes authentication context. Never accept these as authoritative values from the browser. If a user belongs to multiple schools, require an authorized school selection and verify membership server-side on every request.

### Data model

`Incident`:

- `id`: opaque stable ID
- `tenantId`, `schoolId`: server-derived scope
- `studentId`: server-derived reporter
- `zoneId`: validated school zone
- `category`: one of `BULLYING`, `UNSAFE`, `WELLBEING`, `OTHER`
- `description`: optional student text, maximum 1,000 characters
- `status`: `SUBMITTED` or `ACKNOWLEDGED`
- `createdAt`, `updatedAt`
- `acknowledgedAt`, `acknowledgedBy`: nullable until acknowledgment
- `clientRequestId`: unique per student and school to prevent duplicate submissions after retries

`SchoolZone`:

- `id`, `tenantId`, `schoolId`
- `nameMn`: Mongolian display name
- `sortOrder`, `isActive`

Keep student identity visible only where needed by authorized staff. Never put report descriptions, student names, or IDs in analytics events, client logs, or public demo screenshots. Use fictional data for demonstrations.

### State transitions

```text
SUBMITTED ──teacher acknowledges──> ACKNOWLEDGED
```

- Creating an incident sets `SUBMITTED`, `createdAt`, and the reporter’s server-side identity.
- Acknowledgment sets `ACKNOWLEDGED`, `acknowledgedAt`, and `acknowledgedBy` atomically.
- A repeated acknowledgment should return the current incident without creating duplicate timeline events.
- The student sees the status after refetching or reopening the incident. A real-time subscription is optional; a visible refresh action is sufficient.
- Do not imply that `ACKNOWLEDGED` means the concern has been resolved.

### Screen structure and routes

Use the project’s existing routing conventions; these paths express intended structure.

| Route | Audience | Main purpose |
|---|---|---|
| `/sign-in` | Both | Authenticate through the available erxes-compatible flow |
| `/student` | Student | Home, reassurance, primary SOS action, latest report |
| `/student/sos/zone` | Student | Select a zone belonging to their school |
| `/student/sos/report` | Student | Choose concern type, optionally describe it, submit |
| `/student/incidents/:id` | Student owner | Read status and timeline |
| `/teacher/incidents` | Authorized teacher | Review submitted incidents first |
| `/teacher/incidents/:id` | Authorized teacher | Read a report and acknowledge it |

After sign-in, route by the server-confirmed role. A user with no valid school membership gets a clear access state rather than an empty application.

### GraphQL contract

Names are illustrative. Fit them to the actual plugin schema while preserving behavior.

```graphql
enum IncidentStatus {
  SUBMITTED
  ACKNOWLEDGED
}

enum IncidentCategory {
  BULLYING
  UNSAFE
  WELLBEING
  OTHER
}

type SchoolZone {
  id: ID!
  nameMn: String!
  sortOrder: Int!
}

type Incident {
  id: ID!
  zone: SchoolZone!
  category: IncidentCategory!
  description: String
  status: IncidentStatus!
  createdAt: DateTime!
  updatedAt: DateTime!
  acknowledgedAt: DateTime
  acknowledgedBy: TeacherSummary
}

input CreateIncidentInput {
  zoneId: ID!
  category: IncidentCategory!
  description: String
  clientRequestId: String!
}

type Query {
  happy2HelpZones: [SchoolZone!]!
  happy2HelpMyIncidents: [Incident!]!
  happy2HelpMyIncident(id: ID!): Incident
  happy2HelpTeacherIncidents(status: IncidentStatus): [Incident!]!
  happy2HelpTeacherIncident(id: ID!): Incident
}

type Mutation {
  happy2HelpCreateIncident(input: CreateIncidentInput!): Incident!
  happy2HelpAcknowledgeIncident(id: ID!): Incident!
}
```

Resolver requirements:

- Every resolver requires a valid authenticated erxes context.
- Student reads filter by `tenantId`, `schoolId`, and `studentId`.
- Teacher reads filter by `tenantId`, `schoolId`, and verified teacher role.
- Zone lookup and creation both verify that the zone is active and belongs to the student’s school.
- Acknowledgment verifies teacher authorization and incident scope in the same operation that updates status.
- Paginate the teacher queue if the plugin already supports pagination. A bounded newest-first list is acceptable for the prototype.
- Return stable error codes for `UNAUTHENTICATED`, `FORBIDDEN`, `ZONE_UNAVAILABLE`, `INCIDENT_NOT_FOUND`, `VALIDATION_ERROR`, and `TEMPORARY_FAILURE`.
- Avoid leaking whether an out-of-scope incident ID exists. Return the same not-found behavior for absent and unauthorized incident IDs.

### User experience states

| Screen | Loading | Empty | Error |
|---|---|---|---|
| Sign-in | Disabled submit with progress label | N/A | Plain-language sign-in error; preserve input |
| Student home | Skeleton for latest report | Reassuring first-report card | Keep SOS action available; retry latest report |
| Zone picker | Zone-card skeletons | “Байршил одоогоор байхгүй байна” and staff guidance | Retry; block progression |
| SOS form | Submit button progress, form locked during request | N/A | Preserve answers; retry with same `clientRequestId` |
| Student timeline | Timeline skeleton | N/A for a valid incident | Retry or access message without exposing data |
| Teacher queue | Card skeletons | “Одоогоор шинэ хүсэлт алга” | Retry; do not show stale data as current |
| Teacher detail | Detail skeleton | N/A | Retry; acknowledge only when incident loaded |

On successful submission, navigate to the newly created incident timeline. If the response is lost after server creation, retry with the same `clientRequestId` so the student does not create a second report.

### Definition of done

- A real student account creates an incident through the UI, and it survives page refresh or service restart according to the plugin’s persistent store.
- An authorized teacher sees that incident in the correct school queue and can acknowledge it.
- The student sees `ACKNOWLEDGED` after refresh, with an acknowledgment timestamp.
- Cross-student, cross-school, and cross-tenant reads and mutations are denied server-side.
- The UI contains Mongolian Cyrillic copy throughout, apart from the Happy2Help brand and unavoidable technical identifiers.
- The 390px flow has no horizontal overflow and its primary actions are usable by touch and keyboard.
- The public repository has setup instructions, a clear feature list, demo credentials or seed steps using fictional users, architecture notes, screenshots, and an honest prototype limitation statement.
- The demo does not rely on a mocked successful mutation or hard-coded incident status.

### Suggested React and TypeScript handoff

Adapt names to the existing application rather than restructuring Claude’s work unnecessarily.

```text
src/
  features/happy2help/
    api/
      operations.ts
      types.ts
    components/
      AppShell.tsx
      BrandMark.tsx
      KittenIllustration.tsx
      PrimaryButton.tsx
      StatusBadge.tsx
      ZoneCard.tsx
      IncidentCard.tsx
      IncidentTimeline.tsx
      FormField.tsx
      FeedbackState.tsx
    student/
      StudentHome.tsx
      ZonePicker.tsx
      SosForm.tsx
      StudentIncidentDetail.tsx
    teacher/
      TeacherIncidentList.tsx
      TeacherIncidentDetail.tsx
    auth/
      SignIn.tsx
      RoleGate.tsx
    styles/
      tokens.css
```

Component responsibilities:

- `RoleGate`: route protection based on server-confirmed role and school membership.
- `ZonePicker`: fetches allowed zones, presents single selection, passes `zoneId` to the form.
- `SosForm`: validates category and text length; owns a stable `clientRequestId` across retries.
- `IncidentTimeline`: renders submitted and acknowledged events from persisted timestamps.
- `TeacherIncidentList`: sorts submitted reports first, then most recent.
- `TeacherIncidentDetail`: shows report content and an acknowledgment action with a clear completion state.
- `FeedbackState`: shared loading, empty, error, and retry presentation.

Use generated GraphQL types if already available. Keep authorization in the plugin resolvers; route guards are only a user experience layer.
