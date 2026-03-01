/**
 * API client for communicating with the backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API-feil ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Connectors ─────────────────────────────────────

export async function getConnectors() {
  return apiFetch<ConnectorSummary[]>('/api/connectors');
}

export async function getConnector(id: string) {
  return apiFetch<ConnectorSummary>(`/api/connectors/${id}`);
}

export async function createConnector(data: CreateConnectorInput) {
  return apiFetch<ConnectorSummary>('/api/connectors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function testConnector(id: string) {
  return apiFetch<{ connected: boolean; error?: string }>(`/api/connectors/${id}/test`, {
    method: 'POST',
  });
}

export async function getConnectorEntities(id: string) {
  return apiFetch<EntityDef[]>(`/api/connectors/${id}/entities`);
}

// ── Integrations ───────────────────────────────────

export async function getIntegrations() {
  return apiFetch<Integration[]>('/api/integrations');
}

export async function getIntegration(id: string) {
  return apiFetch<Integration>(`/api/integrations/${id}`);
}

export async function createIntegration(data: CreateIntegrationInput) {
  return apiFetch<Integration>('/api/integrations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateIntegration(id: string, data: Partial<Integration>) {
  return apiFetch<Integration>(`/api/integrations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function triggerSync(id: string) {
  return apiFetch<{ syncRunId: string; message: string }>(`/api/integrations/${id}/sync`, {
    method: 'POST',
  });
}

// ── Sync Runs ──────────────────────────────────────

export async function getSyncRuns(integrationId?: string) {
  const query = integrationId ? `?integrationId=${integrationId}` : '';
  return apiFetch<SyncRun[]>(`/api/sync-runs${query}`);
}

export async function getSyncRunStats() {
  return apiFetch<SyncRunStats>('/api/sync-runs/stats/overview');
}

// ── Types ──────────────────────────────────────────

export interface ConnectorSummary {
  id: string;
  name: string;
  type: string;
  category: string;
  isActive: boolean;
  hasConfig: boolean;
  createdAt: string;
}

export interface CreateConnectorInput {
  name: string;
  type: string;
  category: string;
  config?: Record<string, string>;
}

export interface EntityDef {
  name: string;
  label: string;
  fields: { name: string; label: string; type: string; required: boolean }[];
  supportsRead: boolean;
  supportsWrite: boolean;
}

export interface Integration {
  id: string;
  name: string;
  sourceConnectorId: string;
  destinationConnectorId: string;
  sourceConnector?: { id: string; name: string; category: string };
  destinationConnector?: { id: string; name: string; category: string };
  fieldMappings: string;
  transformRules: string;
  schedule: string;
  status: string;
  errorHandling: string;
  lastRunAt: string | null;
  createdAt: string;
  syncRuns?: SyncRun[];
}

export interface CreateIntegrationInput {
  name: string;
  sourceConnectorId: string;
  destinationConnectorId: string;
  fieldMappings?: unknown[];
  transformRules?: unknown[];
  schedule?: string;
  errorHandling?: string;
}

export interface SyncRun {
  id: string;
  integrationId: string;
  integration?: { id: string; name: string };
  startedAt: string;
  completedAt: string | null;
  status: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errors: string;
}

export interface SyncRunStats {
  total: number;
  success: number;
  failed: number;
  partial: number;
  successRate: string;
  recentRuns: SyncRun[];
}
