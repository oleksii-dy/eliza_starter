import { customType } from 'drizzle-orm/mysql-core';

/**
 * Represents a custom type for converting a number to a timestamp string and vice versa.
 * @param {Object} options - The options for the custom type.
 * @param {Function} options.dataType - A function that returns the data type as "timestamp".
 * @param {Function} options.toDriver - A function that converts a number to a timestamp string using the Date object's toISOString method.
 * @param {Function} options.fromDriver - A function that converts a timestamp string to a number using the Date object's getTime method.
 * @returns {Object} - The custom type for number to timestamp conversion.
 */
export const numberTimestamp = customType<{ data: number; driverData: string }>({
  dataType() {
    return 'timestamp';
  },
  toDriver(value: number): string {
    // Convert number timestamp to Date object
    const date = new Date(value);
    // Get ISO string (UTC): YYYY-MM-DDTHH:mm:ss.sssZ
    const isoString = date.toISOString();
    // Format for MySQL: YYYY-MM-DD HH:mm:ss
    // Replace 'T' with space, take first 19 chars (removes .sssZ)
    return isoString.replace('T', ' ').slice(0, 19);
  },
  fromDriver(value: string): number {
    return new Date(value).getTime();
  },
});
