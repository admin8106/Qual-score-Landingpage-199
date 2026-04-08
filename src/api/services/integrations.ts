import { httpClient } from '../httpClient';
import type { ApiResult } from '../types';

const BASE = '/api/v1/admin/integrations';

export interface IntegrationProviderResponse {
  id: string;
  category: string;
  providerCode: string;
  providerName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TESTING' | 'FAILED';
  isPrimary: boolean;
  isFallback: boolean;
  environmentMode: 'SANDBOX' | 'LIVE';
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  credentials: CredentialSummary[];
  settings: SettingSummary[];
  latestTest: TestLogSummary | null;
}

export interface CredentialSummary {
  id: string;
  keyName: string;
  maskedValue: string;
  isSecret: boolean;
  updatedAt: string;
}

export interface SettingSummary {
  id: string;
  settingKey: string;
  settingValue: string;
  updatedAt: string;
}

export interface TestLogSummary {
  id: string;
  testType: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILURE' | 'TIMEOUT' | 'SKIPPED';
  responseSummary: string;
  createdAt: string;
}

export interface IntegrationProviderListResponse {
  total: number;
  byCategory: Record<string, IntegrationProviderResponse[]>;
}

export interface IntegrationTestLogResponse {
  id: string;
  providerId: string;
  testType: string;
  status: string;
  responseSummary: string;
  testedByAdminId: string | null;
  createdAt: string;
}

export interface IntegrationAuditLogResponse {
  id: string;
  integrationProviderId: string | null;
  actionType: string;
  actorAdminId: string | null;
  actorEmail: string;
  detailsJson: Record<string, unknown>;
  createdAt: string;
}

export interface CreateProviderRequest {
  category: string;
  providerCode: string;
  providerName: string;
  environmentMode?: string;
  displayOrder?: number;
}

export interface UpdateProviderRequest {
  providerName?: string;
  environmentMode?: string;
  displayOrder?: number;
}

export interface UpsertCredentialsRequest {
  credentials: Array<{ keyName: string; value: string; isSecret?: boolean }>;
}

export interface UpsertSettingsRequest {
  settings: Array<{ settingKey: string; settingValue: string }>;
}

export const integrationApi = {
  listAll(token: string): Promise<ApiResult<IntegrationProviderListResponse>> {
    return httpClient.withAuth(token).get<IntegrationProviderListResponse>(BASE);
  },

  listByCategory(token: string, category: string): Promise<ApiResult<IntegrationProviderResponse[]>> {
    return httpClient.withAuth(token).get<IntegrationProviderResponse[]>(`${BASE}/category/${category}`);
  },

  getById(token: string, id: string): Promise<ApiResult<IntegrationProviderResponse>> {
    return httpClient.withAuth(token).get<IntegrationProviderResponse>(`${BASE}/${id}`);
  },

  create(token: string, body: CreateProviderRequest): Promise<ApiResult<IntegrationProviderResponse>> {
    return httpClient.withAuth(token).post<IntegrationProviderResponse>(BASE, body);
  },

  update(token: string, id: string, body: UpdateProviderRequest): Promise<ApiResult<IntegrationProviderResponse>> {
    return httpClient.withAuth(token).patch<IntegrationProviderResponse>(`${BASE}/${id}`, body);
  },

  enable(token: string, id: string): Promise<ApiResult<IntegrationProviderResponse>> {
    return httpClient.withAuth(token).post<IntegrationProviderResponse>(`${BASE}/${id}/enable`);
  },

  disable(token: string, id: string): Promise<ApiResult<IntegrationProviderResponse>> {
    return httpClient.withAuth(token).post<IntegrationProviderResponse>(`${BASE}/${id}/disable`);
  },

  setPrimary(token: string, id: string): Promise<ApiResult<IntegrationProviderResponse>> {
    return httpClient.withAuth(token).post<IntegrationProviderResponse>(`${BASE}/${id}/primary`);
  },

  setFallback(token: string, id: string, enable: boolean): Promise<ApiResult<IntegrationProviderResponse>> {
    return httpClient.withAuth(token).post<IntegrationProviderResponse>(
      `${BASE}/${id}/fallback?enable=${enable}`,
    );
  },

  upsertCredentials(token: string, id: string, body: UpsertCredentialsRequest): Promise<ApiResult<IntegrationProviderResponse>> {
    return httpClient.withAuth(token).put<IntegrationProviderResponse>(`${BASE}/${id}/credentials`, body);
  },

  upsertSettings(token: string, id: string, body: UpsertSettingsRequest): Promise<ApiResult<IntegrationProviderResponse>> {
    return httpClient.withAuth(token).put<IntegrationProviderResponse>(`${BASE}/${id}/settings`, body);
  },

  runTest(token: string, id: string, testType?: string): Promise<ApiResult<IntegrationTestLogResponse>> {
    return httpClient.withAuth(token).post<IntegrationTestLogResponse>(
      `${BASE}/${id}/test`,
      testType ? { testType } : {},
    );
  },

  getTestLogs(token: string, id: string): Promise<ApiResult<IntegrationTestLogResponse[]>> {
    return httpClient.withAuth(token).get<IntegrationTestLogResponse[]>(`${BASE}/${id}/test-logs`);
  },

  getProviderAuditLogs(token: string, id: string): Promise<ApiResult<IntegrationAuditLogResponse[]>> {
    return httpClient.withAuth(token).get<IntegrationAuditLogResponse[]>(`${BASE}/${id}/audit-logs`);
  },

  getAllAuditLogs(token: string): Promise<ApiResult<IntegrationAuditLogResponse[]>> {
    return httpClient.withAuth(token).get<IntegrationAuditLogResponse[]>(`${BASE}/audit-logs`);
  },

  delete(token: string, id: string): Promise<ApiResult<string>> {
    return httpClient.withAuth(token).delete<string>(`${BASE}/${id}`);
  },
};
