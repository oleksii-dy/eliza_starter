// Lightweight vision models for object and pose detection
import type { DetectedObject, PersonInfo, BoundingBox } from './types';
import { logger } from '@elizaos/core';

// Type definitions for TensorFlow models
interface Prediction {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

interface Keypoint {
  part: string;
  position: { x: number; y: number };
  score: number;
}

interface Pose {
  keypoints: Keypoint[];
  score: number;
}

export class VisionModels {
  private objectDetectionModel: any = null;
  private poseDetectionModel: any = null;
  private modelsLoaded = false;
  private tf: any = null;

  async initialize(enableObjectDetection: boolean, enablePoseDetection: boolean): Promise<void> {
    if (!enableObjectDetection && !enablePoseDetection) {
      logger.info('[VisionModels] No models enabled, skipping initialization');
      return;
    }

    try {
      logger.info('[VisionModels] Initializing TensorFlow.js models...');

      // Dynamically import TensorFlow
      try {
        // @ts-ignore - Dynamic import of TensorFlow
        this.tf = await import('@tensorflow/tfjs-node');
        logger.info('[VisionModels] TensorFlow.js loaded');
      } catch (error) {
        logger.error('[VisionModels] Failed to load TensorFlow.js:', error);
        throw new Error('TensorFlow.js is required for computer vision features');
      }

      if (enableObjectDetection) {
        logger.info('[VisionModels] Loading COCO-SSD object detection model...');
        try {
          // @ts-ignore - Dynamic import of COCO-SSD
          const cocoSsd = await import('@tensorflow-models/coco-ssd');
          this.objectDetectionModel = await cocoSsd.load({
            base: 'mobilenet_v2',
          });
          logger.info('[VisionModels] ✅ COCO-SSD model loaded');
        } catch (error) {
          logger.error('[VisionModels] Failed to load COCO-SSD:', error);
          throw new Error('Failed to load object detection model');
        }
      }

      if (enablePoseDetection) {
        logger.info('[VisionModels] Loading PoseNet model...');
        try {
          // @ts-ignore - Dynamic import of PoseNet
          const posenet = await import('@tensorflow-models/posenet');
          this.poseDetectionModel = await posenet.load({
            architecture: 'MobileNetV1',
            outputStride: 16,
            inputResolution: { width: 640, height: 480 },
            multiplier: 0.75,
          });
          logger.info('[VisionModels] ✅ PoseNet model loaded');
        } catch (error) {
          logger.error('[VisionModels] Failed to load PoseNet:', error);
          throw new Error('Failed to load pose detection model');
        }
      }

      this.modelsLoaded = true;
      logger.info('[VisionModels] All models initialized successfully');
    } catch (error) {
      logger.error('[VisionModels] Failed to initialize models:', error);
      throw error;
    }
  }

  async detectObjects(imageData: Buffer, width: number, height: number): Promise<DetectedObject[]> {
    if (!this.objectDetectionModel || !this.tf) {
      return [];
    }

    try {
      // Convert RGBA buffer to RGB tensor
      const rgbData = this.rgbaToRgb(imageData);
      const imageTensor = this.tf.tensor3d(rgbData, [height, width, 3], 'int32');

      // Run object detection
      const predictions: Prediction[] = await this.objectDetectionModel.detect(imageTensor);

      // Clean up tensor
      imageTensor.dispose();

      // Convert predictions to our format
      return predictions.map((pred, index) => ({
        id: `obj-${Date.now()}-${index}`,
        type: pred.class,
        confidence: pred.score,
        boundingBox: {
          x: Math.round(pred.bbox[0]),
          y: Math.round(pred.bbox[1]),
          width: Math.round(pred.bbox[2]),
          height: Math.round(pred.bbox[3]),
        },
      }));
    } catch (error) {
      logger.error('[VisionModels] Object detection failed:', error);
      return [];
    }
  }

  async detectPoses(imageData: Buffer, width: number, height: number): Promise<Pose[]> {
    if (!this.poseDetectionModel || !this.tf) {
      return [];
    }

    try {
      // Convert RGBA buffer to RGB tensor
      const rgbData = this.rgbaToRgb(imageData);
      const imageTensor = this.tf.tensor3d(rgbData, [height, width, 3], 'int32');

      // Run pose detection
      const poses: Pose[] = await this.poseDetectionModel.estimateMultiplePoses(imageTensor, {
        flipHorizontal: false,
        maxDetections: 5,
        scoreThreshold: 0.5,
        nmsRadius: 20,
      });

      // Clean up tensor
      imageTensor.dispose();

      return poses;
    } catch (error) {
      logger.error('[VisionModels] Pose detection failed:', error);
      return [];
    }
  }

  convertPosesToPersonInfo(poses: Pose[]): PersonInfo[] {
    return poses.map((pose, index) => {
      const keypoints = pose.keypoints;
      
      // Calculate bounding box from keypoints
      const visibleKeypoints = keypoints.filter(kp => kp.score > 0.5);
      if (visibleKeypoints.length === 0) {
        return null;
      }

      const xs = visibleKeypoints.map(kp => kp.position.x);
      const ys = visibleKeypoints.map(kp => kp.position.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      // Determine pose based on keypoint positions
      const poseType = this.determinePoseType(keypoints);
      const facing = this.determineFacing(keypoints);

      return {
        id: `person-pose-${Date.now()}-${index}`,
        confidence: pose.score,
        pose: poseType,
        facing: facing,
        boundingBox: {
          x: Math.round(minX),
          y: Math.round(minY),
          width: Math.round(maxX - minX),
          height: Math.round(maxY - minY),
        },
        keypoints: keypoints.map(kp => ({
          part: kp.part,
          position: {
            x: Math.round(kp.position.x),
            y: Math.round(kp.position.y),
          },
          score: kp.score,
        })),
      };
    }).filter(person => person !== null) as PersonInfo[];
  }

  private determinePoseType(keypoints: Keypoint[]): 'standing' | 'sitting' | 'lying' | 'unknown' {
    // Get key body parts
    const nose = keypoints.find(kp => kp.part === 'nose');
    const leftHip = keypoints.find(kp => kp.part === 'leftHip');
    const rightHip = keypoints.find(kp => kp.part === 'rightHip');
    const leftKnee = keypoints.find(kp => kp.part === 'leftKnee');
    const rightKnee = keypoints.find(kp => kp.part === 'rightKnee');
    const leftAnkle = keypoints.find(kp => kp.part === 'leftAnkle');
    const rightAnkle = keypoints.find(kp => kp.part === 'rightAnkle');

    if (!nose || (!leftHip && !rightHip)) {
      return 'unknown';
    }

    // Calculate average positions
    const hipY = ((leftHip?.position.y || 0) + (rightHip?.position.y || 0)) / 2;
    const kneeY = ((leftKnee?.position.y || 0) + (rightKnee?.position.y || 0)) / 2;
    const ankleY = ((leftAnkle?.position.y || 0) + (rightAnkle?.position.y || 0)) / 2;

    // Determine pose based on relative positions
    const torsoHeight = Math.abs(nose.position.y - hipY);
    const legHeight = Math.abs(hipY - ankleY);

    if (legHeight > torsoHeight * 1.5) {
      return 'standing';
    } else if (Math.abs(nose.position.y - hipY) < 100) {
      return 'lying';
    } else {
      return 'sitting';
    }
  }

  private determineFacing(keypoints: Keypoint[]): 'camera' | 'away' | 'left' | 'right' | 'unknown' {
    // Get facial keypoints
    const nose = keypoints.find(kp => kp.part === 'nose');
    const leftEye = keypoints.find(kp => kp.part === 'leftEye');
    const rightEye = keypoints.find(kp => kp.part === 'rightEye');
    const leftEar = keypoints.find(kp => kp.part === 'leftEar');
    const rightEar = keypoints.find(kp => kp.part === 'rightEar');

    if (!nose) {
      return 'unknown';
    }

    // Check visibility of facial features
    const leftEyeVisible = leftEye && leftEye.score > 0.5;
    const rightEyeVisible = rightEye && rightEye.score > 0.5;
    const leftEarVisible = leftEar && leftEar.score > 0.5;
    const rightEarVisible = rightEar && rightEar.score > 0.5;

    if (leftEyeVisible && rightEyeVisible) {
      // Both eyes visible - facing camera
      return 'camera';
    } else if (!leftEyeVisible && !rightEyeVisible && (leftEarVisible || rightEarVisible)) {
      // No eyes but ears visible - facing away
      return 'away';
    } else if (leftEyeVisible && !rightEyeVisible) {
      // Only left eye visible - facing right
      return 'right';
    } else if (rightEyeVisible && !leftEyeVisible) {
      // Only right eye visible - facing left
      return 'left';
    }

    return 'unknown';
  }

  private rgbaToRgb(rgbaBuffer: Buffer): Uint8Array {
    const pixelCount = rgbaBuffer.length / 4;
    const rgbData = new Uint8Array(pixelCount * 3);
    
    for (let i = 0; i < pixelCount; i++) {
      const rgbaIndex = i * 4;
      const rgbIndex = i * 3;
      
      rgbData[rgbIndex] = rgbaBuffer[rgbaIndex];     // R
      rgbData[rgbIndex + 1] = rgbaBuffer[rgbaIndex + 1]; // G
      rgbData[rgbIndex + 2] = rgbaBuffer[rgbaIndex + 2]; // B
      // Skip alpha channel
    }
    
    return rgbData;
  }

  isLoaded(): boolean {
    return this.modelsLoaded;
  }

  hasObjectDetection(): boolean {
    return this.objectDetectionModel !== null;
  }

  hasPoseDetection(): boolean {
    return this.poseDetectionModel !== null;
  }
} 