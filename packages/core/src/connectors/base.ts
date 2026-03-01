/**
 * Base Connector interface and abstract class.
 * Every integration source/destination implements this contract.
 */

// ── Types ──────────────────────────────────────────────────────

export type ConnectorCategory =
  | 'regnskap'
  | 'nettbutikk'
  | 'betaling'
  | 'crm'
  | 'faktura'
  | 'frakt'
  | 'sms'
  | 'erp'
  | 'data';

export type ConnectorType = 'source' | 'destination' | 'both';

export interface AuthConfig {
  type: 'api_key' | 'oauth2' | 'basic';
  credentials: Record<string, string>;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  expiresAt?: Date;
  error?: string;
}

export interface FetchOptions {
  page?: number;
  pageSize?: number;
  since?: Date;
  filters?: Record<string, unknown>;
}

export interface PushResult {
  success: boolean;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ record: unknown; error: string }>;
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required: boolean;
}

export interface EntityDefinition {
  name: string;
  label: string;
  fields: FieldDefinition[];
  supportsRead: boolean;
  supportsWrite: boolean;
}

// ── Interface ──────────────────────────────────────────────────

export interface IConnector {
  id: string;
  name: string;
  type: ConnectorType;
  category: ConnectorCategory;

  authenticate(config: AuthConfig): Promise<AuthResult>;
  testConnection(): Promise<boolean>;

  fetchRecords(entity: string, options?: FetchOptions): Promise<Record<string, unknown>[]>;
  pushRecords(entity: string, records: Record<string, unknown>[]): Promise<PushResult>;

  getEntities(): EntityDefinition[];
  getFields(entity: string): FieldDefinition[];
}

// ── Abstract base class ────────────────────────────────────────

export abstract class BaseConnector implements IConnector {
  abstract id: string;
  abstract name: string;
  abstract type: ConnectorType;
  abstract category: ConnectorCategory;

  protected authToken?: string;
  protected tokenExpiresAt?: Date;
  protected baseUrl = '';

  abstract authenticate(config: AuthConfig): Promise<AuthResult>;
  abstract testConnection(): Promise<boolean>;
  abstract getEntities(): EntityDefinition[];
  abstract getFields(entity: string): FieldDefinition[];

  async fetchRecords(
    _entity: string,
    _options?: FetchOptions,
  ): Promise<Record<string, unknown>[]> {
    throw new Error(`fetchRecords not implemented for ${this.name}`);
  }

  async pushRecords(
    _entity: string,
    _records: Record<string, unknown>[],
  ): Promise<PushResult> {
    throw new Error(`pushRecords not implemented for ${this.name}`);
  }

  protected isTokenValid(): boolean {
    if (!this.authToken) return false;
    if (!this.tokenExpiresAt) return true;
    return this.tokenExpiresAt > new Date();
  }

  protected async httpGet<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status} from ${url.pathname}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  protected async httpPost<T>(path: string, body: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} from ${url.pathname}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  protected async httpPut<T>(path: string, body: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl);

    const res = await fetch(url.toString(), {
      method: 'PUT',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} from ${url.pathname}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }
}
