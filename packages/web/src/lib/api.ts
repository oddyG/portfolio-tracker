/**
 * API client for communicating with the iPaaS backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const ACCOUNT_ID = process.env.NEXT_PUBLIC_ACCOUNT_ID ?? 'demo-account';

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

// ── Integrations (catalog) ────────────────────────────

export async function getIntegrations() {
  return apiFetch<IntegrationCatalog[]>('/api/integrations');
}

// ── Workflows (templates) ─────────────────────────────

export async function getWorkflows() {
  return apiFetch<WorkflowTemplate[]>('/api/workflows');
}

export async function getWorkflow(id: string) {
  return apiFetch<WorkflowTemplate>(`/api/workflows/${id}`);
}

// ── Account Workflows ─────────────────────────────────

export async function getAccountWorkflows() {
  return apiFetch<AccountWorkflow[]>(`/api/accounts/${ACCOUNT_ID}/workflows`);
}

export async function getAccountWorkflow(id: string) {
  return apiFetch<AccountWorkflow>(`/api/accounts/${ACCOUNT_ID}/workflows/${id}`);
}

export async function activateWorkflow(workflowId: string, schedule?: string) {
  return apiFetch<AccountWorkflow>(`/api/accounts/${ACCOUNT_ID}/workflows`, {
    method: 'POST',
    body: JSON.stringify({ workflowId, scheduleCronExpression: schedule ?? 'manual' }),
  });
}

export async function updateAccountWorkflow(id: string, data: Partial<AccountWorkflowUpdate>) {
  return apiFetch<AccountWorkflow>(`/api/accounts/${ACCOUNT_ID}/workflows/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function runAccountWorkflow(id: string) {
  return apiFetch<WorkflowRunResult>(`/api/accounts/${ACCOUNT_ID}/workflows/${id}/run`, {
    method: 'POST',
  });
}

export async function deleteAccountWorkflow(id: string) {
  return apiFetch<void>(`/api/accounts/${ACCOUNT_ID}/workflows/${id}`, {
    method: 'DELETE',
  });
}

// ── Account Variables ($v) ────────────────────────────

export async function getAccountVariables() {
  return apiFetch<AccountVariable[]>(`/api/accounts/${ACCOUNT_ID}/variables`);
}

export async function createAccountVariable(data: { key: string; valueJson: unknown; isSecret: boolean }) {
  return apiFetch<AccountVariable>(`/api/accounts/${ACCOUNT_ID}/variables`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAccountVariable(id: string, data: Partial<AccountVariable>) {
  return apiFetch<AccountVariable>(`/api/accounts/${ACCOUNT_ID}/variables/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAccountVariable(id: string) {
  return apiFetch<void>(`/api/accounts/${ACCOUNT_ID}/variables/${id}`, {
    method: 'DELETE',
  });
}

// ── Account Functions ($u) ────────────────────────────

export async function getAccountFunctions() {
  return apiFetch<AccountFunction[]>(`/api/accounts/${ACCOUNT_ID}/functions`);
}

export async function createAccountFunction(data: { functionName: string; jsCode: string; description?: string }) {
  return apiFetch<AccountFunction>(`/api/accounts/${ACCOUNT_ID}/functions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAccountFunction(id: string, data: Partial<AccountFunction>) {
  return apiFetch<AccountFunction>(`/api/accounts/${ACCOUNT_ID}/functions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAccountFunction(id: string) {
  return apiFetch<void>(`/api/accounts/${ACCOUNT_ID}/functions/${id}`, {
    method: 'DELETE',
  });
}

// ── Workflow Runs ─────────────────────────────────────

export async function getWorkflowRuns(workflowId?: string) {
  const query = workflowId ? `?workflowId=${workflowId}` : '';
  return apiFetch<WorkflowRun[]>(`/api/accounts/${ACCOUNT_ID}/runs${query}`);
}

export async function getWorkflowRunStats() {
  return apiFetch<WorkflowRunStats>(`/api/accounts/${ACCOUNT_ID}/runs/stats/overview`);
}

// ── Types ─────────────────────────────────────────────

export interface IntegrationCatalog {
  id: string;
  name: string;
  description: string;
  category: string;
  logoUrl: string;
  authType: string;
  baseUrl: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  sourceIntegrationId: string;
  targetIntegrationId: string;
  defaultJsLogic: string;
  category: string;
  isPublished: boolean;
  sourceIntegration?: IntegrationCatalog;
  targetIntegration?: IntegrationCatalog;
}

export interface AccountWorkflow {
  id: string;
  accountId: string;
  workflowId: string;
  isActive: boolean;
  scheduleCronExpression: string;
  customJsLogic: string | null;
  lastRunAt: string | null;
  workflow?: WorkflowTemplate;
  workflowRuns?: WorkflowRun[];
}

export interface AccountWorkflowUpdate {
  isActive: boolean;
  scheduleCronExpression: string;
  customJsLogic: string | null;
}

export interface AccountVariable {
  id: string;
  accountId: string;
  key: string;
  valueJson: string;
  isSecret: boolean;
}

export interface AccountFunction {
  id: string;
  accountId: string;
  functionName: string;
  jsCode: string;
  description: string;
}

export interface WorkflowRun {
  id: string;
  accountWorkflowId: string;
  startTime: string;
  endTime: string | null;
  status: string;
  logOutput: string;
  errorMessage: string | null;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  accountWorkflow?: {
    workflow?: { id: string; name: string };
  };
}

export interface WorkflowRunResult {
  runId: string;
  success: boolean;
  returnValue: unknown;
  logs: string[];
  error?: string;
}

export interface WorkflowRunStats {
  total: number;
  success: number;
  failed: number;
  partial: number;
  activeWorkflows: number;
  successRate: string;
  recentRuns: WorkflowRun[];
}
