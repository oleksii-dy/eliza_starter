declare module 'serialport' {
  export interface OpenOptions {
    path: string;
    baudRate: number;
    dataBits?: 8 | 7 | 6 | 5;
    stopBits?: 1 | 2;
    parity?: 'none' | 'even' | 'mark' | 'odd' | 'space';
    autoOpen?: boolean;
  }

  export class SerialPort {
    constructor(options: OpenOptions);
    
    open(callback?: (err: Error | null) => void): void;
    close(callback?: (err: Error | null) => void): void;
    write(data: string | Buffer, callback?: (err: Error | null) => void): void;
    
    on(event: 'open', listener: () => void): this;
    on(event: 'data', listener: (data: Buffer) => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
  }
} 