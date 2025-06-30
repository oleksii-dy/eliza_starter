declare module 'bun' {
    export const spawn: any;
    export const write: any;
    export const read: any;
    // Add additional Bun APIs as needed for tests
}

// Global Bun namespace
declare const Bun: any;