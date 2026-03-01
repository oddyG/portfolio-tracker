/**
 * JavaScript Execution Engine – sandboxed JS execution using Node.js vm module.
 * Equivalent to Jint/.NET sandboxing but in Node.js.
 *
 * Injects $v (account variables) and $u (account utility functions)
 * into a sandboxed context and executes workflow JavaScript logic.
 */

import vm from 'node:vm';

export interface ExecutionContext {
  /** $v – account variables keyed by name */
  variables: Record<string, unknown>;
  /** $u – account utility functions keyed by function name */
  functions: Record<string, string>;
}

export interface ExecutionResult {
  success: boolean;
  returnValue: unknown;
  logs: string[];
  error?: string;
  durationMs: number;
}

/** Built-in utility functions available as $u.* */
const BUILTIN_HELPERS = `
function ShortDate(date) {
  var d = date ? new Date(date) : new Date();
  return d.toISOString().split('T')[0];
}

function AddDays(date, days) {
  var d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function FormatNumber(num, decimals) {
  return Number(num).toFixed(decimals || 2);
}

function ParseJSON(str) {
  return JSON.parse(str);
}

function ToJSON(obj) {
  return JSON.stringify(obj);
}

function Trim(str) {
  return String(str).trim();
}

function Upper(str) {
  return String(str).toUpperCase();
}

function Lower(str) {
  return String(str).toLowerCase();
}

function Now() {
  return new Date().toISOString();
}

function UUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function Round(num, decimals) {
  var factor = Math.pow(10, decimals || 0);
  return Math.round(num * factor) / factor;
}
`;

/**
 * Execute JavaScript code in a sandboxed vm context.
 * The code can access $v (variables) and $u (utility functions).
 */
export function executeJavaScript(
  jsCode: string,
  context: ExecutionContext,
  timeoutMs = 5000,
): ExecutionResult {
  const startTime = Date.now();
  const logs: string[] = [];

  try {
    // Build $u with built-in helpers + user-defined functions
    const userFunctionDefs = Object.entries(context.functions)
      .map(([name, code]) => `${name}: (function() { ${code} })`)
      .join(',\n');

    const wrappedCode = `
      (function() {
        // Built-in helpers
        ${BUILTIN_HELPERS}

        // Build $u object
        var $u = {
          ShortDate: ShortDate,
          AddDays: AddDays,
          FormatNumber: FormatNumber,
          ParseJSON: ParseJSON,
          ToJSON: ToJSON,
          Trim: Trim,
          Upper: Upper,
          Lower: Lower,
          Now: Now,
          UUID: UUID,
          Round: Round,
          ${userFunctionDefs}
        };

        // $v is already available in sandbox context

        // Capture console.log
        var __logs = [];
        var console = {
          log: function() {
            var args = Array.prototype.slice.call(arguments);
            __logs.push(args.map(function(a) {
              return typeof a === 'object' ? JSON.stringify(a) : String(a);
            }).join(' '));
          },
          warn: function() {
            var args = Array.prototype.slice.call(arguments);
            __logs.push('[WARN] ' + args.map(function(a) {
              return typeof a === 'object' ? JSON.stringify(a) : String(a);
            }).join(' '));
          },
          error: function() {
            var args = Array.prototype.slice.call(arguments);
            __logs.push('[ERROR] ' + args.map(function(a) {
              return typeof a === 'object' ? JSON.stringify(a) : String(a);
            }).join(' '));
          }
        };

        // Execute user code
        var __result = (function() {
          ${jsCode}
        })();

        return { result: __result, logs: __logs };
      })();
    `;

    const sandbox: Record<string, unknown> = {
      $v: { ...context.variables },
      JSON: JSON,
      Math: Math,
      Date: Date,
      Array: Array,
      Object: Object,
      String: String,
      Number: Number,
      Boolean: Boolean,
      RegExp: RegExp,
      parseInt: parseInt,
      parseFloat: parseFloat,
      isNaN: isNaN,
      isFinite: isFinite,
      encodeURIComponent: encodeURIComponent,
      decodeURIComponent: decodeURIComponent,
    };

    const vmContext = vm.createContext(sandbox);
    const script = new vm.Script(wrappedCode, {
      filename: 'workflow.js',
    });

    const output = script.runInContext(vmContext, {
      timeout: timeoutMs,
    }) as { result: unknown; logs: string[] };

    logs.push(...(output.logs ?? []));

    return {
      success: true,
      returnValue: output.result,
      logs,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      returnValue: null,
      logs,
      error: error.message,
      durationMs: Date.now() - startTime,
    };
  }
}
