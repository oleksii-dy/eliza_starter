import pino, { LogFn } from "pino";
import pretty from "pino-pretty";

const customLevels: Record<string, number> = {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    log: 29,
    progress: 28,
    success: 27,
    debug: 20,
    trace: 10,
};

const raw = process?.env?.LOG_JSON_FORMAT ? true : false;

const createStream = () => {
    if (raw) {
        return undefined;
    }
    return pretty({
        colorize: true,
        translateTime: "yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
    });
};

const options = {
    customLevels,
    hooks: {
        logMethod(
            inputArgs: [string | Record<string, unknown>, ...unknown[]],
            method: LogFn
        ): void {
            const [arg1, ...rest] = inputArgs;
            if (typeof arg1 === "object") {
                return method.apply(this, [arg1, ...rest]);
            } else {
                return method.apply(this, [...rest, arg1]);
            }
        },
    },
};

export const elizaLogger = pino(options, createStream());

export default elizaLogger;
