import { BaseApiClient } from '../lib/BaseClient';
export class ServerService extends BaseApiClient {
    /**
     * Health check
     */
    async checkHealth() {
        return this.get('/api/server/health');
    }
    /**
     * Simple ping
     */
    async ping() {
        return this.get('/api/server/ping');
    }
    /**
     * Hello endpoint
     */
    async hello() {
        return this.get('/api/server/hello');
    }
    /**
     * Get server status
     */
    async getStatus() {
        return this.get('/api/server/status');
    }
    /**
     * Stop the server
     */
    async stopServer() {
        return this.post('/api/server/stop');
    }
    /**
     * Get runtime debug info
     */
    async getDebugInfo() {
        return this.get('/api/server/servers');
    }
    /**
     * Submit logs
     */
    async submitLogs(logs) {
        return this.post('/api/server/logs', { logs });
    }
    /**
     * Clear logs
     */
    async clearLogs() {
        return this.delete('/api/server/logs');
    }
}
