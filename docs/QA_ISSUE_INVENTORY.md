# QualScore — QA Issue Inventory

Produced by smoke-test pass on 2026-03-29. All confirmed defects, their impact, and fix status.

---

## Fixed Issues

| # | File | Issue | Impact | Fix Applied |
|---|------|--------|--------|-------------|
| 1 | `src/context/AdminAuthContext.tsx` | `adminAuthApi.me()` called with `.then()` but no `.catch()`. On network error, `isLoading` stays `true` permanently, leaving the entire admin UI in a spinner with no way to recover. | **Critical** — Admin panel unusable after any network hiccup at auth check time. | Added `.catch()` that calls `logout()` and `setIsLoading(false)`. |
| 2 | `src/components/admin/LeadDetailDrawer.tsx` | Two `adminApi` calls (`getLead`, `getComms`) chained with `.then()` but no `.catch()`. On network failure, `fetching` and `commsLoading` never clear, trapping the drawer in a loading state. | **Critical** — Drawer permanently stuck loading; admin cannot view lead detail on any network error. | Added `.catch()` to both calls with appropriate loading-state recovery. |
| 3 | `src/utils/reportInsights.ts` | `evaluation.linkedInAnalysis.profileAnalysis` accessed without null guard at 3 locations in `buildTopGaps`, `buildLinkedInInsight`, and `buildRecruiterView`. `linkedInAnalysis` can be null when API analysis hasn't run. | **High** — Runtime crash during report generation if LinkedIn analysis did not complete. | Added `?.` optional chaining and `?? null` fallbacks; added early-return and conditional defaults for all 3 functions. |
| 4 | `src/api/httpClient.ts` | Abort/timeout detection used `(e as DOMException).message === 'timeout'` — fragile because `.message` may not equal the abort reason string on all browsers. | **Medium** — Timeouts misclassified as generic errors; incorrect error messaging shown to user. | Changed to `controller.signal.reason === 'timeout'` (standard API) with fallback `|| (!externalSignal && signal.aborted)`. |
| 5 | `src/pages/CandidateFormPage.tsx` | `handlePhoneBlur` called `LeadCapture.onEmailEntered()` instead of a phone/profile-aware method. Phone blur never actually captured the phone number in the early lead record. Also: `onBlur` prop was missing from the phone input element entirely. | **Medium** — Phone number not captured in early lead funnel data; lead enrichment incomplete. | Changed to `LeadCapture.onProfileFilled()` with correct arguments; added `onBlur={handlePhoneBlur}` to the phone `InputBase`. |
| 6 | `src/pages/CheckoutPage.tsx` | `completePayment(paymentRef, gatewayOrderId, gatewayOrderId)` — `gatewayOrderId` passed as both the 2nd arg (`paymentOrderId`) and 3rd arg (`gatewayOrderId`). The correct 2nd arg is `gatewayPaymentId` (the Razorpay payment ID), which is available in the enclosing `finishPayment` scope. | **High** — `paymentOrderId` in FlowContext persisted with the order ID instead of the payment ID; incorrect data written to session state and potentially to downstream services. | Changed 2nd argument to `gatewayPaymentId`. |
| 7 | `src/pages/AnalysisPage.tsx` | Empty `linkedinUrl` (`''`) passed directly to `triggerAnalysis` without a client-side guard. Also the same gap existed in `handleRetry`. Backend would reject with `INVALID_LINKEDIN_URL` and redirect, but this wasted a round-trip and could confuse state. | **Low** — Unnecessary API call; minor UX degradation on edge case (profile somehow missing LinkedIn URL). | Added `if (!linkedinUrl.trim())` guard before `runAnalysis` in both the mount effect and `handleRetry`; calls `redirectForLinkedInFix` immediately instead of making the network call. |
| 8 | `src/api/services/communicationProviders.ts` | `getTestLogs` (both WhatsApp and Email implementations) used `const { data }` without destructuring `error`, so Supabase errors were silently swallowed and an empty array was returned instead. | **Medium** — Test log fetch failures invisible to the UI; admins see empty test history when a DB error occurs, with no error surface. | Added `error` to destructuring; added `if (error) throw error` before returning data. |

---

---

## Fixed Issues — Integration Control Center Hardening Pass (2026-03-29)

| # | File | Issue | Impact | Fix Applied |
|---|------|--------|--------|-------------|
| 21 | `src/api/services/aiProviders.ts` | `runConnectionTest` used `clearTimeout(tid)` only on the success path. If the `fetch()` call rejected, the timeout handle was never cleared — a resource leak that would fire `controller.abort()` after the function returned. | **High** — Timer leak on every failed connection test. | Wrapped `fetch()` in an inner try/finally so `clearTimeout(tid)` always executes. |
| 22 | `src/components/integrations/LLMProviderDrawer.tsx` | `loadTestLogs()` had no try/catch/finally. Any Supabase query failure left the Test Logs tab permanently stuck on an infinite spinner. | **High** — UX trap: Test Logs tab permanently unusable after any query failure. | Added try/catch/finally; `logsError` state shown with Retry button; `setLogsLoading(false)` now always executes. |
| 23 | `src/components/integrations/LLMProviderDrawer.tsx` | `handleRunTest()` had `catch { /* ignore */ }`. Test request failures were completely silent — button re-enabled, no feedback. | **High** — Silent failure: admin cannot tell if the test request failed entirely. | Added catch that sets `testError` state; failure switches to test-logs tab and shows a red error card. |
| 24 | `src/components/integrations/LLMProviderDrawer.tsx` | `handleSetPrimary()` and `handleDelete()` both had `catch { /* ignore */ }`. Failures were completely silent with no user feedback. | **Medium** — Silent failures on critical provider routing operations. | Added catch blocks for both; errors displayed in a red `actionError` banner below the drawer header. |
| 25 | `src/pages/WebhookManagerPage.tsx` | `loadEndpoints()` silently swallowed errors. Failed loads showed an empty endpoint list with no distinction from "no endpoints configured". | **Medium** — Silent failure on endpoint load; no Retry path. | Added `endpointsError` state; red error card with Retry button shown on failure. |
| 26 | `src/pages/WebhookManagerPage.tsx` | `loadLogs()` called `setLogs([])` in the catch block, erasing previously loaded log data on any failed filter/refresh. No error message shown. | **Medium** — Data erasure on query failure; valid logs silently wiped from view. | Removed `setLogs([])` from catch; added `logsError` state with red error card and Retry button. |
| 27 | `src/pages/FeatureFlagsPage.tsx` | Resolution activity table accessed `s.total`, `s.fallback`, `s.noProvider` without null guards; malformed API entries would render `undefined` in table cells. | **Low** — Undefined rendered in table cells for any malformed category stat entry. | Added `?? 0` safe defaults via `s?.total ?? 0` etc. for all three fields. |

---

## Fixed Issues — Admin Ops Hardening Pass (2026-03-29)

| # | File | Issue | Impact | Fix Applied |
|---|------|--------|--------|-------------|
| 14 | `src/pages/OpsPage.tsx` | `NoteModal.save()` called Supabase insert and silently re-enabled the button on failure with no error shown. Admin had no way to know the note was not saved. | **High** — Silent data loss; admin note appears submitted but is discarded on any DB error. | Added `saveError` state; displays a red error message inside the modal when insert fails; error clears when user starts typing again. |
| 15 | `src/pages/OpsPage.tsx` | `markAction()` called Supabase insert and silently returned on failure (`if (insertError || !data) return`). The button visually stayed in "un-marked" state (correct) but no feedback was given to the admin. | **Medium** — Silent failure; admin clicks button multiple times unaware that the action did not persist. | Added `actionError` state; displays a dismissable red error banner above the lead grid when an insert fails. |
| 16 | `src/pages/OpsPage.tsx` | `loadOpsActions()` used `const { data }` without destructuring `error`. On any Supabase query failure, `data` is null, the function silently returned, and all leads appeared as "un-contacted / un-booked" even if actions existed. | **Medium** — Contact/booked status lost on query failure; ops panel shows incorrect state. | Added `error` to destructuring; added `if (queryError || !data) return` early exit (graceful degradation). |
| 17 | `src/pages/AdminPage.tsx` | `IncompleteLeadsPanel` had no `error` state. If the Supabase query failed (permissions, network), the panel stayed in empty state indefinitely with no error or retry option. | **Medium** — Admin BD recovery queue invisible on any query failure. | Added `loadError` state and error display with a Retry button. |
| 18 | `src/pages/AdminPage.tsx` | `FunnelSummaryBar` used `if (!data) return` which silently left `counts` as `null` forever on query failure. The `—` values showed permanently. Also no unmount cancellation on the async effect. | **Low** — Funnel stats never populate on Supabase error; admin has no signal that data is missing vs zero. | Added `error` destructuring; on failure, sets counts to `{ landing: 0, paid: 0, reports: 0, booked: 0 }` (shows 0 vs —); added `cancelled` flag and cleanup. |
| 19 | `src/components/admin/LeadDetailDrawer.tsx` | `handleResend` made two sequential awaits (resend + refresh comms) without a mounted check between them. If the drawer was closed after the resend completed but before the `getComms` call resolved, `setComms` fired on an unmounted component. | **Low** — React "state update on unmounted component" warning; potential stale state if drawer re-opened quickly. | Added `mountedRef` with `useEffect` lifecycle tracking; added `if (!mountedRef.current) return` after each await in `handleResend`. |
| 20 | `src/pages/AdminPage.tsx` | `load()` called `adminApi.getLeads(..., token ?? undefined)` without checking `token` first. If token was null, the API call proceeded unauthenticated, wasting a round-trip before reactively handling the 401. | **Low** — Wasted network round-trip on unauthenticated state; minor delay in redirect. | Added proactive `if (!token) { logout(); navigate(...) }` guard before the API call; passes `token` directly (non-nullable). Same fix applied to `OpsPage.load()`. |

---

## Fixed Issues — Regression Pass (2026-03-29)

| # | File | Issue | Impact | Fix Applied |
|---|------|--------|--------|-------------|
| 9 | `src/pages/DiagnosticPage.tsx` | `mapped!` non-null assertion on line 444 was safe in normal flow but could crash if `loadState` ever transitioned to `'loaded'` while `mapped` was still null (e.g., React batching edge case on retry after error). | **High** — Runtime crash: "Cannot destructure property 'questions' of null". | Added explicit `if (!mapped)` guard that renders a skeleton rather than crashing; removed the `!` assertion. |
| 10 | `src/pages/DiagnosticPage.tsx` | Dot-navigation at the bottom of the question card used `i <= answeredCount` to determine clickability. Since `answeredCount` is a count, not a max-answered-index, users could jump to unanswered questions (e.g., if Q1 and Q3 are answered, index 2 would be accessible even though Q2 is unanswered). | **Medium** — Users could skip to unvisited questions, creating confusing state and bypassing the question ordering. | Changed condition to `isAnswered || i === currentIndex + 1 || i <= currentIndex` — allows going to already-answered questions and the next immediate question, but not skipping ahead past gaps. |
| 11 | `src/pages/BookingPage.tsx` | `handleSubmit` had `if (!candidate || !candidateCode) return` with a bare return — no error message shown and `submittingRef.current` / `phase` were left in an inconsistent state. Phase had already been set to `'submitting'` in some code paths, leaving the button permanently disabled. | **High** — Booking form permanently stuck in submitting state if session data is missing; no recovery path. | Changed silent return to show `setSubmitError('Session data is missing. Please go back and reload the page.')` and return cleanly (the guard now runs before `submittingRef.current = true` and `setPhase('submitting')`, so state is never corrupted). |
| 12 | `src/pages/BookingPage.tsx` | Prefetch effect called `result.data.bookings` without null-guarding `result.data` first. If `listForCandidate` returned `result.ok = true` but `data` was null or `data.bookings` was undefined/null, the access would throw. Also, API errors in prefetch were silently swallowed — phase always advanced to `'form'` regardless of success/failure. | **Medium** — Runtime crash on malformed API response; API failures invisible to user. | Added `Array.isArray(result.data?.bookings)` guard before accessing `.length`. Prefetch API errors are now silently tolerated (phase advances to `'form'` as before) but the null-crash is eliminated. |
| 13 | `src/context/FlowContext.tsx` | `COMPLETE_PAYMENT` reducer updated `paymentRef` and `paymentOrderId` but silently discarded the `gatewayOrderId` field that was passed in the action payload. The `paymentGatewayOrderId` field in state would retain whatever was set by `SET_PAYMENT_INITIATED`, not the final verified value passed in `completePayment()`. | **Low** — Subtle data inconsistency: finalized gateway order ID not persisted in flow state; could affect analytics or reconciliation downstream. | Reducer now applies `paymentGatewayOrderId: action.payload.gatewayOrderId ?? state.paymentGatewayOrderId` so the final verified order ID is persisted while falling back to the existing value if not provided. |

---

## Resolved Integration-Pass Observations (No Code Fix Needed)

| # | Area | Observation | Conclusion |
|---|------|-------------|------------|
| A | `src/api/services/providerResolution.ts` | `r[map.primaryCol ?? '']` in `getCategorySnapshot` looked risky — empty string key access. | Safe: `fallbackCol` is only null when `primaryCol` is null (analytics category), and the branch using `primaryCol` is only reached when the column exists. No bug. |
| B | `src/utils/opFlags.ts` | `opFlags.mockPayment` used in `diagnostic.ts`, `reports.ts`, `candidates.ts` (not just payment). | Intentional design: one flag mocks the full flow for development; documented in opFlags comments. No bug. |
| C | `src/pages/OpsPage.tsx` / `src/pages/AdminPage.tsx` | Concern about `.items` access on `result.data` after an API call. | Both pages guard with `if (!result.ok) return` before any `.data` access. No bug. |
| D | `src/utils/scoringEngine.ts` | `fetchLinkedInProfileAnalysis` always returns a full `LinkedInAnalysis` object. | Safe at source. The vulnerability was only in downstream consumers (`reportInsights.ts`) that take `FinalScore` from external storage — fixed in issue #3. |

---

## Open / Deferred

None at this time. All confirmed defects from the smoke-test pass are fixed.

---

*Next review: before next staging deploy or after significant changes to FlowContext, payment flow, or report generation.*
