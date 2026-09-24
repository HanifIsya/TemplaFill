# TemplaFill Frontend

Next.js 16.3.6 (App Router) + React 19.2 + Tailwind CSS 4 — industrial dark UI for TemplaFill (upload → processing → review → download).

> This replaces the default `create-next-app` boilerplate. See `docs/3-design/DESIGN.md` & `DESIGN_SYSTEM.md` for spec, and `docs/7-operations/DECISIONS.md` ADR-008 (IBM Plex, slate/indigo, no glassmorphism) & ADR-010/015 for deployment/perf notes.

## Getting Started

```bash
cd frontend
npm install
# env (optional — defaults to http://localhost:8000/api)
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local

npm run dev     # http://localhost:3000
npm run lint    # eslint
npm run build   # next build (static prerender + CSP headers)
npm test        # node --test src/tests/*.test.mjs (13/13, 106ms)
npm start       # after build
```

### Scripts (`package.json`)

| Script | Description |
|--------|-------------|
| `dev` | `next dev` (HMR) |
| `build` | `next build` (verifies CSP in `next.config.ts` + `vercel.json`) |
| `start` | `next start` |
| `lint` | `eslint` (next config) |
| `test` | `node --test src/tests/*.test.mjs` (models 5/5 + e2e 8/8) |

## Stack

- **Framework**: Next.js 16.3.6 (App Router, `next/font` IBM Plex Sans/Mono), React 19.2
- **Styling**: Tailwind CSS 4 (`@tailwindcss/postcss`), `clsx` + `tailwind-merge`, Lucide icons
- **State**: `localStorage` for auth stub (`templafill_auth_user`) + recent sessions (`templafill_recent_sessions`); no external state lib (lean)
- **API client**: `src/lib/api.ts` — `ApiClient` with `checkHealth(7s)`, `waitForBackend(5s×12)` for Render Hobby cold-start (15 min sleep → 60s wake), `uploadFiles` (FormData → `POST /api/upload` → `job_id`), `getJobProgress` (maps `percent/phase/status` → `4/4: Structured Extraction via Gemini 3.6 Flash...` etc.), `getFieldMappings` (maps `extracted_by`/`fallback_reason` → `engineUsed`/`hasFallback` banner + per-field badges), `generateDocument` (→ `downloadUrl` `/api/jobs/{id}/download?type=filled` or demo asset fallback)

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Home — orchestrates landing→upload→processing→review→download, wake polling 12×5s, demo fallback (%PDF/PK minimal headers if /samples fetch fails)
│   │   ├── layout.tsx            # IBM Plex fonts, globals.css
│   │   └── globals.css           # Design tokens (primary/neutral/semantic, display/h1→caption, spacing 4px grid)
│   ├── components/
│   │   ├── Navbar.tsx            # Step indicator, backend dot (live/waking/offline/mock), Help/History triggers
│   │   ├── HeroLanding.tsx       # Tagline + How-it-works + “Try Demo”
│   │   ├── DualDropzone.tsx      # Two drag&drop zones (50MB PDF, 20MB docx/xlsx/pptx, %PDF/PK client check) + demo loader
│   │   ├── ProcessingView.tsx    # 4-phase radar (parsing → embedding → mapping → AI extraction 80%), percent + spinner
│   │   ├── ReviewMappingView.tsx # Split/Table modes, confidence dots (≥0.8/0.5), inline edit, filter tabs, engine badges [Gemini 3.6 Flash]/[Fallback], amber fallback banner + citation modal
│   │   ├── DownloadView.tsx      # Filled doc + summary report download (RFC5987 name), “Start New”
│   │   ├── BackendWakingBanner.tsx # Checking / Waking (Retry 1/12) / Live / Offline; calls api.checkHealth
│   │   ├── HistoryModal.tsx      # localStorage recentSessions (5 max) + clear + download stub
│   │   ├── HelpModal.tsx         # 4-tab in-app user guide (mirrors docs/1-product/USER_GUIDE.md)
│   │   ├── CitationModal.tsx / ReExtractModal.tsx / AddFieldModal.tsx # Verify & hint-driven re-extract
│   │   ├── Footer.tsx
│   │   └── Toast.tsx             # success/warning/error 3.8s
│   ├── lib/
│   │   ├── api.ts                # ApiClient (BASE_URL from NEXT_PUBLIC_API_URL)
│   │   ├── types.ts              # JobProgress, FieldMapping (extractedBy, fallbackReason, isSkipped), ExtractionResult (hasFallback, engineUsed)
│   │   └── mockData.ts           # MOCK_FIELDS (8), MOCK_GENERATION, MOCK_DEMO_SESSION
│   └── tests/
│       ├── models.test.mjs       # 5/5
│       └── e2e.test.mjs          # 8/8 full-flow 106ms
├── public/samples/
│   ├── sample_contract.pdf       # Real 1.1KB binary (passes %PDF)
│   └── sample_template.docx      # Real 36.7KB binary (passes PK)
├── next.config.ts                # securityHeaders (CSP, nosniff, DENY, HSTS preload, Permissions-Policy, x-powered-by:false)
├── vercel.json                   # Mirror headers for Vercel + connect-src https://*.onrender.com https://*.vercel.app
└── package.json                  # next 16.3.6, react 19.2, tailwind 4
```

## UI Contract & Backend Mapping

- `api.checkHealth({timeoutMs:7000})` → `GET /api/health` `{success,data:{status,version,ai_configured,model}}`; `502/503/504` or `AbortError` → `isWaking=true`.
- `uploadFiles()` validates waking first; if `waking`, polls `waitForBackend(6×5s)` then POSTs; on live, unwraps `data.job_id` per `POST /api/upload` 202 contract; on mock, returns `session-${Date.now()}` after 800ms.
- `getJobProgress(jobId, currentPercent)` polls `GET /api/jobs/{id}` → maps `phase`/`percent`/`status` to human step string; `percent>=75` or `status==='extracting'` → `4/4: Structured Extraction via Gemini 3.6 Flash...` (ADR-015).
- `getFieldMappings(sessionId)` → `GET /api/jobs/{id}/results` → normalizes `confidence` → `confidenceLevel` (≥0.8 high), infers `fieldType` by regex, counts `hasFallback` if `engine_used==='heuristic'` or any `snippet` contains `AI_ERROR`, surfaces `fallbackReason`; mock fallback uses `MOCK_FIELDS`.
- Generation → `POST /api/jobs/{id}/confirm` → `downloadUrl: /api/jobs/{id}/download?type=filled`; demo sessions (`demo-`/`session-`) use `/samples/sample_template.docx` directly to avoid backend hit.

## Learn More

- Next.js: https://nextjs.org/docs (App Router, `next/font`, `next.config.ts` headers)
- TemplaFill docs: `../docs/3-design/*`, `../docs/7-operations/DECISIONS.md` (ADR-008→015), `../docs/4-coordination/CONTEXT.md` (last updated 2026-09-24), `../../README.md` (deployment table)

## Deploy on Vercel

Connect the repo → set **Root Directory**: `frontend` → env `NEXT_PUBLIC_API_URL=https://<render-backend>/api` → auto-deploy on `main` pushes (headers from `vercel.json`).
