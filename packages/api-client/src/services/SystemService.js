import { BaseApiClient } from '../lib/BaseClient';
export class SystemService extends BaseApiClient {
  /**
   * Retrieve the local environment variables from the ElizaOS server.
   *
   * Server route (packages/server/src/api/system):
   *   GET /api/system/env/local  ->  { success: true, data: Record<string,string> }
   */
  async getEnvironment() {
    return this.get('/api/system/env/local');
  }
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
  async updateLocalEnvironment(params) {
    if (!params || typeof params !== 'object') {
      throw new Error('updateLocalEnvironment requires a configuration object');
    }
    let body;
    if ('variables' in params) {
      body = { content: params.variables };
    } else if ('content' in params) {
      body = { content: params.content };
    } else {
      // Treat params itself as record of env vars
      body = { content: params };
    }
    return this.post('/api/system/env/local', body);
  }
}
