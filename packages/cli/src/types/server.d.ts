declare module '@elizaos/server' {
  export interface ServerConfig {
    port?: number;
    host?: string;
    apiPrefix?: string;
  }

  export interface ServerInstance {
    start(): Promise<void>;
    stop(): Promise<void>;
    getUrl(): string;
  }

  export function createServer(config?: ServerConfig): ServerInstance;
  export function startServer(config?: ServerConfig): Promise<ServerInstance>;
  const defaultExport: unknown;
  export default defaultExport;
}
