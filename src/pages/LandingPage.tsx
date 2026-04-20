import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, ArrowRight, Shield, Zap, BarChart2,
  Linkedin, ChevronDown, Star, Clock, FileText,
  Target, TrendingUp, Users, Award, AlertCircle,
  Briefcase, GraduationCap, RefreshCw, Search, Mail,
} from 'lucide-react';
import { ROUTES } from '../constants/routes';
import { Analytics } from '../services/analyticsService';
import { LeadCapture } from '../services/leadCaptureService';

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => { Analytics.landingPageView(); }, []);

  const go = (source = 'unknown') => {
    Analytics.ctaClicked(source);
    LeadCapture.onCtaClick();
    navigate(ROUTES.CHECKOUT);
  };

  return (
    <div className="bg-white font-sans">
      <SiteHeader onCTA={() => go('header')} />
      <HeroSection onCTA={() => go('hero')} />
      <TrustBar />
      <ProblemSection onCTA={() => go('problem_section')} />
      <WhatYouGetSection onCTA={() => go('what_you_get')} />
      <HowItWorksSection onCTA={() => go('how_it_works')} />
      <WhatWeAnalyzeSection />
      <SampleReportSection onCTA={() => go('sample_report')} />
      <WhoIsItForSection onCTA={() => go('who_is_it_for')} />
      <WhyPaidSection onCTA={() => go('why_paid')} />
      <WhyQualScoreSection />
      <MainCTABlock onCTA={() => go('main_cta')} />
      <FAQSection />
      <SiteFooter />
      <StickyBar onCTA={() => go('sticky_bar')} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Site Header                                                  */
/* ─────────────────────────────────────────────────────────── */
function SiteHeader({ onCTA }: { onCTA: () => void }) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E5E7EB]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1A73E8] rounded-lg flex items-center justify-center">
            <Award className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-bold text-[#1F2937] tracking-tight">
            Qual<span className="text-[#1A73E8]">Score</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-[#6B7280]">
            <Shield className="w-3.5 h-3.5 text-[#34A853]" />
            Secure &amp; Confidential
          </span>
          <button
            onClick={onCTA}
            className="bg-[#1A73E8] hover:bg-[#1557B0] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            ₹199 — Get Report
          </button>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Hero                                                         */
/* ─────────────────────────────────────────────────────────── */
function HeroSection({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="bg-white pt-14 pb-16 sm:pt-20 sm:pb-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#E8F1FD] text-[#1A73E8] px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 tracking-wide uppercase">
              <Zap className="w-3.5 h-3.5" />
              AI-Powered Employability Analysis
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-[#1F2937] leading-[1.15] tracking-tight mb-5">
              Not getting interview calls?{' '}
              <span className="text-[#1A73E8]">There's always a reason.</span>
            </h1>
            <p className="text-lg text-[#4B5563] leading-relaxed mb-3">
              Get your AI-powered Employability Diagnostic Report for ₹199 and understand exactly what's blocking your shortlisting.
            </p>
            <p className="text-sm text-[#6B7280] leading-relaxed mb-8">
              We analyze your LinkedIn profile, career direction, job-search behavior, and readiness signals to generate a personalized employability report.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5">
              <button
                onClick={onCTA}
                className="inline-flex items-center gap-2.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
              >
                Analyze My Profile
                <ArrowRight className="w-5 h-5" />
              </button>
              <div>
                <div className="text-2xl font-bold text-[#1F2937]">₹199</div>
                <div className="text-xs text-[#9CA3AF]">One-time · No subscription</div>
              </div>
            </div>

            <p className="text-sm text-[#9CA3AF] flex items-center gap-1.5 mb-5">
              <Clock className="w-3.5 h-3.5" />
              Takes only 10–12 minutes
            </p>

            <div className="flex flex-wrap gap-2.5 text-xs text-[#6B7280]">
              {['LinkedIn-based analysis', 'Personalized report', 'Actionable next steps'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 bg-[#F2F6FB] px-3 py-1.5 rounded-full border border-[#E5E7EB]">
                  <CheckCircle className="w-3.5 h-3.5 text-[#34A853]" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <ReportMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportMockup() {
  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute inset-0 translate-x-3 translate-y-3 bg-[#1A73E8]/10 rounded-3xl" />
      <div className="relative bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-[#F2F6FB]">
          <div>
            <div className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-0.5">Employability Diagnostic</div>
            <div className="text-sm font-bold text-[#1F2937]">Your Report is Ready</div>
          </div>
          <div className="w-9 h-9 bg-[#E8F1FD] rounded-xl flex items-center justify-center">
            <Award className="w-5 h-5 text-[#1A73E8]" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#E5E7EB" strokeWidth="7" />
              <circle cx="40" cy="40" r="32" fill="none" stroke="#F9AB00" strokeWidth="7"
                strokeDasharray="201.06" strokeDashoffset="81" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-[#1F2937]">58</span>
              <span className="text-[9px] text-[#9CA3AF] font-medium">/100</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[#9CA3AF] mb-1">Overall Score</div>
            <div className="inline-flex items-center gap-1 bg-[#FEF7E0] text-[#F9AB00] text-xs font-semibold px-2 py-0.5 rounded-full border border-[#F9AB00]/30 mb-1.5">
              Moderate Risk
            </div>
            <p className="text-xs text-[#6B7280] leading-snug">3 shortlisting blockers detected</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl px-3 py-2.5">
          <Linkedin className="w-4 h-4 text-[#0A66C2] shrink-0" />
          <span className="text-xs text-[#1F2937] font-medium truncate">linkedin.com/in/yourprofile</span>
          <CheckCircle className="w-3.5 h-3.5 text-[#34A853] ml-auto shrink-0" />
        </div>

        <div className="space-y-2.5">
          {[
            { label: 'Profile Visibility', pct: 55, color: 'bg-[#F9AB00]' },
            { label: 'Application Strategy', pct: 40, color: 'bg-red-400' },
            { label: 'Network Strength', pct: 70, color: 'bg-[#1A73E8]' },
            { label: 'Content & Portfolio', pct: 50, color: 'bg-orange-400' },
          ].map(({ label, pct, color }) => (
            <div key={label}>
              <div className="flex justify-between text-[10px] text-[#6B7280] mb-1">
                <span>{label}</span>
                <span className="font-semibold">{pct}%</span>
              </div>
              <div className="h-1.5 bg-[#F2F6FB] rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#E8F1FD] rounded-xl px-3 py-2.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-[#1A73E8]">View Full Report</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#1A73E8]" />
        </div>
      </div>
      <div className="absolute -top-3 -right-3 bg-[#34A853] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md">
        Sample Preview
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Trust Bar                                                    */
/* ─────────────────────────────────────────────────────────── */
function TrustBar() {
  return (
    <div className="bg-[#F2F6FB] border-y border-[#E5E7EB] py-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-sm text-[#6B7280]">
          {[
            { icon: Users, text: '2,400+ candidates diagnosed' },
            { icon: Shield, text: '100% confidential' },
            { icon: Clock, text: 'Report in under 12 minutes' },
            { icon: Star, text: '4.8 / 5 satisfaction' },
            { icon: Briefcase, text: 'IT · Finance · Marketing · Operations' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-[#1A73E8] shrink-0" />
              <span className="font-medium">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Problem Section                                              */
/* ─────────────────────────────────────────────────────────── */
function ProblemSection({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1F2937] mb-4 leading-tight">
            Most candidates don't know why they're being ignored.
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <div className="space-y-4 text-[#4B5563] leading-relaxed mb-8">
              <p>You may be applying regularly.<br />You may have experience.<br />You may even have a decent LinkedIn profile.</p>
              <p className="font-semibold text-[#1F2937]">But recruiters still don't respond.</p>
              <p>Because the problem is often not obvious:</p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                { label: 'Weak positioning', desc: "Your profile doesn't clearly communicate the role you want" },
                { label: 'Unclear role identity', desc: "Recruiters can't tell what you do or what you want in 6 seconds" },
                { label: 'Low proof of work', desc: 'No evidence of impact, outcomes, or tangible results' },
                { label: 'Poor profile visibility', desc: 'LinkedIn ranking issues mean the right people never find you' },
                { label: 'Low readiness despite good experience', desc: 'Experience exists but interview-readiness is not coming through' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start gap-3 p-3.5 rounded-xl border border-[#FEF7E0] bg-[#FFFBF0]">
                  <AlertCircle className="w-4 h-4 text-[#F9AB00] mt-0.5 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-[#1F2937]">{label}</span>
                    <p className="text-xs text-[#6B7280] mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-[#4B5563] leading-relaxed border-l-2 border-[#1A73E8] pl-4">
              This diagnostic helps you identify the real blockers before you waste more time applying blindly.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6">
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-red-500 mb-1">73%</div>
                <p className="text-sm text-[#6B7280]">of applications never reach a human recruiter</p>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Rejected at ATS screening', pct: 73, color: 'bg-red-400' },
                  { label: 'Ignored at profile review stage', pct: 54, color: 'bg-[#F9AB00]' },
                  { label: 'Never reach interview stage', pct: 61, color: 'bg-orange-400' },
                  { label: 'Get no feedback whatsoever', pct: 82, color: 'bg-[#9CA3AF]' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs text-[#6B7280] mb-1">
                      <span>{item.label}</span>
                      <span className="font-semibold text-[#1F2937]">{item.pct}%</span>
                    </div>
                    <div className="h-2 bg-[#F2F6FB] rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#9CA3AF] mt-5 text-center">Based on industry hiring research, 2024</p>
            </div>

            <div className="bg-[#1A73E8] rounded-2xl p-5 text-white">
              <p className="text-sm leading-relaxed opacity-90 mb-4">
                "Most candidates who come to us have no idea what's holding them back. Once they see the diagnostic, the answer is almost always obvious — they just didn't have the lens."
              </p>
              <div className="text-xs font-semibold opacity-70">— QualScore Career Advisory Team</div>
            </div>

            <button
              onClick={onCTA}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold text-base px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
            >
              Find Out What's Holding Me Back
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* What You Get                                                 */
/* ─────────────────────────────────────────────────────────── */
function WhatYouGetSection({ onCTA }: { onCTA: () => void }) {
  const items = [
    {
      icon: BarChart2,
      color: 'bg-[#E8F1FD] text-[#1A73E8]',
      title: 'Employability Score',
      desc: 'A precise numerical score (0–100) across 5 weighted dimensions of your job-search fitness. Not a vague "good" or "needs work" — an actual number with breakdown.',
    },
    {
      icon: Linkedin,
      color: 'bg-[#E6F4EA] text-[#34A853]',
      title: 'LinkedIn Diagnostic Insight',
      desc: "A specific assessment of how your LinkedIn profile reads to recruiters — what signals it sends, what it's missing, and where it falls short.",
    },
    {
      icon: Target,
      color: 'bg-[#FEF7E0] text-[#F9AB00]',
      title: 'Shortlisting Blockers',
      desc: 'The top 2–3 specific reasons why you may not be getting shortlisted, derived from your profile inputs and diagnostic responses.',
    },
    {
      icon: TrendingUp,
      color: 'bg-[#FFF0E6] text-orange-500',
      title: 'Readiness & Behavior Analysis',
      desc: 'An evaluation of your job-search behavior — how you apply, how consistent you are, and how your habits compare to candidates who do get shortlisted.',
    },
    {
      icon: FileText,
      color: 'bg-[#F2F6FB] text-[#6B7280]',
      title: 'Next-Step Recommendation',
      desc: 'A clear, prioritized action plan — not generic tips, but specific things to fix based on your actual score breakdown and gap profile.',
    },
  ];

  return (
    <section className="bg-[#F2F6FB] py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white border border-[#E5E7EB] text-[#6B7280] px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4">
            What you get for ₹199
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1F2937] mb-4">
            Everything inside your report
          </h2>
          <p className="text-[#6B7280] max-w-2xl mx-auto leading-relaxed">
            Not a generic quiz result. A structured employability diagnosis — built the way a senior recruiter would evaluate you.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {items.map(({ icon: Icon, color, title, desc }, i) => (
            <div
              key={title}
              className={`bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow ${i === 4 ? 'sm:col-span-2 lg:col-span-1' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#1F2937] mb-1.5">{title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-[#6B7280] mb-6 italic">
            A small investment now can save months of confusion later.
          </p>
          <button
            onClick={onCTA}
            className="inline-flex items-center gap-2.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
          >
            Get My Report for ₹199
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* How It Works                                                 */
/* ─────────────────────────────────────────────────────────── */
function HowItWorksSection({ onCTA }: { onCTA: () => void }) {
  const steps = [
    {
      num: '01',
      icon: Shield,
      title: 'Pay ₹199',
      desc: 'One-time access. No subscriptions. No hidden fees. Secure payment via Razorpay.',
    },
    {
      num: '02',
      icon: Linkedin,
      title: 'Submit your LinkedIn profile',
      desc: 'Paste your LinkedIn URL and fill in a few basic details about your background.',
    },
    {
      num: '03',
      icon: FileText,
      title: 'Answer focused questions',
      desc: '15 structured diagnostic questions about your job-search behavior and career context. Under 8 minutes.',
    },
    {
      num: '04',
      icon: BarChart2,
      title: 'Get your diagnostic report',
      desc: 'Instant score, category breakdown, top blockers, and your personalized next-step recommendation.',
    },
  ];

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1F2937] mb-4">How It Works</h2>
          <p className="text-[#6B7280]">Four steps. Under 12 minutes. Instant personalized report.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map(({ num, icon: Icon, title, desc }) => (
            <div key={num} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#1A73E8] text-white rounded-2xl flex items-center justify-center font-bold text-sm shrink-0">
                  {num}
                </div>
                <div className="h-px flex-1 bg-[#E5E7EB] lg:hidden" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-4 h-4 text-[#1A73E8]" />
                  <h3 className="font-bold text-[#1F2937]">{title}</h3>
                </div>
                <p className="text-sm text-[#6B7280] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={onCTA}
            className="inline-flex items-center gap-2 bg-[#34A853] hover:bg-[#2D8F47] text-white font-bold text-base px-7 py-3.5 rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
          >
            Start Now — ₹199
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-[#9CA3AF] mt-2.5 flex items-center justify-center gap-1.5">
            <Clock className="w-3 h-3" />
            Takes only 10–12 minutes
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* What We Analyze                                              */
/* ─────────────────────────────────────────────────────────── */
function WhatWeAnalyzeSection() {
  const linkedin = [
    'Headline strength and keyword clarity',
    'Positioning clarity and role identity',
    'Experience section and impact framing',
    'Profile credibility signals',
    'Visible proof of work and outcomes',
    'Career progression and growth consistency',
  ];
  const signals = [
    'Career clarity and role focus',
    'Job-search seriousness and application volume',
    'Interview readiness and preparation habits',
    'Flexibility and constraints profile',
    'Self-awareness and gap recognition',
    'Improvement intent and action-taking behavior',
  ];

  return (
    <section className="bg-[#F2F6FB] py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1F2937] mb-4">What We Analyze</h2>
          <p className="text-[#6B7280] max-w-xl mx-auto">
            Two complementary lenses — your online presence and your actual job-search behavior.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-[#E8F1FD] rounded-xl flex items-center justify-center">
                <Linkedin className="w-5 h-5 text-[#0A66C2]" />
              </div>
              <div>
                <h3 className="font-bold text-[#1F2937]">LinkedIn Profile Analysis</h3>
                <p className="text-xs text-[#9CA3AF]">How recruiters see you online</p>
              </div>
            </div>
            <ul className="space-y-2.5">
              {linkedin.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-[#4B5563]">
                  <CheckCircle className="w-4 h-4 text-[#34A853] mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-[#E6F4EA] rounded-xl flex items-center justify-center">
                <Search className="w-5 h-5 text-[#34A853]" />
              </div>
              <div>
                <h3 className="font-bold text-[#1F2937]">Employability Signals Beyond LinkedIn</h3>
                <p className="text-xs text-[#9CA3AF]">Behavioral and readiness indicators</p>
              </div>
            </div>
            <ul className="space-y-2.5">
              {signals.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-[#4B5563]">
                  <CheckCircle className="w-4 h-4 text-[#34A853] mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center">
          <div className="inline-block bg-[#1F2937] text-white text-sm font-medium px-5 py-2.5 rounded-xl">
            This is not a generic quiz. It is a structured employability diagnosis.
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Sample Report Preview                                        */
/* ─────────────────────────────────────────────────────────── */
function SampleReportSection({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#FEF7E0] border border-[#F9AB00]/30 text-[#F9AB00] px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4 uppercase tracking-wide">
            Sample Report Preview
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1F2937] mb-4">This is what you'll receive</h2>
          <p className="text-[#6B7280] max-w-xl mx-auto">
            A structured, readable report with real numbers — not a vague summary.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white border-2 border-[#E5E7EB] rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-[#1F2937] px-7 py-5 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-400 mb-0.5 font-medium uppercase tracking-wider">QualScore</div>
                <div className="text-white font-bold text-lg">Employability Diagnostic Report</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-400 mb-0.5">Sample Candidate</div>
                <div className="text-white text-sm font-medium">Priya S., Bengaluru</div>
              </div>
            </div>

            <div className="px-7 py-6 border-b border-[#F2F6FB] bg-[#F8FAFE] flex items-center gap-6">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 96 96" className="w-24 h-24 -rotate-90">
                  <circle cx="48" cy="48" r="38" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                  <circle cx="48" cy="48" r="38" fill="none" stroke="#F9AB00" strokeWidth="8"
                    strokeDasharray="238.76" strokeDashoffset="95.5" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-[#1F2937]">58</span>
                  <span className="text-[10px] text-[#9CA3AF] font-medium">/100</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-[#9CA3AF] mb-1">Employability Score</div>
                <div className="inline-flex items-center gap-1.5 bg-[#FEF7E0] text-[#F9AB00] text-sm font-bold px-3 py-1 rounded-xl border border-[#F9AB00]/30 mb-2">
                  Moderate Risk
                </div>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Profile gaps detected. Shortlisting probability is below average for target roles.
                </p>
              </div>
            </div>

            <div className="px-7 py-5 border-b border-[#F2F6FB] space-y-3">
              <div className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">Score Breakdown</div>
              {[
                { label: 'Profile Visibility', pct: 55, color: 'bg-[#F9AB00]', tag: 'Needs Work', tagColor: 'bg-[#FEF7E0] text-[#F9AB00]' },
                { label: 'Application Strategy', pct: 40, color: 'bg-red-400', tag: 'Critical', tagColor: 'bg-red-50 text-red-500' },
                { label: 'Experience & Credentials', pct: 75, color: 'bg-[#34A853]', tag: 'Strong', tagColor: 'bg-[#E6F4EA] text-[#34A853]' },
                { label: 'Network Strength', pct: 45, color: 'bg-orange-400', tag: 'Weak', tagColor: 'bg-orange-50 text-orange-500' },
                { label: 'Content & Portfolio', pct: 50, color: 'bg-[#1A73E8]', tag: 'Moderate', tagColor: 'bg-[#F2F6FB] text-[#6B7280]' },
              ].map(({ label, pct, color, tag, tagColor }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-32 shrink-0 text-xs text-[#4B5563]">{label}</div>
                  <div className="flex-1 h-2 bg-[#F2F6FB] rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-10 text-right text-xs font-semibold text-[#1F2937]">{pct}%</div>
                  <div className="w-20 text-right">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${tagColor}`}>{tag}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-7 py-5 border-b border-[#F2F6FB]">
              <div className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">Top 3 Shortlisting Blockers</div>
              <div className="space-y-2.5">
                {[
                  'Application strategy is too broad — targeting too many roles without tailoring',
                  'LinkedIn headline lacks keyword alignment with target roles',
                  'Network is too small to generate referral-based visibility',
                ].map((issue, i) => (
                  <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                    <span className="text-xs font-bold text-red-400 mt-0.5">0{i + 1}</span>
                    <p className="text-xs text-[#4B5563] leading-relaxed">{issue}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-7 py-5">
              <div className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">Priority Recommendation</div>
              <div className="bg-[#E8F1FD] rounded-xl p-4 border border-[#1A73E8]/20">
                <div className="text-sm font-bold text-[#1A73E8] mb-1.5">Rewrite your LinkedIn headline and About section</div>
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  This single change improves your search discoverability and first-impression clarity — directly increasing shortlisting probability.
                </p>
              </div>
            </div>

            <div className="bg-[#1A73E8] px-7 py-4 flex items-center justify-between">
              <p className="text-sm text-white font-medium">Your report will be personalized to your inputs</p>
              <button
                onClick={onCTA}
                className="bg-white text-[#1A73E8] text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#F2F6FB] transition-colors shrink-0"
              >
                Get Mine →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Who Is It For                                                */
/* ─────────────────────────────────────────────────────────── */
function WhoIsItForSection({ onCTA }: { onCTA: () => void }) {
  const groups = [
    {
      icon: GraduationCap,
      color: 'bg-[#E8F1FD] text-[#1A73E8]',
      title: 'Freshers',
      tag: 'No experience needed',
      desc: "Just graduated and not getting callbacks? Understand what your profile is missing before you apply to 100 more jobs.",
    },
    {
      icon: Briefcase,
      color: 'bg-[#E6F4EA] text-[#34A853]',
      title: 'Early Professionals',
      tag: '1–4 years exp',
      desc: "1–4 years in, but stuck in the same role or not hearing back from better companies? Find out what's limiting you.",
    },
    {
      icon: TrendingUp,
      color: 'bg-[#FEF7E0] text-[#F9AB00]',
      title: 'Working Professionals',
      tag: '5+ years exp',
      desc: "Currently employed but not getting response to your applications? Your passive search may have hidden blockers.",
    },
    {
      icon: RefreshCw,
      color: 'bg-[#FFF0E6] text-orange-500',
      title: 'Career Switchers',
      tag: 'Domain change',
      desc: "Trying to change industries or roles? This diagnostic reveals if your profile is communicating the transition clearly.",
    },
  ];

  return (
    <section className="bg-[#F2F6FB] py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1F2937] mb-4">Who This Is For</h2>
          <p className="text-[#6B7280] max-w-xl mx-auto">
            If you're actively applying for jobs and not seeing the results you expect, this diagnostic is for you.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {groups.map(({ icon: Icon, color, title, tag, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-[#E5E7EB] p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-bold text-[#1F2937]">{title}</h3>
                  <span className="text-[10px] bg-[#F2F6FB] text-[#6B7280] px-2 py-0.5 rounded-full border border-[#E5E7EB] font-medium">{tag}</span>
                </div>
                <p className="text-sm text-[#6B7280] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-bold text-[#1F2937] mb-1">If you're applying and not hearing back — this is for you.</h3>
            <p className="text-sm text-[#6B7280]">Industry, role, or experience level doesn't matter. The diagnostic adapts to your context.</p>
          </div>
          <button
            onClick={onCTA}
            className="shrink-0 inline-flex items-center gap-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold px-6 py-3 rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
          >
            Analyze My Profile
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Why Paid                                                     */
/* ─────────────────────────────────────────────────────────── */
function WhyPaidSection({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#FEF7E0] border border-[#F9AB00]/30 text-[#F9AB00] px-3.5 py-1.5 rounded-full text-xs font-semibold mb-5 uppercase tracking-wide">
              Transparency
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1F2937] mb-5 leading-tight">
              Why this is a paid diagnostic
            </h2>
            <div className="space-y-4 text-[#4B5563] leading-relaxed mb-6">
              <p>Free tools usually give generic feedback.<br />This report is designed to be more serious and more useful.</p>
              <p>Your payment helps ensure:</p>
            </div>
            <div className="space-y-3 mb-6">
              {[
                { title: 'More intentional participation', desc: 'A small payment filters for candidates who are genuinely serious about getting clarity.' },
                { title: 'Better quality inputs', desc: 'Paid users complete the diagnostic more carefully, which leads to a more accurate result.' },
                { title: 'A more meaningful diagnostic experience', desc: "This isn't a lead magnet or a teaser. It's the actual product." },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFE]">
                  <CheckCircle className="w-5 h-5 text-[#34A853] mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-sm text-[#1F2937] mb-0.5">{title}</div>
                    <p className="text-xs text-[#6B7280]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-[#4B5563] leading-relaxed border-l-2 border-[#F9AB00] pl-4">
              This is for candidates who genuinely want clarity, not casual browsing.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-[#F2F6FB] rounded-2xl p-6 border border-[#E5E7EB]">
              <h3 className="font-bold text-[#1F2937] mb-4 text-sm">Free tools vs. QualScore Diagnostic</h3>
              <div className="space-y-3">
                {[
                  { feature: 'LinkedIn profile assessment', free: false, qs: true },
                  { feature: 'Personalized numerical score', free: false, qs: true },
                  { feature: 'Specific shortlisting blockers', free: false, qs: true },
                  { feature: 'Behavior and readiness analysis', free: false, qs: true },
                  { feature: 'Actionable recommendations', free: 'Generic', qs: 'Specific' },
                  { feature: 'Career stage adaptation', free: false, qs: true },
                ].map(({ feature, free, qs }) => (
                  <div key={feature} className="flex items-center gap-3 text-sm py-1 border-b border-[#E5E7EB] last:border-0">
                    <span className="flex-1 text-[#4B5563] text-xs">{feature}</span>
                    <span className={`w-16 text-center text-xs font-medium ${free === false ? 'text-[#D1D5DB]' : 'text-[#F9AB00]'}`}>
                      {free === false ? '—' : free}
                    </span>
                    <span className="w-20 text-center text-xs font-semibold text-[#34A853]">
                      {qs === true ? '✓' : qs}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
                <span className="flex-1" />
                <span className="w-16 text-center">Free tools</span>
                <span className="w-20 text-center text-[#1A73E8]">QualScore</span>
              </div>
            </div>

            <div className="bg-[#1A73E8] rounded-2xl p-6 text-white">
              <div className="text-4xl font-bold mb-1">₹199</div>
              <div className="text-blue-200 text-sm mb-3">One-time. No subscription. Instant report.</div>
              <p className="text-blue-100 text-sm leading-relaxed">Less than a coffee. More clarity than 3 months of applying without feedback.</p>
              <button
                onClick={onCTA}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-white text-[#1A73E8] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#F2F6FB] transition-colors"
              >
                Get My Report
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Why QualScore                                                */
/* ─────────────────────────────────────────────────────────── */
function WhyQualScoreSection() {
  return (
    <section className="bg-[#F2F6FB] py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 grid grid-cols-2 gap-4">
            {[
              { num: '2,400+', label: 'Candidates diagnosed' },
              { num: '4.8/5', label: 'Average satisfaction score' },
              { num: '68%', label: 'Improved shortlisting within 30 days' },
              { num: '<12 min', label: 'Average completion time' },
            ].map(({ num, label }) => (
              <div key={label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 text-center">
                <div className="text-2xl font-bold text-[#1A73E8] mb-1">{num}</div>
                <div className="text-xs text-[#6B7280] leading-snug">{label}</div>
              </div>
            ))}

            <div className="col-span-2 bg-white rounded-2xl border border-[#E5E7EB] p-5">
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-[#F9AB00] text-[#F9AB00]" />
                ))}
              </div>
              <p className="text-sm text-[#4B5563] italic mb-3 leading-relaxed">
                "I had applied to 60+ companies in 2 months. After the QualScore diagnostic, I understood my problem in 12 minutes. Got my first interview within 10 days of fixing it."
              </p>
              <div className="text-sm font-semibold text-[#1F2937]">Karthik V.</div>
              <div className="text-xs text-[#9CA3AF]">Software Engineer, 3 years exp, Hyderabad</div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 bg-[#E8F1FD] text-[#1A73E8] px-3.5 py-1.5 rounded-full text-xs font-semibold mb-5 uppercase tracking-wide">
              Why QualScore
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1F2937] mb-5 leading-tight">
              Built around one belief: candidates deserve clarity.
            </h2>
            <div className="space-y-4 text-[#4B5563] leading-relaxed mb-6">
              <p>
                QualScore is built around one simple belief:<br />
                <span className="font-semibold text-[#1F2937]">Candidates deserve more clarity than just rejection or silence.</span>
              </p>
              <p>Instead of leaving your employability to assumptions, we help you understand:</p>
            </div>
            <div className="space-y-3 mb-6">
              {[
                'How your profile is being perceived by recruiters',
                'What may be limiting your shortlisting rate',
                'What you need to improve — and in what order',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-[#4B5563]">
                  <CheckCircle className="w-4 h-4 text-[#34A853] mt-0.5 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <div className="bg-[#1F2937] rounded-2xl px-5 py-4 text-white text-sm font-semibold">
              Diagnosis first. Improvement next.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Main CTA Block                                               */
/* ─────────────────────────────────────────────────────────── */
function MainCTABlock({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="bg-[#1A73E8] py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 text-blue-100 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 uppercase tracking-wide">
          Take the first step
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
          Get your Employability Diagnostic Report today
        </h2>
        <div className="text-5xl font-bold text-white mb-2">₹199</div>
        <p className="text-blue-200 text-sm mb-8">One-time payment · No subscription · Instant report</p>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10">
          {[
            'LinkedIn-based analysis',
            'Personalized employability score',
            'Top blockers affecting shortlisting',
            'Actionable next-step recommendation',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-blue-100">
              <CheckCircle className="w-4 h-4 text-[#34A853] shrink-0" />
              {item}
            </div>
          ))}
        </div>

        <button
          onClick={onCTA}
          className="inline-flex items-center gap-2.5 bg-white hover:bg-[#F2F6FB] text-[#1A73E8] font-bold text-xl px-10 py-5 rounded-2xl shadow-2xl hover:shadow-xl active:scale-[0.98] transition-all mb-3"
        >
          Get My Report Instantly
          <ArrowRight className="w-6 h-6" />
        </button>

        <p className="text-blue-200 text-sm flex items-center justify-center gap-1.5 mb-6">
          <Clock className="w-4 h-4" />
          Complete it in under 12 minutes
        </p>

        <p className="text-blue-300/70 text-xs max-w-md mx-auto leading-relaxed">
          This is a diagnostic report, not a job placement or guarantee service.
          QualScore does not promise interviews, shortlists, or employment outcomes.
          Your data is confidential and never shared with recruiters or employers.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* FAQ                                                          */
/* ─────────────────────────────────────────────────────────── */
const FAQ_ITEMS = [
  {
    q: 'Is this a technical assessment?',
    a: 'No. This is not a coding test, aptitude test, or any form of technical evaluation. It is a structured employability diagnosis that looks at how your profile is positioned, how you apply for jobs, and what signals your LinkedIn sends to recruiters.',
  },
  {
    q: 'What do I need to submit?',
    a: 'You need your LinkedIn profile URL, basic details (name, email, phone, current role, target role), and your answers to 15 focused diagnostic questions. No resume upload is required.',
  },
  {
    q: 'How long does it take?',
    a: 'Most candidates complete the full diagnostic in 10–12 minutes. The questions are structured and focused — there are no open-ended essay responses required.',
  },
  {
    q: 'What will I get after submission?',
    a: 'You will receive an Employability Diagnostic Report with your overall score (0–100), a breakdown across 5 dimensions, your top shortlisting blockers, a LinkedIn insight section, and a prioritized recommendation for your next step.',
  },
  {
    q: 'Is this the same as the full QualScore evaluation?',
    a: 'No. This is an entry-level diagnostic product priced at ₹199. The full QualScore evaluation is a deeper, advisor-led process. This diagnostic is the recommended starting point — it helps you understand your gaps before you invest in deeper support.',
  },
  {
    q: 'Who is this useful for?',
    a: 'This is useful for any candidate who is actively applying for jobs and not getting the expected response rate — whether you are a fresher, early-career professional, experienced candidate, or someone making a career switch.',
  },
  {
    q: 'Will this guarantee me a job?',
    a: 'No. This is a diagnostic, not a placement service. We do not promise interviews, shortlists, or job offers. We give you a clear understanding of what may be limiting your shortlisting rate — what you do with that insight is entirely up to you.',
  },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1F2937] mb-4">Frequently Asked Questions</h2>
          <p className="text-[#6B7280]">Everything you need to know before you start.</p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="border border-[#E5E7EB] rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#F8FAFE] transition-colors"
              >
                <span className="font-semibold text-[#1F2937] text-sm sm:text-base pr-4">{item.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-[#9CA3AF] shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm text-[#4B5563] leading-relaxed border-t border-[#F2F6FB] pt-4 bg-[#F8FAFE]">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Footer                                                       */
/* ─────────────────────────────────────────────────────────── */
function SiteFooter() {
  return (
    <footer className="bg-[#1F2937] border-t border-white/[0.06] pb-20 sm:pb-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
        <div className="grid sm:grid-cols-3 gap-10 mb-10 pb-10 border-b border-white/[0.06]">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-[#1A73E8] rounded-lg flex items-center justify-center">
                <Award className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold text-white">
                Qual<span className="text-[#1A73E8]">Score</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              AI-powered employability diagnostics for job seekers across India.
              We help candidates understand why they're not getting shortlisted — and what to fix.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Shield className="w-3.5 h-3.5 text-[#34A853]" />
              <span>100% confidential · Your data is never shared</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Product</p>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>Employability Diagnostic Report</li>
              <li>LinkedIn Profile Analysis</li>
              <li>Shortlisting Blocker Identification</li>
              <li>Career Readiness Score</li>
              <li className="pt-1">
                <span className="inline-flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-slate-400">
                  ₹199 · One-time · No subscription
                </span>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Support</p>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="mailto:support@qualscore.in"
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-[#1A73E8] shrink-0" />
                  support@qualscore.in
                </a>
              </li>
              <li className="text-slate-500 text-xs leading-relaxed pt-1">
                Payment issues resolved within 2 hours.
                Data queries answered within 24 hours.
              </li>
            </ul>

            <div className="mt-6 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-400 mb-1">Important disclaimer</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                QualScore is a diagnostic tool, not a placement or job guarantee service.
                We do not promise interviews, shortlists, or employment outcomes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <span>© {new Date().getFullYear()} QualScore. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span>Employability Diagnostic · India</span>
            <span>Used across IT, Finance, Marketing & more</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Sticky Bottom CTA Bar                                        */
/* ─────────────────────────────────────────────────────────── */
function StickyBar({ onCTA }: { onCTA: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={[
        'fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E5E7EB] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] transition-transform duration-300',
        visible ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 min-w-0">
          <span className="text-sm font-bold text-[#1F2937] leading-tight truncate">
            Employability Diagnostic Report
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#1A73E8]">₹199</span>
            <span className="text-xs text-[#9CA3AF] hidden sm:inline">· Instant report · One-time</span>
          </div>
        </div>
        <button
          onClick={onCTA}
          className="shrink-0 inline-flex items-center gap-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
        >
          Analyze My Profile
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
