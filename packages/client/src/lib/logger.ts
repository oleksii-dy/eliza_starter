// Add client-specific context to logs
const clientLogger = {
  info: (msg: string, ...args: any[]) => {
    console.info({ source: 'client' }, msg, ...args);
  },
  error: (msg: string, ...args: any[]) => {
    console.error({ source: 'client' }, msg, ...args);
  },
  warn: (msg: string, ...args: any[]) => {
    console.warn({ source: 'client' }, msg, ...args);
  },
  debug: (msg: string, ...args: any[]) => {
    console.debug({ source: 'client' }, msg, ...args);
  },
};

export default clientLogger;
