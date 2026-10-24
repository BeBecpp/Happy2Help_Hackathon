# ASTRA_AI_PRIZE_ADDENDUM.md

## Happy2Help — AI prize-track implementation addendum

This is an **addendum** to `ASTRA_BUILD_BRIEF.md`, `ASTRA_DESIGN_SYSTEM.md`, and `ASTRA_QA_CHECKLIST.md`. It must not displace the core SOS workflow.

### Three award tracks

1. **Best EdTech Project — erxes Choice Award**: proven erxes integration, persistent SOS-to-teacher acknowledgment, student status.
2. **Best Open-Source AI Project — DigitalOcean**: real, meaningful use of an open-source/open-weight model with reproducible integration, clear documented limits, and working demo.
3. **Best Use of Gemma 4 — Google DeepMind**: live, verified Gemma 4 analysis of fictional Mongolian-language incident text, using an officially supported model endpoint and identifier checked at development time.

### One AI feature, two AI tracks

Add a clearly labeled **Happy AI — Gemma 4** section to the authorized teacher incident detail screen. The model does not chat directly with a child or decide incident outcomes in the MVP. The feature is limited to a short summary and teacher-review assistance of the *fictional* case description.

Proposed API contract (adapt to actual erxes schema):

```graphql
enum AiAnalysisState { PENDING READY FAILED }

type Happy2HelpAiAnalysis {
  state: AiAnalysisState!
  provider: String
  modelId: String
  summaryMn: String
  categorySuggestion: String
  teacherActionsMn: [String!]!
  generatedAt: DateTime
}
```

The model response should be strictly validated, bounded in length, and treated as untrusted content. The backend must verify that the caller is authorized staff for this incident and school, and retain the student's original description unchanged. AI output must never be used to authorize access or automatically escalate, reject, assign fault, resolve, or acknowledge an incident.

**Execution:** first persist SOS and return success. AI analysis executes after submission, is bounded by a strict timeout and failure policy, and must not delay the SOS flow. Handle `PENDING`, `READY`, and `FAILED` separately; never show fabricated analysis as a live AI result. Only send entirely fictional demo data to third-party inference endpoints. Store API keys server-side, never expose them to the browser or commit them.

### UI spec

- In teacher incident detail, add a visually separate pale-cloud card headed `Happy AI · Багшид туслах хураангуй`.
- `PENDING`: `Товч мэдээлэл бэлтгэж байна…` with an unobtrusive skeleton.
- `READY`: display short Mongolian summary, `AI-ийн санал` label, and factual disclaimer `Энэ бол AI-ийн санал. Эцсийн шийдвэрийг багш гаргана.`
- `FAILED`: `AI-ийн хураангуй одоогоор боломжгүй. Хүсэлтийн мэдээлэл хэвийн хадгалагдсан.` No alarming banner or blockage.
- The incident title, original report, timestamp, SOS status, and teacher acknowledgment remain visually higher priority than AI.
- Mobile: one stacked card below original incident. Desktop: a secondary panel no wider than the detail column.

### Engineering QA and evidence

- [ ] Verify the exact Gemma 4 model identifier and official inference endpoint using current provider documentation and actual account availability. Do not substitute a Gemini-proprietary model and call it Gemma 4.
- [ ] Live API request succeeds using a fictional Mongolian incident, and the response is visible in the actual teacher UI.
- [ ] Save a redacted proof of the model identifier and timestamp; never publish the API key or private request data.
- [ ] Show real and failed-model cases; SOS, teacher queue, and acknowledgment continue to work in either case.
- [ ] Add tests for invalid JSON, too-long text, timeout, quota errors, and prompt-injection content in the incident description.
- [ ] Keep prompts, schema, and small fictional Mongolian evaluation examples in the public repo; explain whether inference uses Gemma 4 via Gemini API or a self-hosted model.
- [ ] README reports the actual model, how it was accessed, open-source/open-weight licensing, what was implemented and tested, and limitations. Do not claim fully self-hosted or model training if inference uses a hosted API.

### Time-budget rule

Finish the erxes P0 workflow first or in a separately isolated track. If the verified Gemma 4 call is not available, keep the safety flow functional and describe AI as unverified/in progress rather than claiming award-track completion.
