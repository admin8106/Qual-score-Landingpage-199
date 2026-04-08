import { env } from '../../config/env';
import type { ApiResult } from '../types';
import { ok, err } from '../types';

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  email: string;
  fullName: string;
  role: string;
  issuedAt: string;
}

export interface AdminProfileResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
  lastLoginAt?: string;
  createdAt: string;
}

const EDGE_BASE = `${env.supabaseUrl}/functions/v1/admin-auth`;

async function edgeRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${EDGE_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Apikey': env.supabaseAnonKey,
        ...options.headers,
      },
    });

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return err('PARSE_ERROR', 'Response was not valid JSON');
    }

    const envelope = json as { ok?: boolean; data?: T; error?: { code: string; message: string } };

    if (!response.ok || envelope.ok === false) {
      const code = envelope?.error?.code ?? (response.status === 401 ? 'UNAUTHORIZED' : response.status === 403 ? 'FORBIDDEN' : 'SERVER_ERROR');
      const message = envelope?.error?.message ?? `HTTP ${response.status}`;
      return err(code, message);
    }

    return ok(envelope.data as T);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed';
    return err('NETWORK_ERROR', message);
  }
}

export const adminAuthApi = {
  login(credentials: AdminLoginRequest): Promise<ApiResult<AdminLoginResponse>> {
    return edgeRequest<AdminLoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  me(token: string): Promise<ApiResult<AdminProfileResponse>> {
    return edgeRequest<AdminProfileResponse>('/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
