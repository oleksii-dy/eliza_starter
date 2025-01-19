import { AsyncLocalStorage } from "async_hooks";

export type ITrace = (arg0: number, arg1: Date, arg2: string, arg3: any) => any;

export class Instrumentation {
    private static store = new AsyncLocalStorage<Instrumentation>();
    private static tracer: ITrace = null;

    static init(tracer: ITrace) {
        this.tracer = tracer;
    }

    static trace(name: string, payload: any) {
        if (!this.tracer) return;
        const instance = this.store.getStore();
        const run = 0;
        const time = new Date();
        (async () => {
            await this.tracer(run, time, name, payload);
        })();
    }

    static run(f: () => any): any {
        const i = new Instrumentation();
        return this.store.run(i, f);
    }
}
