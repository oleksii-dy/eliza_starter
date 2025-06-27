// Mock implementation of canvas for testing
import { mock } from 'bun:test';

export class Canvas {
  public width: number;
  public height: number;
  private contextType = '2d';

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext(type: string) {
    if (type === '2d') {
      return {
        putImageData: mock(),
        drawImage: mock(),
        fillRect: mock(),
        clearRect: mock(),
        getImageData: mock().mockReturnValue({
          data: new Uint8ClampedArray(this.width * this.height * 4),
          width: this.width,
          height: this.height,
        }),
        createImageData: mock((width: number, height: number) => ({
          data: new Uint8ClampedArray(width * height * 4),
          width,
          height,
        })),
      };
    }
    return null;
  }

  toBuffer(callback?: (err: Error | null, buffer: Buffer) => void): Buffer;
  toBuffer(type: string, callback?: (err: Error | null, buffer: Buffer) => void): Buffer;
  toBuffer(typeOrCallback?: any, callback?: any): Buffer {
    const buffer = Buffer.alloc(100); // Mock buffer
    if (typeof typeOrCallback === 'function') {
      setTimeout(() => typeOrCallback(null, buffer), 10);
    } else if (callback) {
      setTimeout(() => callback(null, buffer), 10);
    }
    return buffer;
  }
}

export class Image {
  public src: string = '';
  public width: number = 0;
  public height: number = 0;
  public onload?: () => void;
  public onerror?: (err: Error) => void;

  constructor() {
    // Simulate async image loading
    setTimeout(() => {
      this.width = 640;
      this.height = 480;
      if (this.onload) {
        this.onload();
      }
    }, 10);
  }
}

export class ImageData {
  public data: Uint8ClampedArray;
  public width: number;
  public height: number;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}
