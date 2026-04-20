import { supabase } from '../lib/supabase';

const ANON_KEY = 'qs_anon_id';
const EARLY_LEAD_ID_KEY = 'qs_early_lead_id';

function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return `anon_${Date.now()}`;
  }
}

function getEarlyLeadId(): string | null {
  try {
    return localStorage.getItem(EARLY_LEAD_ID_KEY);
  } catch {
    return null;
  }
}

function setEarlyLeadId(id: string): void {
  try {
    localStorage.setItem(EARLY_LEAD_ID_KEY, id);
  } catch {
    // ignore
  }
}

function getUtmParams(): Record<string, string | null> {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source:   params.get('utm_source'),
      utm_medium:   params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content:  params.get('utm_content'),
    };
  } catch {
    return {};
  }
}

export type FunnelStage =
  | 'CTA_CLICKED'
  | 'PAYMENT_STARTED'
  | 'PAYMENT_DONE'
  | 'PROFILE_FILLED'
  | 'DIAGNOSTIC_DONE'
  | 'REPORT_DONE';

export type DropTag = 'payment_drop' | 'profile_drop' | 'diagnostic_drop';

const STAGE_ORDER: FunnelStage[] = [
  'CTA_CLICKED',
  'PAYMENT_STARTED',
  'PAYMENT_DONE',
  'PROFILE_FILLED',
  'DIAGNOSTIC_DONE',
  'REPORT_DONE',
];

function isLaterStage(current: FunnelStage, existing: FunnelStage): boolean {
  return STAGE_ORDER.indexOf(current) > STAGE_ORDER.indexOf(existing);
}

interface CapturePayload {
  stage: FunnelStage;
  email?: string;
  name?: string;
  phone?: string;
  paymentRef?: string;
  paymentStatus?: 'none' | 'pending' | 'completed' | 'failed';
  candidateCode?: string;
  reportGenerated?: boolean;
  dropTags?: DropTag[];
}

async function captureOrUpdate(payload: CapturePayload): Promise<void> {
  const anonId = getAnonId();
  const utms   = getUtmParams();

  try {
    const existingId = getEarlyLeadId();

    if (existingId) {
      const { data: existing } = await supabase
        .from('early_leads')
        .select('id, funnel_stage, drop_tags')
        .eq('id', existingId)
        .maybeSingle();

      if (existing) {
        const shouldUpdateStage = isLaterStage(payload.stage, existing.funnel_stage as FunnelStage);
        const existingTags: string[] = existing.drop_tags ?? [];
        const newTags = payload.dropTags ?? [];
        const mergedTags = Array.from(new Set([...existingTags, ...newTags]));

        const updatePayload: Record<string, unknown> = {
          drop_tags: mergedTags,
        };

        if (shouldUpdateStage) updatePayload['funnel_stage'] = payload.stage;
        if (payload.email)         updatePayload['email']          = payload.email;
        if (payload.name)          updatePayload['name']           = payload.name;
        if (payload.phone)         updatePayload['phone']          = payload.phone;
        if (payload.paymentRef)    updatePayload['payment_ref']    = payload.paymentRef;
        if (payload.paymentStatus) updatePayload['payment_status'] = payload.paymentStatus;
        if (payload.candidateCode) updatePayload['candidate_code'] = payload.candidateCode;
        if (payload.reportGenerated != null) {
          updatePayload['report_generated'] = payload.reportGenerated;
          updatePayload['is_complete']       = payload.reportGenerated;
        }

        await supabase
          .from('early_leads')
          .update(updatePayload)
          .eq('id', existingId);
        return;
      }
    }

    const insertPayload: Record<string, unknown> = {
      anon_id:         anonId,
      funnel_stage:    payload.stage,
      first_touch_page: window.location.pathname || '/',
      referrer:        document.referrer || null,
      drop_tags:       payload.dropTags ?? [],
      payment_status:  payload.paymentStatus ?? 'none',
      ...(utms.utm_source   && { utm_source:   utms.utm_source }),
      ...(utms.utm_medium   && { utm_medium:   utms.utm_medium }),
      ...(utms.utm_campaign && { utm_campaign: utms.utm_campaign }),
      ...(utms.utm_content  && { utm_content:  utms.utm_content }),
      ...(payload.email         && { email:          payload.email }),
      ...(payload.name          && { name:           payload.name }),
      ...(payload.phone         && { phone:          payload.phone }),
      ...(payload.paymentRef    && { payment_ref:    payload.paymentRef }),
      ...(payload.candidateCode && { candidate_code: payload.candidateCode }),
      ...(payload.reportGenerated != null && {
        report_generated: payload.reportGenerated,
        is_complete:      payload.reportGenerated,
      }),
    };

    const { data: upserted } = await supabase
      .from('early_leads')
      .upsert(insertPayload, { onConflict: 'anon_id', ignoreDuplicates: false })
      .select('id')
      .maybeSingle();

    if (upserted?.id) {
      setEarlyLeadId(upserted.id);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[LeadCapture] Failed silently:', err);
    }
  }
}

export const LeadCapture = {
  onCtaClick(): void {
    captureOrUpdate({ stage: 'CTA_CLICKED' });
  },

  onEmailEntered(email: string, name?: string): void {
    if (!email || !email.includes('@')) return;
    captureOrUpdate({ stage: 'CTA_CLICKED', email, name });
  },

  onPaymentStarted(email?: string, name?: string): void {
    captureOrUpdate({
      stage: 'PAYMENT_STARTED',
      paymentStatus: 'pending',
      email,
      name,
    });
  },

  onPaymentDone(paymentRef: string, email?: string, name?: string): void {
    captureOrUpdate({
      stage: 'PAYMENT_DONE',
      paymentRef,
      paymentStatus: 'completed',
      email,
      name,
    });
  },

  onPaymentFailed(paymentRef?: string): void {
    captureOrUpdate({
      stage: 'PAYMENT_STARTED',
      paymentRef,
      paymentStatus: 'failed',
      dropTags: ['payment_drop'],
    });
  },

  onProfileFilled(candidateCode: string, email?: string, name?: string, phone?: string): void {
    captureOrUpdate({
      stage: 'PROFILE_FILLED',
      candidateCode,
      email,
      name,
      phone,
    });
  },

  onDiagnosticDone(candidateCode: string): void {
    captureOrUpdate({ stage: 'DIAGNOSTIC_DONE', candidateCode });
  },

  onReportDone(candidateCode: string): void {
    captureOrUpdate({ stage: 'REPORT_DONE', candidateCode, reportGenerated: true });
  },

  markPaymentDrop(): void {
    captureOrUpdate({ stage: 'PAYMENT_STARTED', dropTags: ['payment_drop'] });
  },

  markProfileDrop(): void {
    captureOrUpdate({ stage: 'PAYMENT_DONE', dropTags: ['profile_drop'] });
  },

  markDiagnosticDrop(): void {
    captureOrUpdate({ stage: 'PROFILE_FILLED', dropTags: ['diagnostic_drop'] });
  },
};
