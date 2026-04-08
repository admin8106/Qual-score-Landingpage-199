import { httpClient } from '../httpClient';
import type { ApiResult } from '../types';

export interface BookConsultationRequest {
  candidateReference: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
}

export interface BookConsultationResponse {
  bookingId: string;
  candidateReference: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
  bookingStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationSummary {
  bookingId: string;
  candidateReference: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
  bookingStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationListResponse {
  bookings: ConsultationSummary[];
}

const BASE = '/api/v1/consultations';

export const consultationsApi = {
  book(request: BookConsultationRequest): Promise<ApiResult<BookConsultationResponse>> {
    return httpClient.post<BookConsultationResponse>(BASE, request);
  },

  listForCandidate(candidateCode: string): Promise<ApiResult<ConsultationListResponse>> {
    return httpClient.get<ConsultationListResponse>(`${BASE}/${encodeURIComponent(candidateCode)}`);
  },
};
