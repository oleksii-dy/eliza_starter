import { AsyncLocalStorage } from "async_hooks";
import { inspect } from "util";
import { v4 as uuidv4 } from "uuid";

export type ITrace = (run: number | null, time: Date, name: string, data: any) => void;

export function generateRunUUID(): string {
    return uuidv4();
}

export class Instrumentation {
    private static store = new AsyncLocalStorage<Instrumentation>();
    private static tracer: ITrace = null;
    private run: string = null;

    static init(tracer: ITrace) {
        this.tracer = tracer;
    }

    static trace(name: string, data: any) {
        if (!this.tracer) return;
        var jsonPayload;
        try {
            jsonPayload = JSON.stringify(data);
        } catch (error) {
            name = `ERROR: ${name}`;
            jsonPayload = {ok: false, name: name, error: `${error}, inspect: ${inspect(data)}`};
            console.log(`Could not convert object to JSON for ${name}. Please select individual fields that are serializable.`);
            console.log(data);
        }
        const instance = this.store.getStore();
        const run = instance.run;
        const time = new Date();
        (async () => {
            await this.tracer(run, time, name, jsonPayload);
        })();
    }

    static run(f: () => any, run?: string | null): any {
        const i = new Instrumentation();
        if (run === undefined) run = null;
        i.run = run;
        return this.store.run(i, f);
    }
}
