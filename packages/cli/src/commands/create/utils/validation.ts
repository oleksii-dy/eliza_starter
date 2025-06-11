import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { basename } from 'node:path';
import * as clack from '@clack/prompts';
import { z } from 'zod';
import type { CreateOptions } from '../types';
import { initOptionsSchema } from '../types';

/**
 * Project name validation schema
 */
export const ProjectNameSchema = z
  .string()
  .min(1, 'Invalid project name: cannot be empty')
  .regex(
    /^[a-z0-9-_]+$/,
    'Invalid project name: must contain only lowercase letters, numbers, hyphens, and underscores'
  )
  .refine(
    (name) => !name.startsWith('-') && !name.endsWith('-'),
    'Invalid project name: cannot start or end with a hyphen'
  )
  .refine(
    (name) => !name.startsWith('_') && !name.endsWith('_'),
    'Invalid project name: cannot start or end with an underscore'
  );

/**
 * Plugin name validation schema
 */
export const PluginNameSchema = z
  .string()
  .min(1, 'Plugin name cannot be empty')
  .regex(
    /^[a-z0-9-_]+$/,
    'Plugin name must contain only lowercase letters, numbers, hyphens, and underscores'
  )
  .refine(
    (name) => !name.startsWith('-') && !name.endsWith('-'),
    'Plugin name cannot start or end with a hyphen'
  )
  .refine(
    (name) => !name.startsWith('_') && !name.endsWith('_'),
    'Plugin name cannot start or end with an underscore'
  );

/**
 * Validates create command options using Zod schema
 */
export function validateCreateOptions(options: any): CreateOptions {
  try {
    // Allow empty type to trigger prompting
    const parsedOptions = { ...options };
    if (parsedOptions.type === '') {
      parsedOptions.type = 'project'; // Set default for validation, will be overridden by prompts
    }
    
    return initOptionsSchema.parse(parsedOptions);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const typeError = error.errors.find(
        (e) => e.path.includes('type') && e.code === 'invalid_enum_value'
      );
      if (typeError && 'received' in typeError) {
        const enumError = typeError as z.ZodInvalidEnumValueIssue;
        throw new Error(
          `Invalid type '${enumError.received}'. Expected: ${enumError.options?.join(', ')}`
        );
      }
    }
    throw error;
  }
}

/**
 * Validates a project name according to npm package naming rules.
 * Special case: "." is allowed for current directory projects.
 */
export function validateProjectName(name: string): { isValid: boolean; error?: string } {
  // Special case for current directory
  if (name === '.') {
    return { isValid: true };
  }

  try {
    ProjectNameSchema.parse(name);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid project name' };
  }
}

/**
 * Processes and validates a plugin name.
 */
export function processPluginName(name: string): {
  isValid: boolean;
  processedName?: string;
  error?: string;
} {
  try {
    // Clean the name first
    let processedName = name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!processedName) {
      return { isValid: false, error: 'Plugin name cannot be empty after processing' };
    }

    // Don't remove existing plugin- prefix, just validate
    PluginNameSchema.parse(processedName);
    return { isValid: true, processedName };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid plugin name' };
  }
}

/**
 * Validates that the target directory is empty or doesn't exist.
 */
export async function validateTargetDirectory(
  targetDir: string
): Promise<{ isValid: boolean; error?: string }> {
  try {
    if (!existsSync(targetDir)) {
      return { isValid: true };
    }

    const entries = await fs.readdir(targetDir);
    if (entries.length > 0) {
      const dirName = basename(targetDir);
      return {
        isValid: false,
        error: `Directory "${dirName}" is not empty`,
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: `Failed to validate directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
