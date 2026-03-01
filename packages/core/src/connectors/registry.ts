/**
 * Connector registry – singleton map of all available connector types.
 */

import { IConnector } from './base.js';
import { TripletexConnector } from './tripletex.js';
import { ShopifyConnector } from './shopify.js';
import { VippsConnector } from './vipps.js';

type ConnectorFactory = () => IConnector;

const registry = new Map<string, ConnectorFactory>();

// Register built-in connectors
registry.set('tripletex', () => new TripletexConnector());
registry.set('shopify', () => new ShopifyConnector());
registry.set('vipps', () => new VippsConnector());

export function getConnectorFactory(id: string): ConnectorFactory | undefined {
  return registry.get(id);
}

export function registerConnector(id: string, factory: ConnectorFactory): void {
  registry.set(id, factory);
}

export function listConnectorTypes(): Array<{ id: string; name: string; category: string }> {
  return Array.from(registry.entries()).map(([id, factory]) => {
    const instance = factory();
    return { id, name: instance.name, category: instance.category };
  });
}
