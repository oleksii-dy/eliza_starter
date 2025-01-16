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

const stream = pretty({
    colorize: true,
    translateTime: "yyyy-mm-dd HH:MM:ss",
    ignore: "pid,hostname",
});

const options = {
    customLevels,
    hooks: {
        logMethod(
            inputArgs: [string | Record<string, unknown>, ...unknown[]],
            method: LogFn,
            level: string | number
        ): void {
            const [arg1, ...rest] = inputArgs;
            if (typeof arg1 === "object") {
                method.apply(this, [arg1, ...rest]);
            } else {
                method.apply(this, [...rest, arg1]);
            }
        },
    },
};

export const elizaLogger = pino(options, stream);

// const json = { model: "anthropic", whole: "bunch", of: "things" };
// elizaLogger.fatal("Hello World", json);
// elizaLogger.fatal(json, "Hello World");

// elizaLogger.error("Hello World", json);
// elizaLogger.error(json, "Hello World");

// elizaLogger.warn("Hello World", json);
// elizaLogger.warn(json, "Hello World");

// elizaLogger.info("Hello World", json);
// elizaLogger.info(json, "Hello World");

// elizaLogger.log("Hello World", json);
// elizaLogger.log(json, "Hello World");

// elizaLogger.progress("Hello World", json);
// elizaLogger.progress(json, "Hello World");

// elizaLogger.success("Hello World", json);
// elizaLogger.success(json, "Hello World");

// elizaLogger.debug("Hello World", json);
// elizaLogger.debug(json, "Hello World");

// elizaLogger.trace("Hello World", json);
// elizaLogger.trace(json, "Hello World");

// elizaLogger.info([1, 2, 3, 4], "Hello World");
// elizaLogger.info("Hello World", [1, 2, 3, 4]);

export default elizaLogger;
