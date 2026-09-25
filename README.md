# FollowCare

A lightweight clinic workspace that helps small UAE clinics continue patient care after a consultation. The system schedules post-visit check-ins, interprets simulated patient replies, routes routine issues to a nurse, and escalates only important cases to the doctor — with a concise clinical summary instead of raw messages.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment setup (optional Groq summaries)

Copy `.env.example` to `.env.local` and add your Groq API key:

```bash
cp .env.example .env.local
# set GROQ_API_KEY=... in .env.local
```

`GROQ_MODEL` defaults to `llama-3.3-70b-versatile`. Without a key — or if Groq is unreachable or returns malformed output — the `/api/analyze` endpoint falls back to deterministic local extraction and a templated summary, so the demo works fully offline.

## Architecture notes

- **Stack:** Next.js App Router + TypeScript + Tailwind CSS. No database, no auth — all state lives in a single React context (`src/context/AppContext.tsx`) seeded from `src/lib/seed.ts` and persisted to `localStorage` after hydration. Use **Reset demo** in the sidebar to restore seed data.
- **Deterministic triage:** `src/lib/triage.ts` is a pure function. `triageMessage(message, protocolId)` does normalized phrase matching with negation awareness (`no fever`, `not worse`, `no difficulty breathing`, …) against each protocol's rule objects (`{ id, phrases, severity }` in `src/lib/protocols.ts`). Severity is the max severity of matched rules; `HIGH` routes to `DOCTOR`, `LOW`/`MEDIUM` route to `NURSE`. The LLM never decides urgency.
- **LLM usage:** `POST /api/analyze` calls Groq only for symptom extraction and summary generation (`{ symptoms, summary }`). Severity and routing always come from the deterministic rules.
- **Roles:** sidebar role switcher (Doctor / Nurse / Admin) changes queue presentation; no authentication.

## Demo walkthrough

1. Open the **Dashboard** — live metric cards, the attention panel, and the full follow-up list.
2. Go to **Patients → Aisha Rahman** — her post-procedure visit and care plan are seeded.
3. Click **Simulate Patient Reply**, press **Demo: mild reply**, then **Analyze reply** — severity LOW, routed to the **Nurse Queue**. The doctor is not interrupted.
4. In **Nurse Queue**, try *Send follow-up*, *Escalate to doctor*, or *Resolve*.
5. Back on Aisha's page, simulate again with **Demo: fever + worsening pain** — deterministic rules match `FEVER` and `WORSENING_PAIN`, severity HIGH, routed to the **Doctor Queue**.
6. Open **Doctor Queue** — the alert carries the recent visit, relevant history, latest message, detected red flags, escalation reason, and generated clinical summary. Mark *Review*, *Contact patient*, or *Resolved*.
7. **Reset demo** in the sidebar restores the original seeded state for a repeatable run.

## Scripts

```bash
npm run dev    # dev server
npm test       # vitest unit tests (triage)
npm run lint   # eslint
npm run build  # production build
```
