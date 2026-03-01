/**
 * Sync Engine – orchestrates data flow between two connectors.
 * Fetches from source, transforms, and pushes to destination.
 */

import { IConnector, FetchOptions } from '../connectors/base.js';
import {
  FieldMapping,
  TransformRule,
  applyFieldMappings,
  applyTransformRules,
} from './transform.js';
import { logger } from '../utils/logger.js';

export interface SyncConfig {
  integrationId: string;
  integrationName: string;
  sourceConnector: IConnector;
  destinationConnector: IConnector;
  fieldMappings: FieldMapping[];
  transformRules: TransformRule[];
  sourceEntity: string;
  destinationEntity: string;
  fetchOptions?: FetchOptions;
  errorHandling: 'skip' | 'retry' | 'halt';
}

export interface SyncResult {
  integrationId: string;
  startedAt: Date;
  completedAt: Date;
  status: 'success' | 'partial' | 'failed';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errors: Array<{ record: unknown; error: string }>;
}

export class SyncEngine {
  /**
   * Execute a full sync run between source and destination connectors.
   */
  async execute(config: SyncConfig): Promise<SyncResult> {
    const startedAt = new Date();
    const result: SyncResult = {
      integrationId: config.integrationId,
      startedAt,
      completedAt: startedAt,
      status: 'success',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      errors: [],
    };

    logger.info(
      `Starter synkronisering: ${config.integrationName} (${config.sourceConnector.name} → ${config.destinationConnector.name})`,
    );

    try {
      // 1. Fetch records from source
      const sourceRecords = await config.sourceConnector.fetchRecords(
        config.sourceEntity,
        config.fetchOptions,
      );

      logger.info(`Hentet ${sourceRecords.length} poster fra ${config.sourceConnector.name}`);
      result.recordsProcessed = sourceRecords.length;

      if (sourceRecords.length === 0) {
        result.completedAt = new Date();
        return result;
      }

      // 2. Transform each record
      const transformedRecords: Record<string, unknown>[] = [];

      for (const record of sourceRecords) {
        try {
          // Apply field mappings
          let mapped = applyFieldMappings(record, config.fieldMappings);

          // Apply transform rules
          mapped = applyTransformRules(mapped, config.transformRules);

          transformedRecords.push(mapped);
        } catch (err) {
          result.recordsFailed++;
          result.errors.push({
            record,
            error: `Transformasjonsfeil: ${(err as Error).message}`,
          });

          if (config.errorHandling === 'halt') {
            result.status = 'failed';
            result.completedAt = new Date();
            return result;
          }
        }
      }

      // 3. Push records to destination
      if (transformedRecords.length > 0) {
        const pushResult = await config.destinationConnector.pushRecords(
          config.destinationEntity,
          transformedRecords,
        );

        result.recordsCreated = pushResult.created;
        result.recordsUpdated = pushResult.updated;
        result.recordsFailed += pushResult.failed;
        result.errors.push(...pushResult.errors.map((e) => ({
          record: e.record,
          error: e.error,
        })));
      }

      result.recordsSkipped =
        result.recordsProcessed -
        result.recordsCreated -
        result.recordsUpdated -
        result.recordsFailed;

    } catch (err) {
      result.status = 'failed';
      result.errors.push({
        record: null,
        error: `Synkroniseringsfeil: ${(err as Error).message}`,
      });
      logger.error(`Synkronisering feilet: ${(err as Error).message}`);
    }

    // Determine final status
    if (result.recordsFailed > 0 && result.recordsCreated + result.recordsUpdated > 0) {
      result.status = 'partial';
    } else if (result.recordsFailed > 0) {
      result.status = 'failed';
    }

    result.completedAt = new Date();
    logger.info(
      `Synkronisering ferdig: ${result.status} – ` +
      `${result.recordsCreated} opprettet, ${result.recordsUpdated} oppdatert, ` +
      `${result.recordsFailed} feilet`,
    );

    return result;
  }
}
