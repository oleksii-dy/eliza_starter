declare module 'node:child_process' {
    import type { execSync, spawn, ExecSyncOptions, SpawnOptions } from 'child_process';
    export { execSync, spawn };
    export type { ExecSyncOptions, SpawnOptions };
    export * from 'child_process';
    export type * from 'child_process';
}

declare module 'node:fs/promises' {
    import * as fsPromises from 'fs/promises';
    export = fsPromises;
    export type * from 'fs/promises';
}

declare module 'node:path' {
    export * from 'path';
    export type * from 'path';
}

declare module 'node:os' {
    export * from 'os';
    export type * from 'os';
}

declare module 'node:fs' {
    export * from 'fs';
    export type * from 'fs';
}