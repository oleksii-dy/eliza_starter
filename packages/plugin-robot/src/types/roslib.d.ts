declare module 'roslib' {
  export class Ros {
    constructor(options: { url: string });

    on(event: 'connection', listener: () => void): void;
    on(event: 'error', listener: (error: Error) => void): void;
    on(event: 'close', listener: () => void): void;

    close(): void;

    getTopics(
      callback: (topics: { topics: string[]; types: string[] }) => void,
      failedCallback?: (error: Error) => void
    ): void;

    getServices(
      callback: (services: string[]) => void,
      failedCallback?: (error: Error) => void
    ): void;
  }

  export class Topic {
    constructor(options: { ros: Ros; name: string; messageType: string });

    subscribe(callback: (message: any) => void): void;
    unsubscribe(): void;
    publish(message: Message): void;
  }

  export class Service {
    constructor(options: { ros: Ros; name: string; serviceType: string });

    callService(
      request: ServiceRequest,
      callback: (response: any) => void,
      failedCallback?: (error: Error) => void
    ): void;
  }

  export class Message {
    constructor(values: any);
  }

  export class ServiceRequest {
    constructor(values: any);
  }
}
