import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env file
config({ path: resolve(__dirname, "../../../.env") });

// Add global test setup here if needed
beforeAll(() => {
    // Verify required environment variables
    const requiredEnvVars = ["COVALENT_API_KEY"];
    const missing = requiredEnvVars.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(", ")}`
        );
    }
});
