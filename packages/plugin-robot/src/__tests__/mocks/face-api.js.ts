// Mock implementation of face-api.js for testing
import { mock } from 'bun:test';

// Mock face detection result
const mockDetection = {
  detection: {
    box: { x: 100, y: 100, width: 200, height: 200 },
    score: 0.95,
  },
  landmarks: {
    positions: Array(68).fill({ x: 0, y: 0 }),
  },
  descriptor: new Float32Array(128).fill(0.5),
  expressions: {
    neutral: 0.8,
    happy: 0.1,
    sad: 0.05,
    angry: 0.05,
    fearful: 0,
    disgusted: 0,
    surprised: 0,
  },
  age: 30,
  gender: 'male',
  genderProbability: 0.9,
};

// Mock nets
export const nets = {
  ssdMobilenetv1: {
    loadFromDisk: mock().mockResolvedValue(undefined),
  },
  faceLandmark68Net: {
    loadFromDisk: mock().mockResolvedValue(undefined),
  },
  faceRecognitionNet: {
    loadFromDisk: mock().mockResolvedValue(undefined),
  },
  faceExpressionNet: {
    loadFromDisk: mock().mockResolvedValue(undefined),
  },
  ageGenderNet: {
    loadFromDisk: mock().mockResolvedValue(undefined),
  },
};

// Mock env
export const env = {
  monkeyPatch: mock(),
};

// Mock detection options
export class SsdMobilenetv1Options {
  constructor(options: any) {}
}

// Mock detection chain
class DetectionChain {
  private detections = [mockDetection];

  withFaceLandmarks() {
    return this;
  }

  withFaceDescriptors() {
    return this;
  }

  withFaceExpressions() {
    return this;
  }

  withAgeAndGender() {
    return Promise.resolve(this.detections);
  }
}

// Mock detectAllFaces
export const detectAllFaces = mock(() => new DetectionChain());

// Mock types
export interface FaceDetection {
  box: { x: number; y: number; width: number; height: number };
  score: number;
}

export interface FaceLandmarks68 {
  positions: Array<{ x: number; y: number }>;
}

export interface FaceExpressions {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}
