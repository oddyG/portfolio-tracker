/**
 * Workflow Runner – orchestrates the full execution of an AccountWorkflow.
 *
 * 1. Loads all relevant data (logic, variables, functions).
 * 2. Executes JavaScript in sandboxed engine.
 * 3. Interprets the return object (source, target, mapping config).
 * 4. Logs the full process to WorkflowRuns.
 */

import { executeJavaScript, ExecutionContext, ExecutionResult } from './js-executor.js';
import { logger } from '../utils/logger.js';

export interface WorkflowData {
  accountWorkflowId: string;
  workflowName: string;
  jsLogic: string;
  variables: Record<string, unknown>;
  functions: Record<string, string>;
}

export interface WorkflowExecutionResult {
  success: boolean;
  executionResult: ExecutionResult;
  returnValue: unknown;
  logs: string[];
  error?: string;
}

/**
 * Standard return object structure expected from workflow JS logic.
 */
export interface WorkflowReturnObject {
  source: {
    api_name: string;
    params?: Record<string, unknown>;
  };
  target: {
    api_name: string;
    config?: Record<string, unknown>;
  };
  mapping?: Record<string, string>;
  options?: Record<string, unknown>;
}

/**
 * Run a workflow: execute its JS logic with injected $v and $u.
 */
export function runWorkflow(data: WorkflowData): WorkflowExecutionResult {
  logger.info(`Starting workflow execution: ${data.workflowName} (${data.accountWorkflowId})`);

  const context: ExecutionContext = {
    variables: data.variables,
    functions: data.functions,
  };

  const result = executeJavaScript(data.jsLogic, context);

  if (result.success) {
    logger.info(
      `Workflow ${data.workflowName} completed successfully in ${result.durationMs}ms`,
    );
  } else {
    logger.error(
      `Workflow ${data.workflowName} failed: ${result.error}`,
    );
  }

  return {
    success: result.success,
    executionResult: result,
    returnValue: result.returnValue,
    logs: result.logs,
    error: result.error,
  };
}
