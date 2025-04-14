declare module '@hapi/shot' {
    interface ShotRequestOptions {
        method?: string;
        url?: string;
        headers?: Record<string, string>;
        payload?: any;
        remoteAddress?: string;
    }

    interface ShotResponse {
        statusCode: number;
        headers: Record<string, string>;
        payload: string;
        raw: {
            req: any;
            res: any;
        };
    }

    function inject(dispatchFunc: (req: any, res: any) => void, options: ShotRequestOptions): Promise<ShotResponse>;

    export = {
        inject
    };

    // Minimal type definitions for @hapi/shot
    export function inject(handler: any, options: any): Promise<any>;

    // This is a minimal declaration file to satisfy TypeScript
    // It doesn't need to be complete, just enough to prevent compilation errors
    const shot: any;
    export default shot;
} 