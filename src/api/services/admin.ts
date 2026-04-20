/**
 * Admin service — wraps /api/v1/admin endpoints.
 *
 * All admin endpoints should eventually be protected via a Bearer JWT token.
 * The `token` parameter is optional now to allow unauthenticated internal access,
 * but the helper is structured so auth can be wired in without changing callers.
 *
 * Error codes to handle on the calling side:
 *   UNAUTHORIZED (401) — prompt admin login
 *   FORBIDDEN    (403) — insufficient role
 *   NOT_FOUND    (404) — lead not found
 */

import { httpClient } from '../httpClient';
import type { ApiResult } from '../types';

export interface AdminLeadsListResponse {
  leads: AdminLeadRecord[];
  total: number;
  hasMore: boolean;
  fetchedAt?: string;
}

// ─── List-level record (GET /api/v1/admin/leads) ─────────────────────────────

export interface AdminLeadRecord {
  candidateReference: string;
  candidateCode?: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  careerStage?: string;
  industry?: string;
  currentRole?: string;
  yearsExperience?: number;
  totalExperienceYears?: string;
  location?: string;
  linkedinUrl?: string;
  paymentStatus?: string;
  paymentReference?: string;
  finalEmployabilityScore?: number;
  bandLabel?: string;
  tags?: string[];
  reportStatus?: string;
  consultationBooked?: boolean;
  consultationStatus?: string;
  consultationDate?: string;
  consultationTime?: string;
  consultationRef?: string;
  leadPriority?: string;
  createdAt: string;
}

// ─── Detail-level record (GET /api/v1/admin/leads/{candidateCode}) ────────────

export interface AdminSectionScores {
  careerDirectionScore?: number;
  jobSearchBehaviorScore?: number;
  opportunityReadinessScore?: number;
  flexibilityConstraintsScore?: number;
  improvementIntentScore?: number;
  linkedinScore?: number;
}

export interface AdminLinkedInAnalysis {
  headlineClarity?: number;
  profileCompleteness?: number;
  proofOfWorkVisibility?: number;
  topStrengths?: string[];
  topConcerns?: string[];
  recommendation?: string;
}

export interface AdminLeadDetail extends AdminLeadRecord {
  sectionScores?: AdminSectionScores;
  linkedInAnalysis?: AdminLinkedInAnalysis;
  reportTagline?: string;
  topGaps?: string[];
  recommendation?: string;
}

// ─── Communication events ─────────────────────────────────────────────────────

export interface CommEvent {
  id: string;
  candidateCode: string;
  eventType: string;
  channelType: string;
  templateCode: string;
  deliveryStatus: 'PENDING' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'RETRIED' | 'SKIPPED';
  errorMessage?: string;
  providerMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Early lead record (GET /api/v1/admin/early-leads) ───────────────────────

export interface EarlyLeadRecord {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  funnelStage: string;
  dropTags: string[];
  paymentStatus: string;
  candidateCode: string | null;
  reportGenerated: boolean;
  complete: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Query params ─────────────────────────────────────────────────────────────

export type LeadFilter = 'all' | 'high' | 'medium' | 'reported' | 'booked';

export interface FetchLeadsParams {
  filter?: LeadFilter;
  limit?: number;
  offset?: number;
  search?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const BASE = '/api/v1/admin';

function authClient(token?: string) {
  return token ? httpClient.withAuth(token) : httpClient;
}

export const adminApi = {
  getLeads(
    params: FetchLeadsParams,
    token?: string,
  ): Promise<ApiResult<AdminLeadsListResponse>> {
    return authClient(token).get<AdminLeadsListResponse>(`${BASE}/leads`, {
      queryParams: {
        filter: params.filter,
        limit:  params.limit,
        offset: params.offset,
        search: params.search,
      },
    });
  },

  getLead(
    candidateCode: string,
    token?: string,
  ): Promise<ApiResult<AdminLeadDetail>> {
    return authClient(token).get<AdminLeadDetail>(
      `${BASE}/leads/${encodeURIComponent(candidateCode)}`,
    );
  },

  getComms(
    candidateCode: string,
    token?: string,
  ): Promise<ApiResult<CommEvent[]>> {
    return authClient(token).get<CommEvent[]>(
      `${BASE}/leads/${encodeURIComponent(candidateCode)}/comms`,
    );
  },

  resend(
    candidateCode: string,
    token?: string,
  ): Promise<ApiResult<string>> {
    return authClient(token).post<string>(
      `${BASE}/leads/${encodeURIComponent(candidateCode)}/resend`,
      {},
    );
  },

  getEarlyLeads(
    params: { limit?: number; incomplete?: boolean },
    token?: string,
  ): Promise<ApiResult<EarlyLeadRecord[]>> {
    return authClient(token).get<EarlyLeadRecord[]>(`${BASE}/early-leads`, {
      queryParams: {
        limit:      params.limit,
        incomplete: params.incomplete,
      },
    });
  },
};
