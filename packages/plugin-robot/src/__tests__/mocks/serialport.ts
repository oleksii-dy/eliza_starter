// Mock implementation of serialport for testing without hardware
import { EventEmitter } from 'events';
import { mock } from 'bun:test';

export class SerialPort extends EventEmitter {
  public path: string;
  public baudRate: number;
  public isOpen: boolean = false;
  private mockBuffer: Buffer[] = [];

  constructor(options: { path: string; baudRate: number }) {
    super();
    this.path = options.path;
    this.baudRate = options.baudRate;

    // Simulate async open
    setTimeout(() => {
      this.isOpen = true;
      this.emit('open');
    }, 100);
  }

  write(data: Buffer | string, callback?: (error?: Error | null) => void): void {
    if (!this.isOpen) {
      if (callback) {
        callback(new Error('Port not open'));
      }
      return;
    }

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    this.mockBuffer.push(buffer);

    // Simulate successful write
    if (callback) {
      setTimeout(() => callback(null), 10);
    }

    // Simulate echo response for testing
    if (buffer[0] === 0x55 && buffer[1] === 0x55) {
      setTimeout(() => {
        this.emit('data', Buffer.from([0x55, 0x55, 0x01, 0x00])); // ACK
      }, 20);
    }
  }

  close(callback?: (error?: Error | null) => void): void {
    this.isOpen = false;
    this.emit('close');
    if (callback) {
      callback(null);
    }
  }

  // Mock static methods
  static list = mock().mockResolvedValue([
    { path: '/dev/ttyUSB0', manufacturer: 'Mock USB Serial' },
    { path: '/dev/ttyUSB1', manufacturer: 'Mock USB Serial' },
  ]);
}

// Export mock parser as a class
export class ReadlineParser extends EventEmitter {
  constructor(options?: { delimiter?: string }) {
    super();
  }

  // Simulate data parsing
  write(data: Buffer): void {
    // For testing, just emit the data as a line
    this.emit('data', data.toString());
  }
}
