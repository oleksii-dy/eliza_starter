declare module 'node:child_process' {
    import type { execSync, spawn, ExecSyncOptions, SpawnOptions } from 'child_process';
    export { execSync, spawn };
    export type { ExecSyncOptions, SpawnOptions };
    export * from 'child_process';
    export type * from 'child_process';
}

declare module 'node:fs/promises' {
    import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
    export { mkdtemp, rm, writeFile, mkdir };
    export * from 'fs/promises';
    export type * from 'fs/promises';
}

declare module 'node:path' {
    import { join, relative, basename, dirname } from 'path';
    export { join, relative, basename, dirname };
    export * from 'path';
    export type * from 'path';
}

declare module 'node:os' {
    import { tmpdir, platform } from 'os';
    export { tmpdir, platform };
    export * from 'os';
    export type * from 'os';
}

declare module 'node:fs' {
    import { readFileSync, existsSync, writeFileSync, rmSync, mkdirSync } from 'fs';
    export { readFileSync, existsSync, writeFileSync, rmSync, mkdirSync };
    export * from 'fs';
    export type * from 'fs';
}