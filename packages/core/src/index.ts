// Connectors
export { BaseConnector } from './connectors/base.js';
export type {
  IConnector,
  AuthConfig,
  AuthResult,
  ConnectorCategory,
  ConnectorType,
  EntityDefinition,
  FetchOptions,
  FieldDefinition,
  PushResult,
} from './connectors/base.js';

export { TripletexConnector } from './connectors/tripletex.js';
export { ShopifyConnector } from './connectors/shopify.js';
export { VippsConnector } from './connectors/vipps.js';

// Engine
export { SyncEngine } from './engine/sync-engine.js';
export type { SyncConfig, SyncResult } from './engine/sync-engine.js';
export { Scheduler } from './engine/scheduler.js';
export {
  applyFieldMappings,
  applyTransformRules,
  evaluateCondition,
  applyAction,
} from './engine/transform.js';
export type { FieldMapping, TransformRule } from './engine/transform.js';

// Utils
export { encrypt, decrypt } from './utils/crypto.js';
export { logger } from './utils/logger.js';
