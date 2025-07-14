/**
 * Defines a custom type UUID representing a universally unique identifier
 *
 * This type represents a universally unique identifier (UUID) in string format.
 * UUIDs are 128-bit values typically displayed as 32 hexadecimal digits,
 * shown in five groups separated by hyphens: 8-4-4-4-12
 *
 * @example "550e8400-e29b-41d4-a716-446655440000"
 */
export type UUID = `${string}-${string}-${string}-${string}-${string}`;

/**
 * Regular expression for validating UUID format
 *
 * Supports all UUID versions (1-5) and the nil UUID.
 * The pattern validates:
 * - 8 hex digits for time_low
 * - 4 hex digits for time_mid
 * - 4 hex digits for time_hi_and_version (any version)
 * - 4 hex digits for clock_seq_hi_and_reserved and clock_seq_low
 * - 12 hex digits for node
 *
 * Note: This validates format only, not the actual version bits or variant bits.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Loose UUID regex that accepts any hex digits in all positions
 * Used as a fallback for non-standard UUIDs
 */
const UUID_REGEX_LOOSE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Helper function to safely cast a string to strongly typed UUID
 *
 * Validates that a string conforms to the UUID format specification.
 * Accepts both strict UUID v1-5 format and loose format for compatibility.
 *
 * @param id The string UUID to validate and cast
 * @returns The same UUID with branded type information
 * @throws Error if the string is not a valid UUID
 *
 * @example
 * ```typescript
 * const userId = asUUID("550e8400-e29b-41d4-a716-446655440000"); // Valid
 * const invalid = asUUID("not-a-uuid"); // Throws Error
 * ```
 */
export function asUUID(id: string): UUID {
  if (!id) {
    throw new Error(`Invalid UUID format: ${id}`);
  }

  // First try strict validation (proper version and variant bits)
  if (UUID_REGEX.test(id)) {
    return id as UUID;
  }

  // Fall back to loose validation for compatibility
  if (UUID_REGEX_LOOSE.test(id)) {
    return id as UUID;
  }

  throw new Error(`Invalid UUID format: ${id}`);
}

/**
 * Checks if a string is a valid UUID without throwing
 *
 * @param id - The string to check
 * @returns true if the string is a valid UUID, false otherwise
 *
 * @example
 * ```typescript
 * if (isValidUUID(someString)) {
 *   const uuid = asUUID(someString); // Safe to call
 * }
 * ```
 */
export function isValidUUID(id: string): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id) || UUID_REGEX_LOOSE.test(id);
}
