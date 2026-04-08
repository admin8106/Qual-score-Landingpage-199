/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║             QUALSCORE — EMPLOYABILITY DIAGNOSTIC REPORT                     ║
 * ║             Developer Architecture Notes                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  FUTURE INTEGRATIONS (see src/services/ for placeholder implementations):   ║
 * ║                                                                              ║
 * ║  1. PAYMENT GATEWAY                                                          ║
 * ║     → Razorpay (recommended for India)                                       ║
 * ║     → File: src/services/paymentService.ts                                   ║
 * ║     → Replace initiatePayment() mock with Razorpay SDK call                 ║
 * ║                                                                              ║
 * ║  2. LINKEDIN ANALYSIS API                                                    ║
 * ║     → Proxycurl API for profile scraping                                     ║
 * ║     → File: src/services/linkedinService.ts                                  ║
 * ║     → Supabase Edge Function: analyze-linkedin                               ║
 * ║                                                                              ║
 * ║  3. LLM ANALYSIS                                                             ║
 * ║     → OpenAI GPT-4 / Anthropic Claude / Google Gemini                       ║
 * ║     → File: src/services/llmService.ts                                       ║
 * ║     → Supabase Edge Function: analyze-diagnostic                             ║
 * ║     → Merges diagnostic answers + LinkedIn data → narrative insights         ║
 * ║                                                                              ║
 * ║  4. WHATSAPP NOTIFICATIONS                                                   ║
 * ║     → Interakt / AiSensy / Wati (WhatsApp Business API)                     ║
 * ║     → File: src/services/notificationService.ts                              ║
 * ║     → Trigger: After report generated — sends score summary + booking link  ║
 * ║                                                                              ║
 * ║  5. EMAIL                                                                    ║
 * ║     → Resend.com or SendGrid                                                 ║
 * ║     → File: src/services/notificationService.ts                              ║
 * ║     → Triggers: Payment confirmation, Report ready, Follow-up nudge         ║
 * ║                                                                              ║
 * ║  6. CRM INTEGRATION                                                          ║
 * ║     → LeadSquared (India EdTech standard) or HubSpot                        ║
 * ║     → File: src/services/crmService.ts                                       ║
 * ║     → Syncs lead + score + stage data to CRM pipeline                       ║
 * ║                                                                              ║
 * ║  7. CALENDLY / SLOT BOOKING                                                  ║
 * ║     → Calendly embed widget or Cal.com                                       ║
 * ║     → File: src/services/bookingService.ts                                   ║
 * ║     → Pre-fill candidate name/email; receive webhook on booking              ║
 * ║                                                                              ║
 * ║  ROUTE GUARD LOGIC                                                           ║
 * ║  ─────────────────                                                           ║
 * ║  GuardedRoute checks FlowState predicates before rendering a page.          ║
 * ║  On failure it redirects to the correct earlier step (never to a blank       ║
 * ║  page). Each guard also reconciles state from localStorage on refresh.       ║
 * ║                                                                              ║
 * ║  Guard chain (in order):                                                     ║
 * ║    /checkout   → open (no guard)                                             ║
 * ║    /details    → paymentCompleted                                            ║
 * ║    /diagnostic → paymentCompleted + candidateDetails saved                  ║
 * ║    /analysis   → above + diagnosticSubmitted                                 ║
 * ║    /report     → above + (reportData OR analysisStatus=completed)           ║
 * ║    /booking    → candidateCode exists (lenient — report could reload)        ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FlowProvider, useFlow } from './context/FlowContext';
import { ROUTES } from './constants/routes';
import LandingPage from './pages/LandingPage';
import CheckoutPage from './pages/CheckoutPage';
import CandidateFormPage from './pages/CandidateFormPage';
import DiagnosticPage from './pages/DiagnosticPage';
import AnalysisPage from './pages/AnalysisPage';
import ReportPage from './pages/ReportPage';
import BookingPage from './pages/BookingPage';
import AdminPage from './pages/AdminPage';
import AdminLoginPage from './pages/AdminLoginPage';
import FunnelAnalyticsPage from './pages/FunnelAnalyticsPage';
import OpsPage from './pages/OpsPage';
import LaunchChecklistPage from './pages/LaunchChecklistPage';
import IntegrationControlCenterPage from './pages/IntegrationControlCenterPage';
import FeatureFlagsPage from './pages/FeatureFlagsPage';
import IntegrationHealthPage from './pages/IntegrationHealthPage';
import WebhookManagerPage from './pages/WebhookManagerPage';
import DevEventLog from './components/dev/DevEventLog';
import OpsStatusPanel from './components/dev/OpsStatusPanel';
import FlowErrorBoundary from './components/common/FlowErrorBoundary';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';

// ─── Route guard ──────────────────────────────────────────────────────────────
//
// GuardedRoute renders children when `requires` returns true.
// Otherwise it redirects to the nearest correct step.
//
// Recovery: FlowState is hydrated from localStorage in FlowProvider, so after
// a hard refresh the guard has access to the persisted state immediately.
//
// Note: if a user is on /report after refresh and state.reportData is null but
// state.candidateCode is set, ReportPage's own fetch-on-mount will reload the
// report from the backend — we allow entry as long as candidateCode exists.

function GuardedRoute({
  children,
  requires,
  redirectTo = ROUTES.LANDING,
}: {
  children: React.ReactNode;
  requires: (state: ReturnType<typeof useFlow>['state']) => boolean;
  redirectTo?: string;
}) {
  const { state } = useFlow();
  if (!requires(state)) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}

function AdminGuardedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080C18] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to={ROUTES.ADMIN_LOGIN} replace />;
  return <>{children}</>;
}

// ─── Route definitions ────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path={ROUTES.LANDING}  element={<LandingPage />} />
      <Route path={ROUTES.CHECKOUT} element={<CheckoutPage />} />

      {/* ── Step 2: Profile form — requires completed payment ── */}
      <Route
        path={ROUTES.DETAILS}
        element={
          <GuardedRoute
            requires={(s) => s.paymentCompleted}
            redirectTo={ROUTES.CHECKOUT}
          >
            <CandidateFormPage />
          </GuardedRoute>
        }
      />

      {/* ── Step 3: Diagnostic — requires payment + saved profile ── */}
      <Route
        path={ROUTES.DIAGNOSTIC}
        element={
          <GuardedRoute
            requires={(s) => s.paymentCompleted && !!s.candidateDetails && !!s.candidateCode}
            redirectTo={ROUTES.DETAILS}
          >
            <DiagnosticPage />
          </GuardedRoute>
        }
      />

      {/* ── Step 4: Analysis — requires diagnostic submitted ── */}
      <Route
        path={ROUTES.ANALYSIS}
        element={
          <GuardedRoute
            requires={(s) =>
              s.paymentCompleted &&
              !!s.candidateCode &&
              (s.diagnosticSubmitted || s.answers.length > 0)
            }
            redirectTo={ROUTES.DIAGNOSTIC}
          >
            <AnalysisPage />
          </GuardedRoute>
        }
      />

      {/* ── Step 5: Report — requires candidateCode (report reloaded from backend on mount) ── */}
      <Route
        path={ROUTES.REPORT}
        element={
          <GuardedRoute
            requires={(s) =>
              !!s.candidateCode &&
              (
                (!!s.reportData && !!s.evaluation) ||
                s.analysisStatus === 'completed' ||
                s.diagnosticSubmitted
              )
            }
            redirectTo={ROUTES.ANALYSIS}
          >
            <ReportPage />
          </GuardedRoute>
        }
      />

      {/* ── Step 6: Booking — requires candidateCode (lenient so report link still works after refresh) ── */}
      <Route
        path={ROUTES.BOOKING}
        element={
          <GuardedRoute
            requires={(s) => !!s.candidateCode}
            redirectTo={ROUTES.REPORT}
          >
            <BookingPage />
          </GuardedRoute>
        }
      />

      {/* ── Admin auth ── */}
      <Route path={ROUTES.ADMIN_LOGIN} element={<AdminLoginPage />} />

      {/* ── Admin dashboard — redirects to login if not authenticated ── */}
      <Route path={ROUTES.ADMIN}           element={<AdminGuardedRoute><AdminPage /></AdminGuardedRoute>} />
      <Route path={ROUTES.ADMIN_ANALYTICS} element={<AdminGuardedRoute><FunnelAnalyticsPage /></AdminGuardedRoute>} />
      <Route path={ROUTES.ADMIN_OPS}       element={<AdminGuardedRoute><OpsPage /></AdminGuardedRoute>} />
      <Route path={ROUTES.ADMIN_LAUNCH}        element={<AdminGuardedRoute><LaunchChecklistPage /></AdminGuardedRoute>} />
      <Route path={ROUTES.ADMIN_INTEGRATIONS} element={<AdminGuardedRoute><IntegrationControlCenterPage /></AdminGuardedRoute>} />
      <Route path={ROUTES.ADMIN_FLAGS}        element={<AdminGuardedRoute><FeatureFlagsPage /></AdminGuardedRoute>} />
      <Route path={ROUTES.ADMIN_HEALTH}        element={<AdminGuardedRoute><IntegrationHealthPage /></AdminGuardedRoute>} />
      <Route path={ROUTES.ADMIN_WEBHOOKS}      element={<AdminGuardedRoute><WebhookManagerPage /></AdminGuardedRoute>} />

      {/* ── Catch-all ── */}
      <Route path="*" element={<Navigate to={ROUTES.LANDING} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <FlowProvider>
          <FlowErrorBoundary>
            <AppRoutes />
          </FlowErrorBoundary>
          <DevEventLog />
          <OpsStatusPanel />
        </FlowProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
