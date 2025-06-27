import { BaseApiClient } from '../lib/BaseClient';
import { LocalEnvironmentUpdateParams } from '../types/system';
export declare class SystemService extends BaseApiClient {
    /**
     * Retrieve the local environment variables from the ElizaOS server.
     *
     * Server route (packages/server/src/api/system):
     *   GET /api/system/env/local  ->  { success: true, data: Record<string,string> }
     */
    getEnvironment(): Promise<Record<string, string>>;
    /**
     * Update (overwrite or merge) the local .env file on the ElizaOS server.
     *
     * Server route (packages/server/src/api/system):
     *   POST /api/system/env/local  ->  { success: true, message: string }
     *   Body: { content: Record<string,string> }
     *
     * For developer-ergonomics we accept several shapes:
     *   1. { variables: Record<string,string>; merge?: boolean }
     *   2. { content:   Record<string,string> }      (server-native)
     *   3. Record<string,string>                      (shorthand)
     */
    updateLocalEnvironment(params: LocalEnvironmentUpdateParams | {
        content: Record<string, string>;
    } | Record<string, string>): Promise<{
        success: boolean;
        message: string;
    }>;
}
