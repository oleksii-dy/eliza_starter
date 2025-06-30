declare module 'bun:test' {
    export function describe(name: string, fn: () => unknown): void;
    export function it(name: string, fn: () => unknown): void;
    export function test(name: string, fn: () => unknown): void;
    export function beforeEach(fn: () => unknown): void;
    export function afterEach(fn: () => unknown): void;
    export function beforeAll(fn: () => unknown): void;
    export function afterAll(fn: () => unknown): void;
    // Rough expect typing; for our purposes `any` is acceptable
    export const expect: any;
}