import type { DetectedObject, PersonInfo } from './types';
import { logger } from '@elizaos/core';

/**
 * Enhanced heuristics-based vision models for Phase 2
 * This provides improved object and person detection without requiring TensorFlow.js
 */
export class VisionModelsEnhanced {
  private initialized = false;
  private objectDetectionEnabled = false;
  private poseDetectionEnabled = false;

  async initialize(enableObjectDetection: boolean, enablePoseDetection: boolean): Promise<void> {
    this.objectDetectionEnabled = enableObjectDetection;
    this.poseDetectionEnabled = enablePoseDetection;

    if (enableObjectDetection || enablePoseDetection) {
      logger.info('[VisionModelsEnhanced] Initializing enhanced heuristics models...');
      this.initialized = true;
      logger.info('[VisionModelsEnhanced] Enhanced vision models initialized');
    }
  }

  async detectObjects(
    _imageData: Buffer,
    width: number,
    height: number,
    vlmDescription?: string
  ): Promise<DetectedObject[]> {
    if (!this.objectDetectionEnabled || !this.initialized) {
      return [];
    }

    const objects: DetectedObject[] = [];

    try {
      // Use VLM description to guide object detection
      if (vlmDescription) {
        objects.push(...this.extractObjectsFromDescription(vlmDescription, width, height));
      }

      logger.debug(`[VisionModelsEnhanced] Detected ${objects.length} objects`);
    } catch (error) {
      logger.error('[VisionModelsEnhanced] Object detection error:', error);
    }

    return objects;
  }

  async detectPoses(
    _imageData: Buffer,
    width: number,
    height: number,
    vlmDescription?: string
  ): Promise<PersonInfo[]> {
    if (!this.poseDetectionEnabled || !this.initialized) {
      return [];
    }

    const people: PersonInfo[] = [];

    try {
      // Extract people from VLM description
      if (vlmDescription) {
        people.push(...this.extractPeopleFromDescription(vlmDescription, width, height));
      }

      logger.debug(`[VisionModelsEnhanced] Detected ${people.length} people`);
    } catch (error) {
      logger.error('[VisionModelsEnhanced] Pose detection error:', error);
    }

    return people;
  }

  private extractObjectsFromDescription(
    description: string,
    width: number,
    height: number
  ): DetectedObject[] {
    const objects: DetectedObject[] = [];
    const lowerDesc = description.toLowerCase();

    // Common object patterns
    const objectPatterns = [
      { pattern: /monitor|screen|display/, type: 'monitor' },
      { pattern: /laptop|notebook/, type: 'laptop' },
      { pattern: /keyboard/, type: 'keyboard' },
      { pattern: /mouse/, type: 'mouse' },
      { pattern: /phone|smartphone/, type: 'cell phone' },
      { pattern: /headphones|headset/, type: 'headphones' },
      { pattern: /glass|cup|mug/, type: 'cup' },
      { pattern: /bottle/, type: 'bottle' },
      { pattern: /desk|table/, type: 'desk' },
      { pattern: /chair/, type: 'chair' },
      { pattern: /notepad|notebook/, type: 'book' },
      { pattern: /pen|pencil/, type: 'pen' },
    ];

    for (const { pattern, type } of objectPatterns) {
      if (pattern.test(lowerDesc)) {
        // Estimate position based on typical layouts
        const position = this.estimateObjectPosition(type, width, height);
        objects.push({
          id: `vlm-obj-${type}-${Date.now()}`,
          type,
          confidence: 0.8, // High confidence from VLM
          boundingBox: position,
        });
      }
    }

    return objects;
  }

  private extractPeopleFromDescription(
    description: string,
    width: number,
    height: number
  ): PersonInfo[] {
    const people: PersonInfo[] = [];
    const lowerDesc = description.toLowerCase();

    // Check if person is mentioned
    if (
      lowerDesc.includes('person') ||
      lowerDesc.includes('individual') ||
      lowerDesc.includes('someone')
    ) {
      // Extract pose information
      let pose: 'sitting' | 'standing' | 'lying' | 'unknown' = 'unknown';
      if (lowerDesc.includes('sitting') || lowerDesc.includes('seated')) {
        pose = 'sitting';
      } else if (lowerDesc.includes('standing')) {
        pose = 'standing';
      } else if (lowerDesc.includes('lying')) {
        pose = 'lying';
      }

      // Extract facing direction
      let facing: 'camera' | 'away' | 'left' | 'right' | 'unknown' = 'unknown';
      if (lowerDesc.includes('facing') && lowerDesc.includes('camera')) {
        facing = 'camera';
      } else if (lowerDesc.includes('facing away')) {
        facing = 'away';
      } else if (lowerDesc.includes('profile') || lowerDesc.includes('side')) {
        facing = lowerDesc.includes('left') ? 'left' : 'right';
      }

      // Estimate position (typically center-ish for a person at a desk)
      const boundingBox = {
        x: Math.round(width * 0.3),
        y: Math.round(height * 0.2),
        width: Math.round(width * 0.4),
        height: Math.round(height * 0.6),
      };

      people.push({
        id: `vlm-person-${Date.now()}`,
        pose,
        facing,
        confidence: 0.85,
        boundingBox,
      });
    }

    return people;
  }

  private estimateObjectPosition(type: string, width: number, height: number) {
    // Typical positions for common objects in a desk setup
    const positions: Record<string, { x: number; y: number; w: number; h: number }> = {
      monitor: { x: 0.3, y: 0.1, w: 0.4, h: 0.3 },
      laptop: { x: 0.35, y: 0.5, w: 0.3, h: 0.2 },
      keyboard: { x: 0.3, y: 0.7, w: 0.4, h: 0.1 },
      mouse: { x: 0.7, y: 0.7, w: 0.1, h: 0.1 },
      'cell phone': { x: 0.1, y: 0.6, w: 0.1, h: 0.05 },
      headphones: { x: 0.2, y: 0.3, w: 0.15, h: 0.15 },
      cup: { x: 0.8, y: 0.5, w: 0.1, h: 0.1 },
      desk: { x: 0.1, y: 0.5, w: 0.8, h: 0.5 },
      chair: { x: 0.3, y: 0.6, w: 0.4, h: 0.4 },
    };

    const pos = positions[type] || { x: 0.4, y: 0.4, w: 0.2, h: 0.2 };

    return {
      x: Math.round(width * pos.x),
      y: Math.round(height * pos.y),
      width: Math.round(width * pos.w),
      height: Math.round(height * pos.h),
    };
  }

  // Compatibility methods
  convertPosesToPersonInfo(poses: any[]): PersonInfo[] {
    return poses;
  }

  isLoaded(): boolean {
    return this.initialized;
  }

  hasObjectDetection(): boolean {
    return this.objectDetectionEnabled;
  }

  hasPoseDetection(): boolean {
    return this.poseDetectionEnabled;
  }
}
