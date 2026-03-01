/**
 * Scheduler – manages cron-based execution of integrations.
 */

import cron from 'node-cron';
import { logger } from '../utils/logger.js';

export interface ScheduledTask {
  integrationId: string;
  cronExpression: string;
  task: cron.ScheduledTask;
}

export class Scheduler {
  private tasks = new Map<string, ScheduledTask>();

  /**
   * Schedule a recurring sync job for an integration.
   */
  schedule(
    integrationId: string,
    cronExpression: string,
    handler: () => Promise<void>,
  ): void {
    // Remove existing schedule if any
    this.unschedule(integrationId);

    if (cronExpression === 'manual') {
      logger.info(`Integrasjon ${integrationId} er satt til manuell kjøring`);
      return;
    }

    if (!cron.validate(cronExpression)) {
      logger.error(`Ugyldig cron-uttrykk for ${integrationId}: ${cronExpression}`);
      return;
    }

    const task = cron.schedule(cronExpression, async () => {
      logger.info(`Kjører planlagt synkronisering for ${integrationId}`);
      try {
        await handler();
      } catch (err) {
        logger.error(`Planlagt synkronisering feilet for ${integrationId}: ${(err as Error).message}`);
      }
    });

    this.tasks.set(integrationId, { integrationId, cronExpression, task });
    logger.info(`Planlagt synkronisering for ${integrationId}: ${cronExpression}`);
  }

  /**
   * Remove a scheduled task.
   */
  unschedule(integrationId: string): void {
    const existing = this.tasks.get(integrationId);
    if (existing) {
      existing.task.stop();
      this.tasks.delete(integrationId);
      logger.info(`Fjernet planlagt synkronisering for ${integrationId}`);
    }
  }

  /**
   * Get all scheduled tasks.
   */
  getScheduledTasks(): Array<{ integrationId: string; cronExpression: string }> {
    return Array.from(this.tasks.values()).map(({ integrationId, cronExpression }) => ({
      integrationId,
      cronExpression,
    }));
  }

  /**
   * Stop all scheduled tasks.
   */
  stopAll(): void {
    for (const [id, task] of this.tasks) {
      task.task.stop();
      logger.info(`Stoppet planlagt synkronisering for ${id}`);
    }
    this.tasks.clear();
  }
}
