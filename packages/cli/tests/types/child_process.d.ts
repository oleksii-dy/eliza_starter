declare module 'child_process' {
    export interface ExecSyncOptions {
        timeout?: number;
        killSignal?: string;
        windowsHide?: boolean;
        env?: Record<string, string | undefined>;
        encoding?: string | null;
        stdio?: any;
    }

    export interface SpawnOptions {
        stdio?: any;
        windowsHide?: boolean;
        env?: Record<string, string | undefined>;
    }

    export function execSync(command: string, options?: ExecSyncOptions): string | Buffer;
    export function spawn(
        command: string,
        args?: string[],
        options?: SpawnOptions
    ): any;
}