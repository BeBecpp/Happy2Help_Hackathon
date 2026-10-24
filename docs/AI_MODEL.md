# Happy AI — model card (what the AI really does)

| | |
|---|---|
| Model | **Gemma 4** (open-weight, Google DeepMind). Default `google/gemma-4-26b-a4b-it`; fallback chain `google/gemma-4-31b-it:free`, `google/gemma-4-26b-a4b-it:free`, `google/gemma-4-26b-a4b-it`. Gemini API id `gemma-4-26b-a4b-it` also supported. |
| Provider | OpenRouter (`/api/v1/chat/completions`, OpenAI-compatible) or Google Gemini API (`generateContent`). Key is server-side only. |
| Weights vs terms | Gemma 4 weights are open under Google's Gemma Terms of Use; we use hosted inference, we do not redistribute weights or fine-tune. |
| Prompt | `api/src/modules/ai/prompt.ts`, version `happy-ai-gemma4-v1`. Student text is wrapped in explicit delimiters and declared data, not instructions. |
| Output | Strict Zod schema (`api/src/modules/ai/schema.ts`): categorySuggestion (incl. UNCLEAR), urgency, confidence, summaryMn ≤400 chars, riskIndicatorsMn ≤5, teacherActionsMn 1–5, uncertaintyNoteMn. Anything else → FAILED, never shown as AI. |
| When | Only **after** the SOS is committed; never awaited by the mutation; 25 s timeout; per-process call cap; retry sweeper for QUOTA/TIMEOUT/NETWORK (max 6). |
| Who sees it | Teachers in case scope only, labelled «AI-ийн санал · Эцсийн шийдвэрийг багш гаргана». Students never. |
| Never | Acknowledge, assign, close, escalate, diagnose, attribute blame, or trigger emergency dispatch. |
| Eval set | `api/eval/incidents.mn.json` — 10 fictional Mongolian cases incl. a prompt-injection case; `pnpm ai:eval`. |

## Live verification (2026-10-24)
Latest: `docs/ai-proof/latest.json` — 15:42 local, `google/gemma-4-26b-a4b-it:free`, 8.9 s, schema-valid (model listed by the API). Earlier run below.
`docs/ai-proof/latest.json` — 15:01 local, `google/gemma-4-31b-it:free`, 12.2 s, schema-valid, fictional bullying case.
Observed limitation in that reply: one action item contains Greek letters inside a Mongolian word. Capacity was
intermittent all afternoon (free tier 429, paid 402 without credits); incidents then show FAILED · QUOTA and retry.

## Safety stance
Human-in-the-loop by construction. Only fictional data was sent in this hackathon. A school deployment would require
consent, a data-processing agreement with the inference provider, and a review of the Gemma Terms of Use.
