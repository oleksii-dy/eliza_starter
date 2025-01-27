import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

export const TEST_DB_CONFIG = {
    host: process.env.TEST_DB_HOST || "localhost",
    port: parseInt(process.env.TEST_DB_PORT || "5432"),
    user: process.env.TEST_DB_USER || "myuser",
    password: process.env.TEST_DB_PASSWORD || "mypassword",
    database: `trust_score_test_${uuidv4().replace(/-/g, "_")}`,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

export const getTestDbName = () => TEST_DB_CONFIG.database;
