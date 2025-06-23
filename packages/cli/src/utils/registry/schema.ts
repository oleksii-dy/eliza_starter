// src/utils/registry/schema.ts
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

export const registrySchema = z.record(z.string(), z.string());

/**
 * Defines the possible types of plugins:
 * - "adapter"
 * - "client"
 * - "plugin"
 */
export type PluginType = 'adapter' | 'client' | 'plugin';

// TODO: we should handle this better later
/**
 * Function that determines the type of plugin based on the name provided.
 * @param {string} name - The name of the plugin.
 * @returns {PluginType} The type of plugin ('adapter', 'client', or 'plugin').
 */
export function getPluginType(
  pkgOrPathOrName: Record<string, any> | string
): PluginType {
  let pkg: Record<string, any> | undefined;

  if (typeof pkgOrPathOrName === 'string') {
    const pkgPath = path.join(pkgOrPathOrName, 'package.json');
    try {
      const content = fs.readFileSync(pkgPath, 'utf8');
      pkg = JSON.parse(content);
    } catch {
      // treat string as package name only
    }
  } else {
    pkg = pkgOrPathOrName;
  }

  if (pkg) {
    const keywords = pkg.keywords || [];
    const pkgType = pkg.packageType;
    const agentType = pkg.agentConfig?.pluginType as string | undefined;

    if (
      pkgType === 'adapter' ||
      keywords.includes('adapter') ||
      agentType?.includes('adapter')
    ) {
      return 'adapter';
    }

    if (
      pkgType === 'client' ||
      keywords.includes('client') ||
      agentType?.includes('client')
    ) {
      return 'client';
    }

    if (
      pkgType === 'plugin' ||
      keywords.includes('plugin') ||
      agentType?.includes('plugin')
    ) {
      return 'plugin';
    }

    if (pkg.name) {
      if (/sql/.test(pkg.name)) return 'adapter';
      if (/discord|twitter|telegram/.test(pkg.name)) return 'client';
    }
  } else if (typeof pkgOrPathOrName === 'string') {
    const name = pkgOrPathOrName;
    if (/sql/.test(name)) return 'adapter';
    if (/discord|twitter|telegram/.test(name)) return 'client';
  }

  return 'plugin';
}

/**
 * Type definition for the Registry type which is inferred from the registrySchema
 */
export type Registry = z.infer<typeof registrySchema>;
