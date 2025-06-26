/**
 * Runtime type validation and schema definitions for ElizaOS
 *
 * This module provides runtime validation utilities to bridge the gap
 * between compile-time TypeScript types and runtime validation.
 */

import { ValidationError } from '../errors/index';
import type { ComponentDependency } from './plugin';

/**
 * Schema definition for runtime validation
 */
export interface Schema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'undefined';
  required?: boolean;
  properties?: Record<string, Schema>;
  items?: Schema;
  enum?: readonly unknown[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean | string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  value?: unknown;
  warnings?: string[];
}

/**
 * Runtime type validator
 */
export class TypeValidator {
  /**
   * Validate a value against a schema
   */
  validate(value: unknown, schema: Schema, path = ''): ValidationResult {
    const errors: ValidationError[] = [];

    // Check required
    if (schema.required && (value === undefined || value === null)) {
      errors.push(new ValidationError(`${path || 'value'} is required`));
      return { valid: false, errors };
    }

    // Allow undefined/null for non-required fields
    if (!schema.required && (value === undefined || value === null)) {
      return { valid: true, errors: [], value };
    }

    // Type validation
    if (!this.validateType(value, schema.type)) {
      errors.push(
        new ValidationError(
          `${path || 'value'} must be of type ${schema.type}, got ${typeof value}`
        )
      );
      return { valid: false, errors };
    }

    // Additional validations based on type
    switch (schema.type) {
      case 'string':
        this.validateString(value as string, schema, path, errors);
        break;
      case 'number':
        this.validateNumber(value as number, schema, path, errors);
        break;
      case 'array':
        this.validateArray(value as unknown[], schema, path, errors);
        break;
      case 'object':
        this.validateObject(value as Record<string, unknown>, schema, path, errors);
        break;
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(
        new ValidationError(`${path || 'value'} must be one of: ${schema.enum.join(', ')}`)
      );
    }

    // Custom validation
    if (schema.custom) {
      const customResult = schema.custom(value);
      if (typeof customResult === 'string') {
        errors.push(new ValidationError(`${path || 'value'}: ${customResult}`));
      } else if (!customResult) {
        errors.push(new ValidationError(`${path || 'value'} failed custom validation`));
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      value,
    };
  }

  private validateType(value: unknown, type: Schema['type']): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'null':
        return value === null;
      case 'undefined':
        return value === undefined;
      default:
        return false;
    }
  }

  private validateString(
    value: string,
    schema: Schema,
    path: string,
    errors: ValidationError[]
  ): void {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(
        new ValidationError(
          `${path || 'value'} must be at least ${schema.minLength} characters long`
        )
      );
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(
        new ValidationError(
          `${path || 'value'} must be no more than ${schema.maxLength} characters long`
        )
      );
    }

    if (schema.pattern && !schema.pattern.test(value)) {
      errors.push(new ValidationError(`${path || 'value'} does not match required pattern`));
    }
  }

  private validateNumber(
    value: number,
    schema: Schema,
    path: string,
    errors: ValidationError[]
  ): void {
    if (schema.min !== undefined && value < schema.min) {
      errors.push(new ValidationError(`${path || 'value'} must be at least ${schema.min}`));
    }

    if (schema.max !== undefined && value > schema.max) {
      errors.push(new ValidationError(`${path || 'value'} must be no more than ${schema.max}`));
    }
  }

  private validateArray(
    value: unknown[],
    schema: Schema,
    path: string,
    errors: ValidationError[]
  ): void {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(
        new ValidationError(`${path || 'value'} must have at least ${schema.minLength} items`)
      );
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(
        new ValidationError(`${path || 'value'} must have no more than ${schema.maxLength} items`)
      );
    }

    if (schema.items) {
      value.forEach((item, index) => {
        const itemResult = this.validate(item, schema.items!, `${path}[${index}]`);
        errors.push(...itemResult.errors);
      });
    }
  }

  private validateObject(
    value: Record<string, unknown>,
    schema: Schema,
    path: string,
    errors: ValidationError[]
  ): void {
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propPath = path ? `${path}.${key}` : key;
        const propResult = this.validate(value[key], propSchema, propPath);
        errors.push(...propResult.errors);
      }
    }
  }
}

/**
 * Global validator instance
 */
export const validator = new TypeValidator();

/**
 * Common schema definitions for ElizaOS types
 */

export const UUIDSchema: Schema = {
  type: 'string',
  required: true,
  pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  custom: (value: unknown) => {
    if (typeof value !== 'string') {
      return 'UUID must be a string';
    }
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  },
};

export const ContentSchema: Schema = {
  type: 'object',
  required: true,
  properties: {
    text: { type: 'string', required: false },
    thought: { type: 'string', required: false },
    actions: {
      type: 'array',
      required: false,
      items: { type: 'string', required: true },
    },
    providers: {
      type: 'array',
      required: false,
      items: { type: 'string', required: true },
    },
    source: { type: 'string', required: false },
    inReplyTo: UUIDSchema,
  },
};

export const MemorySchema: Schema = {
  type: 'object',
  required: true,
  properties: {
    id: UUIDSchema,
    entityId: UUIDSchema,
    agentId: UUIDSchema,
    content: ContentSchema,
    roomId: UUIDSchema,
    worldId: UUIDSchema,
    unique: { type: 'boolean', required: false },
    similarity: { type: 'number', required: false, min: 0, max: 1 },
  },
};

export const CharacterSchema: Schema = {
  type: 'object',
  required: true,
  properties: {
    id: UUIDSchema,
    name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    username: { type: 'string', required: false, minLength: 1, maxLength: 50 },
    system: { type: 'string', required: false },
    bio: {
      type: 'string', // Note: Could also be array, needs union type support
      required: true,
      minLength: 1,
    },
    plugins: {
      type: 'array',
      required: false,
      items: { type: 'string', required: true },
    },
    settings: {
      type: 'object',
      required: false,
    },
    secrets: {
      type: 'object',
      required: false,
    },
  },
};

/**
 * Validation decorators and utilities
 */

/**
 * Validate function parameters at runtime
 */
export function validateParams(schema: Record<string, Schema>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      const paramNames = getParameterNames(originalMethod);

      for (let i = 0; i < paramNames.length && i < args.length; i++) {
        const paramName = paramNames[i];
        const paramSchema = schema[paramName];

        if (paramSchema) {
          const result = validator.validate(args[i], paramSchema, paramName);
          if (!result.valid) {
            throw new ValidationError(
              `Invalid parameter ${paramName}: ${result.errors.map((e) => e.message).join(', ')}`
            );
          }
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Type guard factories for common types
 */

export function createTypeGuard<T>(schema: Schema) {
  return (value: unknown): value is T => {
    const result = validator.validate(value, schema);
    return result.valid;
  };
}

// Type guards for common ElizaOS types
export const isValidUUID = createTypeGuard<string>(UUIDSchema);
export const isValidContent = createTypeGuard<any>(ContentSchema); // Replace 'any' with proper Content type
export const isValidMemory = createTypeGuard<any>(MemorySchema); // Replace 'any' with proper Memory type
export const isValidCharacter = createTypeGuard<any>(CharacterSchema); // Replace 'any' with proper Character type

/**
 * Safe type casting with validation
 */
export function safeCast<T>(value: unknown, schema: Schema, errorMessage?: string): T {
  const result = validator.validate(value, schema);

  if (!result.valid) {
    const errors = result.errors.map((e) => e.message).join(', ');
    throw new ValidationError(errorMessage || `Type casting failed: ${errors}`);
  }

  return value as T;
}

/**
 * Utility to extract parameter names from a function (for validation decorator)
 */
function getParameterNames(func: Function): string[] {
  const funcStr = func.toString();
  const match = funcStr.match(/\(([^)]*)\)/);
  if (!match) {
    return [];
  }

  return match[1]
    .split(',')
    .map((param) => param.trim().split(/\s+/)[0])
    .filter((param) => param.length > 0);
}

/**
 * Sanitization utilities
 */

export interface SanitizationOptions {
  maxStringLength?: number;
  allowedKeys?: string[];
  removeNullValues?: boolean;
  trimStrings?: boolean;
}

export function sanitizeObject(
  obj: Record<string, unknown>,
  options: SanitizationOptions = {}
): Record<string, unknown> {
  const {
    maxStringLength = 10000,
    allowedKeys,
    removeNullValues = false,
    trimStrings = true,
  } = options;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip keys not in allowlist if provided
    if (allowedKeys && !allowedKeys.includes(key)) {
      continue;
    }

    // Skip null values if requested
    if (removeNullValues && value === null) {
      continue;
    }

    // Sanitize value based on type
    if (typeof value === 'string') {
      let sanitizedValue = value;
      if (trimStrings) {
        sanitizedValue = sanitizedValue.trim();
      }
      if (sanitizedValue.length > maxStringLength) {
        sanitizedValue = sanitizedValue.substring(0, maxStringLength);
      }
      sanitized[key] = sanitizedValue;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeObject(item as Record<string, unknown>, options)
          : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Component dependency for validation - imported from plugin types
 */
export type { ComponentDependency };

/**
 * Component validation context
 */
export interface ComponentValidationContext {
  pluginName: string;
  componentName: string;
  componentType: 'action' | 'provider' | 'evaluator' | 'service';
  dependencies?: ComponentDependency[];
  config?: Record<string, unknown>;
  enabledComponents?: Map<string, Set<string>>;
}
