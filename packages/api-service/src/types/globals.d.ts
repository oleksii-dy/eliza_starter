declare global {
  const process: {
    env: Record<string, string | undefined>;
    exit: (code?: number) => never;
    pid: number;
    platform: string;
    argv: string[];
    cwd: () => string;
    uptime: () => number;
    on: (event: string, listener: (...args: any[]) => void) => any;
  };

  const Bun: {
    main?: string;
    serve: (options: any) => any;
    [key: string]: any;
  };

  interface ImportMeta {
    main?: boolean;
  }
}

export {};