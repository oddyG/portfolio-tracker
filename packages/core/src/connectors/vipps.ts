/**
 * Vipps Connector
 *
 * Connects to the Vipps Report API for settlement and transaction data.
 * Used for payment reconciliation against accounting systems.
 */

import {
  AuthConfig,
  AuthResult,
  BaseConnector,
  ConnectorCategory,
  ConnectorType,
  EntityDefinition,
  FetchOptions,
  FieldDefinition,
  PushResult,
} from './base.js';

const ENTITIES: EntityDefinition[] = [
  {
    name: 'settlements',
    label: 'Oppgjør',
    supportsRead: true,
    supportsWrite: false,
    fields: [
      { name: 'settlementId', label: 'Oppgjørs-ID', type: 'string', required: false },
      { name: 'settledAt', label: 'Oppgjørsdato', type: 'date', required: false },
      { name: 'settledAmount', label: 'Oppgjørsbeløp', type: 'number', required: false },
      { name: 'currency', label: 'Valuta', type: 'string', required: false },
      { name: 'status', label: 'Status', type: 'string', required: false },
    ],
  },
  {
    name: 'transactions',
    label: 'Transaksjoner',
    supportsRead: true,
    supportsWrite: false,
    fields: [
      { name: 'transactionId', label: 'Transaksjons-ID', type: 'string', required: false },
      { name: 'orderId', label: 'Ordre-ID', type: 'string', required: false },
      { name: 'amount', label: 'Beløp', type: 'number', required: false },
      { name: 'currency', label: 'Valuta', type: 'string', required: false },
      { name: 'transactionType', label: 'Type', type: 'string', required: false },
      { name: 'timestamp', label: 'Tidspunkt', type: 'date', required: false },
      { name: 'payerMsisdn', label: 'Betaler (telefon)', type: 'string', required: false },
    ],
  },
];

export class VippsConnector extends BaseConnector {
  id = 'vipps';
  name = 'Vipps';
  type: ConnectorType = 'source';
  category: ConnectorCategory = 'betaling';

  private clientId = '';
  private clientSecret = '';
  private subscriptionKey = '';
  private merchantSerialNumber = '';

  constructor() {
    super();
    this.baseUrl = 'https://api.vipps.no/';
  }

  async authenticate(config: AuthConfig): Promise<AuthResult> {
    this.clientId = config.credentials['clientId'] ?? '';
    this.clientSecret = config.credentials['clientSecret'] ?? '';
    this.subscriptionKey = config.credentials['subscriptionKey'] ?? '';
    this.merchantSerialNumber = config.credentials['merchantSerialNumber'] ?? '';

    if (!this.clientId || !this.clientSecret || !this.subscriptionKey) {
      return {
        success: false,
        error: 'clientId, clientSecret og subscriptionKey er påkrevd',
      };
    }

    try {
      // Obtain access token via OAuth2
      const res = await fetch('https://api.vipps.no/accesstoken/get', {
        method: 'POST',
        headers: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const body = await res.text();
        return { success: false, error: `Autentisering feilet: ${res.status} – ${body}` };
      }

      const data = (await res.json()) as {
        access_token?: string;
        expires_in?: number;
      };

      this.authToken = data.access_token ?? '';
      const expiresIn = data.expires_in ?? 3600;
      this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      return { success: true, token: this.authToken, expiresAt: this.tokenExpiresAt };
    } catch (err) {
      return { success: false, error: `Nettverksfeil: ${(err as Error).message}` };
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isTokenValid()) return false;
    try {
      await this.httpGet('report/v2/settlements', { limit: '1' });
      return true;
    } catch {
      return false;
    }
  }

  getEntities(): EntityDefinition[] {
    return ENTITIES;
  }

  getFields(entity: string): FieldDefinition[] {
    return ENTITIES.find((e) => e.name === entity)?.fields ?? [];
  }

  protected override getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.authToken}`,
      'Ocp-Apim-Subscription-Key': this.subscriptionKey,
      'Merchant-Serial-Number': this.merchantSerialNumber,
      'Content-Type': 'application/json',
    };
  }

  override async fetchRecords(
    entity: string,
    options?: FetchOptions,
  ): Promise<Record<string, unknown>[]> {
    const params: Record<string, string> = {};

    if (options?.pageSize) params['limit'] = String(options.pageSize);
    if (options?.since) params['from'] = options.since.toISOString();

    if (options?.filters) {
      Object.entries(options.filters).forEach(([k, v]) => {
        params[k] = String(v);
      });
    }

    if (entity === 'settlements') {
      const data = await this.httpGet<{ items?: unknown[] }>('report/v2/settlements', params);
      return (data.items ?? []) as Record<string, unknown>[];
    }

    if (entity === 'transactions') {
      const settlementId = params['settlementId'] ?? '';
      const data = await this.httpGet<{ items?: unknown[] }>(
        `report/v2/settlements/${settlementId}/transactions`,
        params,
      );
      return (data.items ?? []) as Record<string, unknown>[];
    }

    return [];
  }

  override async pushRecords(
    _entity: string,
    _records: Record<string, unknown>[],
  ): Promise<PushResult> {
    return {
      success: false,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [{ record: null, error: 'Vipps-connector støtter kun lesing' }],
    };
  }
}
