declare module 'node:child_process' {
    import * as cp from 'child_process';
    export = cp;
}

declare module 'node:fs/promises' {
    import * as fsPromises from 'fs/promises';
    export = fsPromises;
}

declare module 'node:path' {
    import * as path from 'path';
    export = path;
}

declare module 'node:os' {
    import * as os from 'os';
    export = os;
}

declare module 'node:fs' {
    import * as fs from 'fs';
    export = fs;
}