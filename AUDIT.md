# Interactive Element Audit — AI Product Manager Copilot

**Completion:** 2026-08-09
**Standard:** Every interactive element must work end-to-end, with zero exceptions, except the specific AI features that require Yash's `/analyze` service.

---

## Classification

**CLASS A** — Non-AI feature. Must work completely, end-to-end, with real backend data: navigation, forms, filters, CRUD, drag-and-drop, settings persistence, file uploads, sorting, modals, toggles, logout, etc.

**CLASS B** — Genuinely requires Yash's AI service. Only these qualify:
- Auto-suggest Roadmap
- AI-generated PRD content
- Live AI theme/pain-point extraction (NOT Eklessia's precomputed CSV categories — those are Class A)
- Ask Copilot chat responses

For Class B: the loading/error state must fail fast and honestly — no infinite spinners, no hanging promises, no fake output. No fallback logic or non-AI substitutes.

---

## Page-by-Page Results

### Dashboard (`src/pages/Dashboard.tsx`)

| Element | Class | Before | After | Backend Endpoint |
|---------|-------|--------|-------|-----------------|
| PRDS GENERATED stat | A | Hardcoded `9` with fake "↑ 2 this week" | Real count from saved drafts | GET /api/prd |
| Settings button (top-right) | A | Dead button | Navigates to `/settings` | — |
| Import Data button (top-right) | A | Dead button | Navigates to `/feedback` (the existing upload flow) | — |
| Top Categories "View all" | A | Dead button | Navigates to `/themes` | — |
| Recent PRDs "View all" | A | Dead button | Navigates to `/prd` | — |
| Recent PRDs list | A | Permanently empty array literal | Real list (title, date, section count, status badge), row links to `/prd`, honest empty state | GET /api/prd |

### Settings (`src/pages/Settings.tsx` — new page, new route)

| Element | Class | Before | After | Backend Endpoint |
|---------|-------|--------|-------|-----------------|
| Full name input | A | Did not exist | Editable, saved to account | PATCH /api/user |
| Company input | A | Did not exist | Editable, saved to account | PATCH /api/user |
| Email / Role | A | Did not exist | Read-only display (role is not self-editable by design) | GET /api/auth/me |
| Email notifications toggle | A | Did not exist | Switch persists to account | PATCH /api/user |
| Weekly digest toggle | A | Did not exist | Switch persists to account | PATCH /api/user |
| High-priority alerts toggle | A | Did not exist | Switch persists to account | PATCH /api/user |
| Feedback rows per page | A | Did not exist | Number input (1–100) persists | PATCH /api/user |
| Save changes button | A | Did not exist | PATCH → "Settings saved" toast; **verified it survives a reload** | PATCH /api/user |

**New endpoint:** `PATCH /api/user` — partial update of the authenticated user's own `name`, `company`, and nested `settings`. Rejects `email`/`role` via `.strict()` (privilege-escalation guard). Partial `settings` patches individual keys without blanking the others. Loads via existing `GET /api/auth/me`.

### Roadmap (`src/pages/Roadmap.tsx`)

| Element | Class | Before | After | Backend Endpoint |
|---------|-------|--------|-------|-----------------|
| Add Item form | A | Hardcoded data only | Creates a real card; verified present after reload | POST /api/roadmap |
| Drag card between quarters | A | `cursor-move` styling, **zero drag handlers** | HTML5 drag-and-drop; **verified in DB after reload** | PATCH /api/roadmap/reorder |
| By Lane drop zones | A | Inert dashed divs | Real drop targets; dropped cards persist lane | PATCH /api/roadmap/reorder |
| Status badge click | A | Static badge | Cycles planned→in_progress→done, persists | PATCH /api/roadmap/:id |
| Delete card | A | No handler | DELETE → toast → removed | DELETE /api/roadmap/:id |
| Timeline / By Lane tabs | A | Working | Working (Gantt tab removed — it only said "coming soon") | — |
| Auto-suggest Roadmap | **B** | **Hung on "Processing your request..." forever** (stub toast, nothing in flight) | Calls /api/analyze, detects `mock: true`, shows "AI suggestions unavailable — the analysis service is not yet connected" banner in ~0.1s | POST /api/analyze |

**New endpoints:** `GET/POST /api/roadmap`, `PATCH /api/roadmap/reorder`, `PATCH/DELETE /api/roadmap/:id` — all owner-scoped (queries filter by `req.user.id`). **New model:** `RoadmapItem` (title, quarter, lane, status, effort, team, order).

### PRD Generator (`src/pages/PRD.tsx`)

| Element | Class | Before | After | Backend Endpoint |
|---------|-------|--------|-------|-----------------|
| Create draft | A | Feature list was 3 hardcoded titles; no saving | Form + real feature options from `/api/stats` categories; draft persisted and verified after reload | POST /api/prd |
| Draft list | A | Hardcoded | Real drafts; select to view | GET /api/prd |
| Status (draft/review/ready) | A | Static | Click to change; persists | PATCH /api/prd/:id |
| Copy | A | Fake "Copied to clipboard!" (unconditional) | Real clipboard write via navigator.clipboard, reports actual success/failure | — |
| Export | A | Fake "Export started" toast only | Real `.md` file download; **verified via Playwright download event** | — |
| Delete | A | No handler | DELETE → toast → removed | DELETE /api/prd/:id |
| Generate content with AI | **B** | Showed hardcoded `samplePRD` regardless of selection; stub toast | Calls /api/analyze, shows "AI content generation unavailable" panel in ~0.1s; the draft itself stays saved | POST /api/analyze |

**New endpoints:** `GET/POST /api/prd`, `GET/PATCH/DELETE /api/prd/:id` — owner-scoped. `aiGenerated` is forced to `false` server-side and rejected if sent (a client cannot label invented content as AI output). **New model:** `PRD` (title, feature, status, overview, sections, aiGenerated).

### Theme Extraction (`src/pages/Themes.tsx`)

| Element | Class | Before | After | Backend Endpoint |
|---------|-------|--------|-------|-----------------|
| Merge row action | A | Info toast "Select another theme to merge with" (did nothing) | Merge dialog (multi-select checkboxes, target name) → real bulk recategorization → table refreshes | POST /api/themes/merge |
| Split row action | A | Info toast "Select sub-themes to split" (did nothing) | Split dialog (by source/sentiment/city/visitType) → real bulk recategorization → table refreshes | POST /api/themes/split |
| Re-cluster Themes | **B** | Stub toast "Theme Reclustering initiated… Processing your request…" (nothing happened) | Calls /api/analyze, shows "Re-clustering unavailable" banner in ~0.1s | POST /api/analyze |

**New endpoints (both real data operations, no AI):**
- `POST /api/themes/merge` — `{ from: string[], into: string }` → `updateMany` recategorizes every matching row; rejects merge-into-self; 404 when no rows match.
- `POST /api/themes/split` — `{ theme, by }` where `by ∈ {source, sentiment, city, visitType}` (enum-validated because it becomes a field path) → `distinct` + per-value `updateMany` into `"<theme> — <value>"`; rejects empty/single-value splits.

### Feature Requests (`src/pages/Features.tsx`)

| Element | Class | Before | After | Backend Endpoint |
|---------|-------|--------|-------|-----------------|
| Sortable column headers | A | Inert text headers, fixed RICE sort | Feature/Requests/RICE/Reach/Impact/Effort/Status headers sort asc/desc; verified first-row changes | — |
| Row detail chevron | A | Info toast repeating the title | Detail modal with RICE inputs + "Create PRD draft" | — |
| Generate PRD button | A | Stub toast | Creates a real draft for the top feature and navigates to /prd | POST /api/prd |

### Feedback Ingestion (`src/pages/Feedback.tsx`)

| Element | Class | Before | After | Backend Endpoint |
|---------|-------|--------|-------|-----------------|
| Add Source | A | Stub toast, list never changed | Dialog (source name + first feedback entry) → creates a real seeded row → source appears in the breakdown | POST /api/feedback |
| Select Files / drag-drop upload | A | Working | Working (unchanged) | POST /api/feedback |
| Recent Uploads table | A | Working | Working (unchanged) | — |

### Product Analytics (`src/pages/Analytics.tsx`)

| Element | Class | Before | After | Backend Endpoint |
|---------|-------|--------|-------|-----------------|
| Connect Google Analytics | A | Fake "Redirecting to OAuth..." toast, nothing happened | **Disabled** with tooltip: needs GA4 OAuth client ID/secret (not configured — no credentials in this repo) | None |
| Connect Mixpanel | A | Fake toast | **Disabled** with tooltip: needs Mixpanel credentials | None |
| Connect Amplitude | A | Fake toast | **Disabled** with tooltip: needs Amplitude credentials | None |
| Add Source | A | Stub toast | Navigates to `/feedback` (the real ingestion flow) | — |

### Prioritization (`src/pages/Prioritization.tsx`)

| Element | Class | Before | After | Backend Endpoint |
|---------|-------|--------|-------|-----------------|
| Overview / Breakdown / Comparison tabs | A | Working | Working (verified panel switching) | — |
| View Methodology | A | Info toast restating the framework name | Dialog explaining Reach/Impact/Confidence/Effort with Close | — |

### Ask Copilot (`src/pages/Chat.tsx`)

| Element | Class | Before | After | Backend Endpoint |
|---------|-------|--------|-------|-----------------|
| Send message | **B** | `useChat.ts` keyword-matched ("pain point", "rice"…) and replayed **invented statistics** ("847 mentions, -12% trend") after a fake 800ms delay | Sends to /api/analyze; replies "AI assistant unavailable" in ~0.1s | POST /api/analyze |
| Suggested questions | B | Wired to the fake replies | Wired to the same honest endpoint | POST /api/analyze |
| Quick Actions (Generate PRD / Show RICE / Analyze Trends) | A | Dead buttons | Navigate to `/prd`, `/prioritization`, `/analytics` | — |

**Deleted:** `client/src/hooks/useChat.ts` — the keyword-matcher that fabricated chat answers. `AIChatBox` (presentational, un-routed showcase) left as-is.

### Auth pages (`Login.tsx`, `SignUp.tsx`, `ForgotPassword.tsx`, `ResetPasswordConfirm.tsx`, `TwoFactorAuth.tsx`)

| Element | Class | Before | After | Backend Endpoint |
|---------|-------|--------|-------|-----------------|
| Login form / Demo account | A | Working | Working (unchanged) | POST /api/auth/login, /register |
| Sign Up form | A | Working | Working (unchanged) | POST /api/auth/register |
| Show/hide password toggles | A | Working | Working (unchanged) | — |
| **TwoFactorAuth — Verify Code** | A | **Accepted ANY 6 digits**, forged a `user` object into localStorage, set `twoFactorVerified`, redirected to `/` — an authentication bypass, since no backend issues or validates 2FA codes | Reports "Two-factor authentication is not configured"; no redirect, no forged session | None exists |
| TwoFactorAuth — Resend Code | A | Fake "Verification code sent to your email" after `setTimeout` | Same honest unavailable notice | None exists |
| TwoFactorAuth — "Use backup code instead" | A | Dead button | Removed, replaced by the unavailable notice | — |
| **ForgotPassword — Send Reset Link** | A | `setTimeout(1500)` → "Password reset email sent successfully!" + a full "Check Your Email" screen. No request was ever made; no email exists | Button disabled, states that no email service is connected | None exists |
| **ResetPasswordConfirm — Reset Password** | A | `setTimeout(1500)` → "Password reset successfully!" — the password was **never changed** | Reports that no reset endpoint is connected | None exists |
| Privacy Policy / Terms of Service (footers ×3 pages) | A | `<button>` elements with hover states, no handlers — 6 dead controls | Plain text (no route or legal content exists to link to) | — |
| SignUp — Terms/Privacy links in consent label | A | Two `<button>`s **nested inside a `<label>`** — swallowed the click instead of toggling the agree checkbox | Plain text; the checkbox label now works | — |

---

### Sidebar (`src/components/Sidebar.tsx`)

| Element | Class | Before | After |
|---------|-------|--------|-------|
| Active link highlight | A | `useState('/')` — always highlighted Dashboard after a refresh | Reads `useLocation()`; highlights the actual route |
| Workspace selector ("BarkApp Pro") | A | Button with chevron, did nothing | Static label showing the signed-in workspace (no workspace/billing concept exists in the backend) |
| Pro Plan button | A | Dead button | Static "Pro Plan" label |
| Settings link | A | Did not exist | Navigates to `/settings` |
| Logout | A | Immediate logout | Confirmation dialog → Cancel/Log out |

---

## Summary

Final live-browser run: **45 checks — 38 PASS, 7 HONEST, 0 FAIL.**

- **Class A elements fully wired and verified in a live browser:** 38 PASS
- **Class B + no-credential elements now failing fast and honestly:** 7 HONEST
- **Console errors during the full live run:** 0 (the one 400 logged is the deliberate role-escalation probe being correctly rejected)
- **`tsc` clean** on client and backend; **`vite build`** succeeds.

Every Class A item was verified by actually clicking/typing/dragging it in Chromium (Playwright) against the real running servers — including persistence checks where the browser reloaded the page and re-read the database, and a server-side check that `PATCH /api/user {role:"admin"}` is rejected. No result is claimed from code review alone.

**Out of scope:** `client/src/pages/ComponentShowcase.tsx` contains a `setTimeout` demo, but it is imported by nothing and unreachable in the running app (dead code), so it has no user-facing interactive elements.

---

## Backend changes

**New files**
- `backend/src/models/RoadmapItem.ts`, `backend/src/models/PRD.ts`
- `backend/src/controllers/roadmap.controller.ts`, `prd.controller.ts`, `themes.controller.ts`, `user.controller.ts`
- `backend/src/validators/roadmap.validator.ts`, `prd.validator.ts`, `themes.validator.ts`, `user.validator.ts`
- `backend/src/routes/workspace.routes.ts` (mounted in `app.ts`)

**Modified**
- `User` model: added `company`, `settings` sub-document (emailNotifications, weeklyDigest, highPriorityAlerts, defaultPageSize)
- `auth.controller.ts`: `sanitizeUser` exported and extended (shares the shape with PATCH /api/user)

**New endpoints (all owner-scoped, all Zod-validated)**
| Method | Route | Purpose |
|--------|-------|---------|
| PATCH | /api/user | Profile + settings persistence |
| GET, POST | /api/roadmap | List / create cards |
| PATCH | /api/roadmap/reorder | Persist a drag gesture (whole column) |
| PATCH, DELETE | /api/roadmap/:id | Update / delete a card |
| GET, POST | /api/prd | List / create drafts |
| GET, PATCH, DELETE | /api/prd/:id | Read / update / delete a draft |
| POST | /api/themes/merge | Bulk recategorize themes (real `updateMany`) |
| POST | /api/themes/split | Split a theme by source/sentiment/city/visitType |

---

## Class B — Blocked on Yash's `/analyze` service

Each of these calls `POST /api/analyze`, receives the existing `{ success: true, mock: true, data: … }` fallback, and now reports it within ~0.1s instead of hanging. Nothing fakes or substitutes the AI output.

| Feature | Honest state now shown | Needs from Yash |
|---------|------------------------|-----------------|
| **Auto-suggest Roadmap** (Roadmap page) | "AI suggestions unavailable — the analysis service is not yet connected." banner + warning toast | `/analyze` (or a `/analyze/roadmap` variant) returning suggested quarters/lanes/items |
| **AI-generated PRD content** (PRD page) | "AI content generation unavailable" panel; the saved draft remains usable | `/analyze` (or `/analyze/prd`) returning body sections for a given title/feature |
| **Re-cluster Themes** (Themes page) | "Re-clustering unavailable" banner; current dataset categories remain visible | `/analyze` (or `/analyze/themes`) returning fresh theme groupings |
| **Ask Copilot chat** (Chat page) | "AI assistant unavailable" reply after each question | An LLM-backed chat endpoint (could be `/analyze` with conversation context, or a new `/api/copilot/chat`) |

**Shared integration point:** every button calls the existing `requestAnalysis()` helper in `client/src/lib/interactions.ts`, which posts `{ text }` to `/api/analyze` with an 8s abort timeout and treats `mock: true` (or a non-2xx, or a timeout) as "not available." When Yash's endpoint lands: wire it through `FASTAPI_URL` (already proxied in `backend/src/controllers/analyze.controller.ts`), drop `mock: true`, and each Class B button will light up with real output through the same path.

---

## Notes

- The pre-existing "Invalid value for prop `data-logout`" React warning (one per authenticated page render) was fixed: `App.tsx` no longer passes a function to a DOM attribute.
- The permanent "Processing your request..." state came from `client/src/lib/interactions.ts` `showFeatureToast`, which showed a success toast for handlers that did nothing. The stubs are gone; that file now only contains honest helpers.
- Analytics OAuth connects and password-reset email are Class A *conceptually* but have no credentials/SMTP in this deployment, so they present an honest disabled state instead of a fake success — the same rule as Class B, blocked on configuration rather than on Yash.
