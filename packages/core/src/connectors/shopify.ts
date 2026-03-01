/**
 * Shopify Connector
 *
 * Connects to the Shopify Admin REST API.
 * Supports reading orders, products, customers, and inventory.
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
    name: 'orders',
    label: 'Ordrer',
    supportsRead: true,
    supportsWrite: false,
    fields: [
      { name: 'id', label: 'ID', type: 'number', required: false },
      { name: 'order_number', label: 'Ordrenummer', type: 'number', required: false },
      { name: 'email', label: 'E-post', type: 'string', required: false },
      { name: 'financial_status', label: 'Betalingsstatus', type: 'string', required: false },
      { name: 'fulfillment_status', label: 'Leveringsstatus', type: 'string', required: false },
      { name: 'total_price', label: 'Totalpris', type: 'number', required: false },
      { name: 'currency', label: 'Valuta', type: 'string', required: false },
      { name: 'line_items', label: 'Ordrelinjer', type: 'array', required: false },
      { name: 'customer', label: 'Kunde', type: 'object', required: false },
      { name: 'shipping_address', label: 'Leveringsadresse', type: 'object', required: false },
      { name: 'created_at', label: 'Opprettet', type: 'date', required: false },
    ],
  },
  {
    name: 'products',
    label: 'Produkter',
    supportsRead: true,
    supportsWrite: false,
    fields: [
      { name: 'id', label: 'ID', type: 'number', required: false },
      { name: 'title', label: 'Tittel', type: 'string', required: true },
      { name: 'handle', label: 'Handle', type: 'string', required: false },
      { name: 'product_type', label: 'Produkttype', type: 'string', required: false },
      { name: 'vendor', label: 'Leverandør', type: 'string', required: false },
      { name: 'variants', label: 'Varianter', type: 'array', required: false },
    ],
  },
  {
    name: 'customers',
    label: 'Kunder',
    supportsRead: true,
    supportsWrite: false,
    fields: [
      { name: 'id', label: 'ID', type: 'number', required: false },
      { name: 'email', label: 'E-post', type: 'string', required: false },
      { name: 'first_name', label: 'Fornavn', type: 'string', required: false },
      { name: 'last_name', label: 'Etternavn', type: 'string', required: false },
      { name: 'phone', label: 'Telefon', type: 'string', required: false },
      { name: 'orders_count', label: 'Antall ordrer', type: 'number', required: false },
      { name: 'total_spent', label: 'Totalt kjøpt', type: 'string', required: false },
    ],
  },
];

export class ShopifyConnector extends BaseConnector {
  id = 'shopify';
  name = 'Shopify';
  type: ConnectorType = 'source';
  category: ConnectorCategory = 'nettbutikk';

  private storeDomain = '';
  private accessToken = '';
  private apiVersion = '2024-01';

  async authenticate(config: AuthConfig): Promise<AuthResult> {
    this.storeDomain = config.credentials['storeDomain'] ?? '';
    this.accessToken = config.credentials['accessToken'] ?? '';

    if (!this.storeDomain || !this.accessToken) {
      return { success: false, error: 'storeDomain og accessToken er påkrevd' };
    }

    // Normalize domain
    if (!this.storeDomain.includes('.myshopify.com')) {
      this.storeDomain = `${this.storeDomain}.myshopify.com`;
    }

    this.baseUrl = `https://${this.storeDomain}/admin/api/${this.apiVersion}/`;
    this.authToken = this.accessToken;

    try {
      const ok = await this.testConnection();
      return ok
        ? { success: true, token: this.accessToken }
        : { success: false, error: 'Kunne ikke koble til Shopify-butikken' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.httpGet('shop.json');
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
      'X-Shopify-Access-Token': this.accessToken,
      'Content-Type': 'application/json',
    };
  }

  override async fetchRecords(
    entity: string,
    options?: FetchOptions,
  ): Promise<Record<string, unknown>[]> {
    const params: Record<string, string> = {};

    if (options?.pageSize) params['limit'] = String(Math.min(options.pageSize, 250));
    if (options?.since) params['created_at_min'] = options.since.toISOString();

    if (options?.filters) {
      Object.entries(options.filters).forEach(([k, v]) => {
        params[k] = String(v);
      });
    }

    const data = await this.httpGet<Record<string, unknown>>(`${entity}.json`, params);
    const key = entity; // Shopify wraps in { orders: [...] }
    if (data[key] && Array.isArray(data[key])) {
      return data[key] as Record<string, unknown>[];
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
      errors: [{ record: null, error: 'Shopify-connector støtter kun lesing' }],
    };
  }
}
