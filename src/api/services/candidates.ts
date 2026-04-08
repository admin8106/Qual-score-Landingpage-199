/**
 * Candidate profile service — wraps /api/v1/candidates endpoints.
 *
 * A candidate profile is created after payment is verified.
 * The paymentReference from paymentsApi.verify() is required.
 * The candidateCode returned (e.g. "CND-X7Y8Z9") is the primary identifier
 * for all subsequent API calls in the flow.
 *
 * Frontend CareerStage ('fresher' | 'working_professional') is mapped to
 * the backend enum ('FRESHER' | 'WORKING_PROFESSIONAL') before sending.
 */

import { httpClient } from '../httpClient';
import type { ApiResult } from '../types';
import type { CareerStage as FrontendCareerStage } from '../../types';
import { opFlags } from '../../utils/opFlags';

export type BackendCareerStage = 'FRESHER' | 'WORKING_PROFESSIONAL';

export interface CreateCandidateProfileRequest {
  paymentReference: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  currentRole?: string;
  careerStage: BackendCareerStage;
  industry?: string;
  location?: string;
  linkedinUrl?: string;
  totalExperienceYears?: string;
  targetRole?: string;
  linkedinHeadline?: string;
  linkedinAboutText?: string;
  linkedinExperienceText?: string;
  linkedinAchievements?: string;
}

export interface CreateCandidateProfileResponse {
  candidateCode: string;
  fullName: string;
  email: string;
  careerStage: BackendCareerStage;
}

export type { BackendCareerStage as CareerStage };

const CAREER_STAGE_MAP: Record<FrontendCareerStage, BackendCareerStage> = {
  fresher:              'FRESHER',
  working_professional: 'WORKING_PROFESSIONAL',
};

export function toBackendCareerStage(stage: FrontendCareerStage): BackendCareerStage {
  return CAREER_STAGE_MAP[stage];
}

const BASE = '/api/v1/candidates';

export const candidatesApi = {
  async createProfile(request: CreateCandidateProfileRequest): Promise<ApiResult<CreateCandidateProfileResponse>> {
    if (opFlags.mockPayment) {
      const { mockCreateCandidateProfile } = await import('./mockBackend');
      return mockCreateCandidateProfile(request);
    }
    return httpClient.post<CreateCandidateProfileResponse>(`${BASE}/profile`, request);
  },
};
