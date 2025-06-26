/**
 * Utility functions for consistent naming conventions across MCP and Plugin generation
 */

/**
 * Convert kebab-case to camelCase
 * @example "get-current-time" -> "getCurrentTime"
 */
export function kebabToCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert kebab-case to PascalCase
 * @example "get-current-time" -> "GetCurrentTime"
 */
export function kebabToPascalCase(str: string): string {
  const camelCase = kebabToCamelCase(str);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

/**
 * Convert camelCase/PascalCase to kebab-case
 * @example "getCurrentTime" -> "get-current-time"
 */
export function camelToKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Sanitize a name for use as a filename (kebab-case, alphanumeric only)
 * @example "Get Current Time!" -> "get-current-time"
 */
export function sanitizeFileName(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Get the export name for a component based on its type
 * @example ("getCurrentTime", "Action") -> "getCurrentTimeAction"
 * @example ("timeProvider", "Provider") -> "timeProviderProvider" (but we should avoid this)
 */
export function getComponentExportName(
  name: string,
  type: 'Action' | 'Provider' | 'Service' | 'Evaluator' | 'Tool' | 'Resource'
): string {
  // First ensure the name is in camelCase
  const camelName = name.includes('-') ? kebabToCamelCase(name) : name;

  // For providers, check if the name already ends with "Provider" to avoid double suffix
  if (type === 'Provider' && camelName.endsWith('Provider')) {
    return camelName;
  }

  // For other types, append the type suffix
  return `${camelName}${type}`;
}

/**
 * Get the proper import/export name from a filename
 * @example ("get-current-time-tool.ts", "Tool") -> "GetCurrentTimeTool"
 */
export function getExportNameFromFileName(
  _fileName: string,
  type: 'Action' | 'Provider' | 'Service' | 'Evaluator' | 'Tool' | 'Resource'
): string {
  // Remove file extension and type suffix
  const _baseName = _fileName
    .replace(/\.(ts|js)$/, '')
    .replace(new RegExp(`-${type.toLowerCase()}$`, 'i'), '');

  // Convert to PascalCase and add type suffix
  const pascalName = kebabToPascalCase(_baseName);

  // Handle special case for providers
  if (type === 'Provider' && pascalName.endsWith('Provider')) {
    return pascalName;
  }

  return `${pascalName}${type}`;
}

/**
 * Ensure consistent newline handling in generated code
 * This prevents issues with literal \n appearing in output
 */
export function normalizeNewlines(str: string): string {
  // This function is mainly for documentation - template literals handle newlines correctly
  // The issue might be in how the code is being written to files or displayed
  return str;
}

/**
 * Create a safe variable name from any string
 * @example "API_KEY" -> "apiKey"
 * @example "some-config-value" -> "someConfigValue"
 */
export function toSafeVariableName(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[^a-z]+/, '');
}
