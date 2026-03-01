/**
 * Tripletex Connector
 *
 * Connects to the Tripletex accounting system API (https://tripletex.no/v2/).
 * Supports reading invoices, customers, products, ledger postings and accounts.
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

// ── Entity definitions ─────────────────────────────────────────

const ENTITIES: EntityDefinition[] = [
  {
    name: 'invoices',
    label: 'Fakturaer',
    supportsRead: true,
    supportsWrite: true,
    fields: [
      { name: 'id', label: 'ID', type: 'number', required: false },
      { name: 'invoiceNumber', label: 'Fakturanummer', type: 'number', required: false },
      { name: 'invoiceDate', label: 'Fakturadato', type: 'date', required: true },
      { name: 'dueDate', label: 'Forfallsdato', type: 'date', required: true },
      { name: 'customer', label: 'Kunde', type: 'object', required: true },
      { name: 'amount', label: 'Beløp', type: 'number', required: false },
      { name: 'amountCurrency', label: 'Beløp (valuta)', type: 'number', required: false },
      { name: 'currency', label: 'Valuta', type: 'string', required: false },
      { name: 'isCredited', label: 'Kreditert', type: 'boolean', required: false },
      { name: 'orderLines', label: 'Ordrelinjer', type: 'array', required: false },
    ],
  },
  {
    name: 'customers',
    label: 'Kunder',
    supportsRead: true,
    supportsWrite: true,
    fields: [
      { name: 'id', label: 'ID', type: 'number', required: false },
      { name: 'name', label: 'Navn', type: 'string', required: true },
      { name: 'email', label: 'E-post', type: 'string', required: false },
      { name: 'phoneNumber', label: 'Telefon', type: 'string', required: false },
      { name: 'organizationNumber', label: 'Org.nr', type: 'string', required: false },
      { name: 'customerNumber', label: 'Kundenummer', type: 'number', required: false },
      { name: 'isCustomer', label: 'Er kunde', type: 'boolean', required: false },
      { name: 'isSupplier', label: 'Er leverandør', type: 'boolean', required: false },
    ],
  },
  {
    name: 'products',
    label: 'Produkter',
    supportsRead: true,
    supportsWrite: true,
    fields: [
      { name: 'id', label: 'ID', type: 'number', required: false },
      { name: 'name', label: 'Navn', type: 'string', required: true },
      { name: 'number', label: 'Produktnummer', type: 'string', required: false },
      { name: 'costExcludingVatCurrency', label: 'Kostpris eks. mva', type: 'number', required: false },
      { name: 'priceExcludingVatCurrency', label: 'Pris eks. mva', type: 'number', required: false },
      { name: 'priceIncludingVatCurrency', label: 'Pris inkl. mva', type: 'number', required: false },
      { name: 'vatType', label: 'MVA-type', type: 'object', required: false },
    ],
  },
  {
    name: 'orders',
    label: 'Ordrer',
    supportsRead: true,
    supportsWrite: true,
    fields: [
      { name: 'id', label: 'ID', type: 'number', required: false },
      { name: 'orderDate', label: 'Ordredato', type: 'date', required: true },
      { name: 'customer', label: 'Kunde', type: 'object', required: true },
      { name: 'orderLines', label: 'Ordrelinjer', type: 'array', required: false },
      { name: 'deliveryDate', label: 'Leveringsdato', type: 'date', required: false },
    ],
  },
  {
    name: 'ledger/posting',
    label: 'Hovedbok-posteringer',
    supportsRead: true,
    supportsWrite: false,
    fields: [
      { name: 'id', label: 'ID', type: 'number', required: false },
      { name: 'date', label: 'Dato', type: 'date', required: false },
      { name: 'description', label: 'Beskrivelse', type: 'string', required: false },
      { name: 'account', label: 'Konto', type: 'object', required: false },
      { name: 'amount', label: 'Beløp', type: 'number', required: false },
      { name: 'amountCurrency', label: 'Beløp (valuta)', type: 'number', required: false },
    ],
  },
  {
    name: 'ledger/account',
    label: 'Kontoplan',
    supportsRead: true,
    supportsWrite: false,
    fields: [
      { name: 'id', label: 'ID', type: 'number', required: false },
      { name: 'number', label: 'Kontonummer', type: 'number', required: true },
      { name: 'name', label: 'Kontonavn', type: 'string', required: true },
      { name: 'type', label: 'Kontotype', type: 'string', required: false },
    ],
  },
];

// ── Connector ──────────────────────────────────────────────────

export class TripletexConnector extends BaseConnector {
  id = 'tripletex';
  name = 'Tripletex';
  type: ConnectorType = 'both';
  category: ConnectorCategory = 'regnskap';

  private consumerToken = '';
  private employeeToken = '';
  private companyId = '';
  private sessionToken = '';

  constructor() {
    super();
    this.baseUrl = 'https://tripletex.no/v2/';
  }

  async authenticate(config: AuthConfig): Promise<AuthResult> {
    this.consumerToken = config.credentials['consumerToken'] ?? '';
    this.employeeToken = config.credentials['employeeToken'] ?? '';
    this.companyId = config.credentials['companyId'] ?? '';

    if (!this.consumerToken || !this.employeeToken) {
      return { success: false, error: 'consumerToken og employeeToken er påkrevd' };
    }

    try {
      // Create session token via Tripletex API
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expirationDate = tomorrow.toISOString().split('T')[0];

      const tokenUrl = new URL('token/session/:create', this.baseUrl);
      tokenUrl.searchParams.set('consumerToken', this.consumerToken);
      tokenUrl.searchParams.set('employeeToken', this.employeeToken);
      tokenUrl.searchParams.set('expirationDate', expirationDate);

      const res = await fetch(tokenUrl.toString(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const body = await res.text();
        return { success: false, error: `Autentisering feilet: ${res.status} – ${body}` };
      }

      const data = (await res.json()) as { value?: { token?: string } };
      this.sessionToken = data.value?.token ?? '';
      this.authToken = this.sessionToken;
      this.tokenExpiresAt = tomorrow;

      return { success: true, token: this.sessionToken, expiresAt: tomorrow };
    } catch (err) {
      return { success: false, error: `Nettverksfeil: ${(err as Error).message}` };
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isTokenValid()) return false;
    try {
      await this.httpGet('company');
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
    // Tripletex uses Basic auth with 0:<sessionToken>
    const encoded = Buffer.from(`0:${this.sessionToken}`).toString('base64');
    return {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json',
    };
  }

  // ── Fetch ──────────────────────────────────────────────────

  override async fetchRecords(
    entity: string,
    options?: FetchOptions,
  ): Promise<Record<string, unknown>[]> {
    const params: Record<string, string> = {};

    if (options?.page !== undefined) params['from'] = String(options.page * (options.pageSize ?? 100));
    if (options?.pageSize) params['count'] = String(options.pageSize);
    if (options?.since) params['dateFrom'] = options.since.toISOString().split('T')[0];

    // Merge extra filters
    if (options?.filters) {
      Object.entries(options.filters).forEach(([k, v]) => {
        params[k] = String(v);
      });
    }

    const data = await this.httpGet<{ values?: unknown[]; value?: unknown }>(entity, params);
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (data.values && Array.isArray(data.values)) return data.values as Record<string, unknown>[];
    if (data.value) return [data.value as Record<string, unknown>];
    return [];
  }

  // ── Push ───────────────────────────────────────────────────

  override async pushRecords(
    entity: string,
    records: Record<string, unknown>[],
  ): Promise<PushResult> {
    const result: PushResult = { success: true, created: 0, updated: 0, failed: 0, errors: [] };

    for (const record of records) {
      try {
        if (record['id']) {
          await this.httpPut(`${entity}/${record['id']}`, record);
          result.updated++;
        } else {
          await this.httpPost(entity, record);
          result.created++;
        }
      } catch (err) {
        result.failed++;
        result.errors.push({ record, error: (err as Error).message });
      }
    }

    result.success = result.failed === 0;
    return result;
  }
}
