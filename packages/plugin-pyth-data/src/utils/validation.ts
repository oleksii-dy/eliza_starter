import { elizaLogger } from "@elizaos/core";
import { DataError, PythErrorCode, ErrorSeverity } from "../error";
import Ajv, { ErrorObject } from "ajv";

const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    coerceTypes: true,
    useDefaults: true
});

/**
 * Validates data against a JSON schema
 * @param data Data to validate
 * @param schema JSON schema to validate against
 * @returns Promise<boolean> True if validation succeeds
 * @throws DataError if validation fails
 */
export async function validateSchema(data: unknown, schema: object): Promise<boolean> {
    try {
        const validate = ajv.compile(schema);
        const valid = validate(data);

        if (!valid) {
            const errors = validate.errors || [];
            elizaLogger.error("Schema validation failed", {
                errors,
                data,
                schema
            });

            throw new DataError(
                PythErrorCode.DATA_VALIDATION_FAILED,
                "Schema validation failed",
                ErrorSeverity.HIGH,
                {
                    errors: errors.map((err: ErrorObject) => ({
                        path: err.schemaPath,
                        message: err.message,
                        params: err.params
                    })),
                    data,
                    schema
                }
            );
        }

        return true;
    } catch (error) {
        if (error instanceof DataError) {
            throw error;
        }

        elizaLogger.error("Validation error", {
            error: error instanceof Error ? error.message : String(error),
            data,
            schema
        });

        throw new DataError(
            PythErrorCode.DATA_SCHEMA_ERROR,
            "Schema validation error",
            ErrorSeverity.HIGH,
            {
                error: error instanceof Error ? error.message : String(error),
                data,
                schema
            }
        );
    }
}

/**
 * Validates a symbol string format
 * @param symbol Symbol to validate
 * @returns boolean True if symbol is valid
 */
export function validateSymbol(symbol: string): boolean {
    return /^[A-Z0-9/]+$/.test(symbol);
}

/**
 * Validates a timestamp is within acceptable range
 * @param timestamp Timestamp to validate
 * @param maxAge Maximum age in milliseconds
 * @returns boolean True if timestamp is valid
 */
export function validateTimestamp(timestamp: number, maxAge?: number): boolean {
    const now = Date.now();
    if (timestamp > now) return false;
    if (maxAge && (now - timestamp) > maxAge) return false;
    return true;
}

/**
 * Validates price data format
 * @param price Price data to validate
 * @returns boolean True if price data is valid
 */
export function validatePriceData(price: {
    price: string | number;
    confidence: string | number;
    timestamp: number;
}): boolean {
    // Price and confidence must be positive numbers
    const priceNum = typeof price.price === 'string' ? parseFloat(price.price) : price.price;
    const confNum = typeof price.confidence === 'string' ? parseFloat(price.confidence) : price.confidence;
    
    if (isNaN(priceNum) || priceNum < 0) return false;
    if (isNaN(confNum) || confNum < 0 || confNum > 1) return false;
    
    // Timestamp must be valid
    return validateTimestamp(price.timestamp);
} 