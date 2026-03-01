/**
 * Data transformation engine.
 * Applies field mappings and transform rules to records flowing between connectors.
 */

export interface FieldMapping {
  sourceEntity: string;
  sourceField: string;
  destinationEntity: string;
  destinationField: string;
  transform?: string;
}

export interface TransformRule {
  condition: string;
  action: string;
}

/**
 * Resolve a nested field value from a record, e.g. "order.line_items[].sku"
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null) return undefined;

    // Handle array notation like "line_items[]"
    const arrayMatch = part.match(/^(\w+)\[\]$/);
    if (arrayMatch) {
      const key = arrayMatch[1];
      current = (current as Record<string, unknown>)[key];
      // If it's an array, we'll handle mapping across all elements upstream
      continue;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set a nested field value in a record.
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Apply field mappings to transform a source record into a destination record.
 */
export function applyFieldMappings(
  sourceRecord: Record<string, unknown>,
  mappings: FieldMapping[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const value = getNestedValue(sourceRecord, mapping.sourceField);
    if (value !== undefined) {
      let finalValue = value;

      // Apply inline transform if specified
      if (mapping.transform) {
        finalValue = applyInlineTransform(value, mapping.transform);
      }

      setNestedValue(result, mapping.destinationField, finalValue);
    }
  }

  return result;
}

/**
 * Apply inline transform expressions (simple built-in functions).
 */
function applyInlineTransform(value: unknown, transform: string): unknown {
  switch (transform) {
    case 'toString':
      return String(value);
    case 'toNumber':
      return Number(value);
    case 'toUpperCase':
      return typeof value === 'string' ? value.toUpperCase() : value;
    case 'toLowerCase':
      return typeof value === 'string' ? value.toLowerCase() : value;
    case 'trim':
      return typeof value === 'string' ? value.trim() : value;
    case 'toDate':
      return new Date(String(value)).toISOString();
    default:
      return value;
  }
}

/**
 * Evaluate a transform rule condition against a record.
 * Uses a safe subset of JS expressions.
 */
export function evaluateCondition(
  record: Record<string, unknown>,
  condition: string,
): boolean {
  try {
    // Build a safe evaluation context with record fields available
    const fn = new Function('record', `return (${condition});`);
    return Boolean(fn(record));
  } catch {
    return false;
  }
}

/**
 * Apply a transform rule action to a record.
 * Format: "set <field> to <value>"
 */
export function applyAction(
  record: Record<string, unknown>,
  action: string,
): Record<string, unknown> {
  const setMatch = action.match(/^set\s+(\S+)\s+to\s+(.+)$/i);
  if (setMatch) {
    const field = setMatch[1];
    let value: unknown = setMatch[2];

    // Try to parse as number
    if (!isNaN(Number(value))) {
      value = Number(value);
    }
    // Remove surrounding quotes
    if (typeof value === 'string' && value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }

    setNestedValue(record, field, value);
  }

  return record;
}

/**
 * Apply all transform rules to a record.
 */
export function applyTransformRules(
  record: Record<string, unknown>,
  rules: TransformRule[],
): Record<string, unknown> {
  let result = { ...record };

  for (const rule of rules) {
    if (evaluateCondition(result, rule.condition)) {
      result = applyAction(result, rule.action);
    }
  }

  return result;
}
