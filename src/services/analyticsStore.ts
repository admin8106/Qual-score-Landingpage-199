import { supabase } from '../lib/supabase';
import { AnalyticsEventName } from './analyticsService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FunnelMetrics {
  landing_page_view: number;
  cta_clicked: number;
  payment_started: number;
  payment_success: number;
  payment_failed: number;
  profile_form_completed: number;
  diagnostic_started: number;
  diagnostic_completed: number;
  analysis_started: number;
  report_generated: number;
  report_viewed: number;
  consultation_cta_clicked: number;
  consultation_booked: number;
}

export interface ConversionRates {
  cta_click_rate: number;
  payment_start_rate: number;
  payment_success_rate: number;
  diagnostic_completion_rate: number;
  report_to_consultation_cta_rate: number;
  consultation_booking_rate: number;
  overall_landing_to_booking_rate: number;
}

export interface DailyDataPoint {
  date: string;
  landing_page_view: number;
  payment_success: number;
  report_generated: number;
  consultation_booked: number;
}

export interface AnalyticsDashboardData {
  metrics: FunnelMetrics;
  rates: ConversionRates;
  daily: DailyDataPoint[];
  topCtaSources: { source: string; count: number }[];
  fetchedAt: string;
}

// ─── Empty defaults ───────────────────────────────────────────────────────────

export const EMPTY_METRICS: FunnelMetrics = {
  landing_page_view: 0,
  cta_clicked: 0,
  payment_started: 0,
  payment_success: 0,
  payment_failed: 0,
  profile_form_completed: 0,
  diagnostic_started: 0,
  diagnostic_completed: 0,
  analysis_started: 0,
  report_generated: 0,
  report_viewed: 0,
  consultation_cta_clicked: 0,
  consultation_booked: 0,
};

// ─── Conversion rate calculator ───────────────────────────────────────────────

export function computeConversionRates(m: FunnelMetrics): ConversionRates {
  const pct = (num: number, denom: number): number =>
    denom === 0 ? 0 : Math.round((num / denom) * 1000) / 10;

  return {
    cta_click_rate: pct(m.cta_clicked, m.landing_page_view),
    payment_start_rate: pct(m.payment_started, m.cta_clicked),
    payment_success_rate: pct(m.payment_success, m.payment_started),
    diagnostic_completion_rate: pct(m.diagnostic_completed, m.diagnostic_started),
    report_to_consultation_cta_rate: pct(m.consultation_cta_clicked, m.report_viewed),
    consultation_booking_rate: pct(m.consultation_booked, m.consultation_cta_clicked),
    overall_landing_to_booking_rate: pct(m.consultation_booked, m.landing_page_view),
  };
}

// ─── Benchmark targets ────────────────────────────────────────────────────────

export interface Benchmark {
  label: string;
  target: number;
  unit: string;
  note: string;
}

export const BENCHMARKS: Record<string, Benchmark> = {
  cta_click_rate: {
    label: 'CTA Click Rate Target',
    target: 8,
    unit: '%',
    note: 'Industry avg for paid diagnostic landing pages: 5–10%',
  },
  payment_success_rate: {
    label: 'Payment Success Rate Target',
    target: 75,
    unit: '%',
    note: 'Razorpay typical success rate for ₹199 products: 70–85%',
  },
  diagnostic_completion_rate: {
    label: 'Diagnostic Completion Rate Target',
    target: 85,
    unit: '%',
    note: 'Post-payment users are highly motivated; 85%+ is achievable',
  },
  consultation_booking_rate: {
    label: 'Consultation Booking Rate Target',
    target: 20,
    unit: '%',
    note: 'Target: 1 in 5 report viewers books a consultation',
  },
  landing_page_conversion: {
    label: 'Landing → Payment Conversion Target',
    target: 3,
    unit: '%',
    note: 'Overall landing-to-purchase target for paid products in India EdTech',
  },
};

// ─── Fetch from Supabase ──────────────────────────────────────────────────────

export async function fetchAnalyticsDashboard(
  daysBack: number = 30
): Promise<AnalyticsDashboardData> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  const sinceIso = since.toISOString();

  const { data, error } = await supabase
    .from('analytics_events')
    .select('event_name, properties, occurred_at')
    .gte('occurred_at', sinceIso)
    .order('occurred_at', { ascending: false });

  if (error || !data) {
    return {
      metrics: { ...EMPTY_METRICS },
      rates: computeConversionRates(EMPTY_METRICS),
      daily: [],
      topCtaSources: [],
      fetchedAt: new Date().toISOString(),
    };
  }

  // ── Count per event name ──
  const metrics = { ...EMPTY_METRICS };
  const sourceMap: Record<string, number> = {};
  const dailyMap: Record<string, DailyDataPoint> = {};

  for (const row of data) {
    const name = row.event_name as AnalyticsEventName;
    if (name in metrics) {
      metrics[name]++;
    }

    if (name === 'cta_clicked' && row.properties?.source) {
      const src = String(row.properties.source);
      sourceMap[src] = (sourceMap[src] ?? 0) + 1;
    }

    const day = row.occurred_at.slice(0, 10);
    if (!dailyMap[day]) {
      dailyMap[day] = {
        date: day,
        landing_page_view: 0,
        payment_success: 0,
        report_generated: 0,
        consultation_booked: 0,
      };
    }
    if (name === 'landing_page_view') dailyMap[day].landing_page_view++;
    if (name === 'payment_success') dailyMap[day].payment_success++;
    if (name === 'report_generated') dailyMap[day].report_generated++;
    if (name === 'consultation_booked') dailyMap[day].consultation_booked++;
  }

  const daily = Object.values(dailyMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  const topCtaSources = Object.entries(sourceMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    metrics,
    rates: computeConversionRates(metrics),
    daily,
    topCtaSources,
    fetchedAt: new Date().toISOString(),
  };
}
