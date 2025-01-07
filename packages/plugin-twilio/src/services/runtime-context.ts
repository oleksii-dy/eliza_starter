export class RuntimeContext {
    private static instance: any;

    static setRuntime(runtime: any) {
        this.instance = runtime;
    }

    static getRuntime() {
        return this.instance;
    }
}