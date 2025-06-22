import { z } from 'zod';
import { logger } from '@elizaos/core';
import type { VisionConfig, VisionMode } from './types';

// Configuration schema using Zod for validation
export const VisionConfigSchema = z.object({
  // Camera configuration
  cameraName: z.string().optional(),
  enableCamera: z.boolean().default(true),
  
  // Vision processing
  pixelChangeThreshold: z.number().min(0).max(100).default(50),
  updateInterval: z.number().min(10).max(10000).default(100),
  
  // Object detection
  enableObjectDetection: z.boolean().default(false),
  objectConfidenceThreshold: z.number().min(0).max(1).default(0.5),
  
  // Pose detection
  enablePoseDetection: z.boolean().default(false),
  poseConfidenceThreshold: z.number().min(0).max(1).default(0.5),
  
  // Update intervals
  tfUpdateInterval: z.number().min(100).max(60000).default(1000),
  vlmUpdateInterval: z.number().min(1000).max(300000).default(10000),
  tfChangeThreshold: z.number().min(0).max(100).default(10),
  vlmChangeThreshold: z.number().min(0).max(100).default(50),
  
  // Vision mode
  visionMode: z.enum(['OFF', 'CAMERA', 'SCREEN', 'BOTH']).default('CAMERA'),
  
  // Screen capture
  screenCaptureInterval: z.number().min(100).max(60000).default(2000),
  tileSize: z.number().min(64).max(1024).default(256),
  tileProcessingOrder: z.enum(['sequential', 'priority', 'random']).default('priority'),
  maxConcurrentTiles: z.number().min(1).max(10).default(3),
  
  // OCR configuration
  ocrEnabled: z.boolean().default(true),
  ocrLanguage: z.string().default('eng'),
  ocrConfidenceThreshold: z.number().min(0).max(100).default(60),
  
  // Florence-2 configuration
  florence2Enabled: z.boolean().default(true),
  florence2Provider: z.enum(['local', 'azure', 'huggingface', 'replicate']).optional(),
  florence2Endpoint: z.string().url().optional(),
  florence2ApiKey: z.string().optional(),
  florence2Timeout: z.number().min(1000).max(300000).default(30000),
  
  // Face recognition
  enableFaceRecognition: z.boolean().default(false),
  faceMatchThreshold: z.number().min(0).max(1).default(0.6),
  maxFaceProfiles: z.number().min(10).max(10000).default(1000),
  
  // Entity tracking
  entityTimeout: z.number().min(1000).max(300000).default(30000),
  maxTrackedEntities: z.number().min(10).max(1000).default(100),
  
  // Performance
  enableGPUAcceleration: z.boolean().default(true),
  maxMemoryUsageMB: z.number().min(100).max(8000).default(2000),
  
  // Logging
  debugMode: z.boolean().default(false),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type VisionConfigInput = z.input<typeof VisionConfigSchema>;
export type VisionConfigOutput = z.output<typeof VisionConfigSchema>;

export class ConfigurationManager {
  private config: VisionConfigOutput;
  private runtime: any;
  
  constructor(runtime: any) {
    this.runtime = runtime;
    this.config = this.loadConfiguration();
  }
  
  private loadConfiguration(): VisionConfigOutput {
    // Load from environment variables and runtime settings
    const rawConfig: Partial<VisionConfigInput> = {
      // Camera
      cameraName: this.getSetting('CAMERA_NAME') || this.getSetting('VISION_CAMERA_NAME'),
      enableCamera: this.getBooleanSetting('ENABLE_CAMERA', true),
      
      // Vision processing
      pixelChangeThreshold: this.getNumberSetting('PIXEL_CHANGE_THRESHOLD', 50),
      updateInterval: this.getNumberSetting('UPDATE_INTERVAL', 100),
      
      // Object detection
      enableObjectDetection: this.getBooleanSetting('ENABLE_OBJECT_DETECTION', false),
      objectConfidenceThreshold: this.getNumberSetting('OBJECT_CONFIDENCE_THRESHOLD', 0.5),
      
      // Pose detection
      enablePoseDetection: this.getBooleanSetting('ENABLE_POSE_DETECTION', false),
      poseConfidenceThreshold: this.getNumberSetting('POSE_CONFIDENCE_THRESHOLD', 0.5),
      
      // Update intervals
      tfUpdateInterval: this.getNumberSetting('TF_UPDATE_INTERVAL', 1000),
      vlmUpdateInterval: this.getNumberSetting('VLM_UPDATE_INTERVAL', 10000),
      tfChangeThreshold: this.getNumberSetting('TF_CHANGE_THRESHOLD', 10),
      vlmChangeThreshold: this.getNumberSetting('VLM_CHANGE_THRESHOLD', 50),
      
      // Vision mode
      visionMode: this.getSetting('VISION_MODE') as VisionMode,
      
      // Screen capture
      screenCaptureInterval: this.getNumberSetting('SCREEN_CAPTURE_INTERVAL', 2000),
      tileSize: this.getNumberSetting('TILE_SIZE', 256),
      tileProcessingOrder: this.getSetting('TILE_PROCESSING_ORDER') as any,
      maxConcurrentTiles: this.getNumberSetting('MAX_CONCURRENT_TILES', 3),
      
      // OCR
      ocrEnabled: this.getBooleanSetting('OCR_ENABLED', true),
      ocrLanguage: this.getSetting('OCR_LANGUAGE') || 'eng',
      ocrConfidenceThreshold: this.getNumberSetting('OCR_CONFIDENCE_THRESHOLD', 60),
      
      // Florence-2
      florence2Enabled: this.getBooleanSetting('FLORENCE2_ENABLED', true),
      florence2Provider: this.getSetting('FLORENCE2_PROVIDER') as any,
      florence2Endpoint: this.getSetting('FLORENCE2_ENDPOINT'),
      florence2ApiKey: this.getSetting('FLORENCE2_API_KEY'),
      florence2Timeout: this.getNumberSetting('FLORENCE2_TIMEOUT', 30000),
      
      // Face recognition
      enableFaceRecognition: this.getBooleanSetting('ENABLE_FACE_RECOGNITION', false),
      faceMatchThreshold: this.getNumberSetting('FACE_MATCH_THRESHOLD', 0.6),
      maxFaceProfiles: this.getNumberSetting('MAX_FACE_PROFILES', 1000),
      
      // Entity tracking
      entityTimeout: this.getNumberSetting('ENTITY_TIMEOUT', 30000),
      maxTrackedEntities: this.getNumberSetting('MAX_TRACKED_ENTITIES', 100),
      
      // Performance
      enableGPUAcceleration: this.getBooleanSetting('ENABLE_GPU_ACCELERATION', true),
      maxMemoryUsageMB: this.getNumberSetting('MAX_MEMORY_USAGE_MB', 2000),
      
      // Logging
      debugMode: this.getBooleanSetting('DEBUG_MODE', false),
      logLevel: this.getSetting('LOG_LEVEL') as any || 'info',
    };
    
    // Validate and parse configuration
    try {
      const parsed = VisionConfigSchema.parse(rawConfig);
      logger.info('[ConfigurationManager] Configuration loaded successfully');
      
      if (parsed.debugMode) {
        logger.debug('[ConfigurationManager] Configuration:', parsed);
      }
      
      return parsed;
    } catch (error) {
      logger.error('[ConfigurationManager] Invalid configuration:', error);
      if (error instanceof z.ZodError) {
        logger.error('[ConfigurationManager] Validation errors:', error.errors);
      }
      
      // Return default configuration on error
      return VisionConfigSchema.parse({});
    }
  }
  
  private getSetting(key: string): string | undefined {
    // Try with VISION_ prefix first
    const visionKey = `VISION_${key}`;
    const value = this.runtime.getSetting(visionKey) || this.runtime.getSetting(key);
    return value || undefined;
  }
  
  private getBooleanSetting(key: string, defaultValue: boolean): boolean {
    const value = this.getSetting(key);
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  }
  
  private getNumberSetting(key: string, defaultValue: number): number {
    const value = this.getSetting(key);
    if (value === undefined) return defaultValue;
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  // Public API
  get(): VisionConfigOutput {
    return { ...this.config };
  }
  
  update(updates: Partial<VisionConfigInput>): void {
    try {
      const newConfig = { ...this.config, ...updates };
      const parsed = VisionConfigSchema.parse(newConfig);
      this.config = parsed;
      logger.info('[ConfigurationManager] Configuration updated');
    } catch (error) {
      logger.error('[ConfigurationManager] Failed to update configuration:', error);
      throw error;
    }
  }
  
  // Convert to legacy VisionConfig format for backward compatibility
  toLegacyFormat(): VisionConfig {
    return {
      cameraName: this.config.cameraName,
      pixelChangeThreshold: this.config.pixelChangeThreshold,
      updateInterval: this.config.updateInterval,
      enableObjectDetection: this.config.enableObjectDetection,
      enablePoseDetection: this.config.enablePoseDetection,
      tfUpdateInterval: this.config.tfUpdateInterval,
      vlmUpdateInterval: this.config.vlmUpdateInterval,
      tfChangeThreshold: this.config.tfChangeThreshold,
      vlmChangeThreshold: this.config.vlmChangeThreshold,
      visionMode: this.config.visionMode as VisionMode,
      screenCaptureInterval: this.config.screenCaptureInterval,
      tileSize: this.config.tileSize,
      tileProcessingOrder: this.config.tileProcessingOrder,
      ocrEnabled: this.config.ocrEnabled,
      florence2Enabled: this.config.florence2Enabled,
    };
  }
  
  // Configuration presets
  static getPreset(name: string): Partial<VisionConfigInput> {
    const presets: Record<string, Partial<VisionConfigInput>> = {
      'high-performance': {
        updateInterval: 50,
        tfUpdateInterval: 500,
        vlmUpdateInterval: 5000,
        enableGPUAcceleration: true,
        maxConcurrentTiles: 5,
      },
      'low-resource': {
        updateInterval: 200,
        tfUpdateInterval: 2000,
        vlmUpdateInterval: 20000,
        enableObjectDetection: false,
        enablePoseDetection: false,
        maxMemoryUsageMB: 500,
        maxConcurrentTiles: 1,
      },
      'security-monitoring': {
        enableObjectDetection: true,
        enablePoseDetection: true,
        enableFaceRecognition: true,
        updateInterval: 100,
        entityTimeout: 60000,
      },
      'screen-reader': {
        visionMode: 'SCREEN',
        ocrEnabled: true,
        florence2Enabled: true,
        screenCaptureInterval: 1000,
        tileProcessingOrder: 'priority',
      },
    };
    
    return presets[name] || {};
  }
}

// Robot hardware configuration
export interface RobotHardwareConfig {
  serialPort: string;
  baudRate: number;
  updateRateHz: number;
  imuUpdateRateHz: number;
}

// Joint configuration
export interface JointConfig {
  name: string;
  servoId: number;
  minPosition: number; // radians
  maxPosition: number; // radians
  maxVelocity: number; // rad/s
  maxAcceleration: number; // rad/s²
  defaultPosition: number; // radians
}

// Safety configuration
export interface SafetyConfig {
  maxJointVelocity: number; // rad/s
  maxJointAcceleration: number; // rad/s²
  emergencyStopAcceleration: number; // rad/s²
  fallDetectionThreshold: number; // g-force
  temperatureLimit: number; // Celsius
  currentLimit: number; // Amps
  collisionDetectionEnabled: boolean;
}

// Simulation configuration
export interface SimulationConfig {
  rosWebsocketUrl: string;
  updateRateHz: number;
  physicsStepSize: number; // seconds
  gravityCompensation: boolean;
}

// Robot configuration
export interface RobotConfig {
  name: string;
  type: 'humanoid' | 'arm' | 'mobile' | 'custom';
  model: string;
  version: string;
  hardware: RobotHardwareConfig;
  joints: JointConfig[];
  safety: SafetyConfig;
  simulation: SimulationConfig;
  capabilities: {
    walking: boolean;
    manipulation: boolean;
    vision: boolean;
    speech: boolean;
    teaching: boolean;
  };
}

// Default AiNex humanoid configuration
export const DEFAULT_AINEX_CONFIG: RobotConfig = {
  name: 'AiNex Humanoid Robot',
  type: 'humanoid',
  model: 'AiNex-24DOF',
  version: '1.0',
  
  hardware: {
    serialPort: process.env.ROBOT_SERIAL_PORT || '/dev/ttyUSB0',
    baudRate: parseInt(process.env.ROBOT_BAUD_RATE || '115200'),
    updateRateHz: parseInt(process.env.ROBOT_UPDATE_RATE || '10'),
    imuUpdateRateHz: parseInt(process.env.IMU_UPDATE_RATE || '50'),
  },
  
  joints: [
    // Head joints
    { name: 'head_yaw', servoId: 1, minPosition: -1.57, maxPosition: 1.57, maxVelocity: 2.0, maxAcceleration: 5.0, defaultPosition: 0 },
    { name: 'head_pitch', servoId: 2, minPosition: -0.785, maxPosition: 0.785, maxVelocity: 2.0, maxAcceleration: 5.0, defaultPosition: 0 },
    
    // Right arm joints
    { name: 'right_shoulder_pitch', servoId: 3, minPosition: -3.14, maxPosition: 3.14, maxVelocity: 2.0, maxAcceleration: 5.0, defaultPosition: 0 },
    { name: 'right_shoulder_roll', servoId: 4, minPosition: -1.57, maxPosition: 1.57, maxVelocity: 2.0, maxAcceleration: 5.0, defaultPosition: 0 },
    { name: 'right_elbow_pitch', servoId: 5, minPosition: -2.36, maxPosition: 0, maxVelocity: 2.0, maxAcceleration: 5.0, defaultPosition: 0 },
    { name: 'right_wrist_yaw', servoId: 6, minPosition: -1.57, maxPosition: 1.57, maxVelocity: 3.0, maxAcceleration: 8.0, defaultPosition: 0 },
    { name: 'right_wrist_pitch', servoId: 7, minPosition: -1.57, maxPosition: 1.57, maxVelocity: 3.0, maxAcceleration: 8.0, defaultPosition: 0 },
    { name: 'right_gripper', servoId: 8, minPosition: 0, maxPosition: 1.0, maxVelocity: 1.0, maxAcceleration: 3.0, defaultPosition: 0 },
    
    // Left arm joints
    { name: 'left_shoulder_pitch', servoId: 9, minPosition: -3.14, maxPosition: 3.14, maxVelocity: 2.0, maxAcceleration: 5.0, defaultPosition: 0 },
    { name: 'left_shoulder_roll', servoId: 10, minPosition: -1.57, maxPosition: 1.57, maxVelocity: 2.0, maxAcceleration: 5.0, defaultPosition: 0 },
    { name: 'left_elbow_pitch', servoId: 11, minPosition: -2.36, maxPosition: 0, maxVelocity: 2.0, maxAcceleration: 5.0, defaultPosition: 0 },
    { name: 'left_wrist_yaw', servoId: 12, minPosition: -1.57, maxPosition: 1.57, maxVelocity: 3.0, maxAcceleration: 8.0, defaultPosition: 0 },
    { name: 'left_wrist_pitch', servoId: 13, minPosition: -1.57, maxPosition: 1.57, maxVelocity: 3.0, maxAcceleration: 8.0, defaultPosition: 0 },
    { name: 'left_gripper', servoId: 14, minPosition: 0, maxPosition: 1.0, maxVelocity: 1.0, maxAcceleration: 3.0, defaultPosition: 0 },
    
    // Waist joint
    { name: 'waist_yaw', servoId: 15, minPosition: -1.57, maxPosition: 1.57, maxVelocity: 1.5, maxAcceleration: 3.0, defaultPosition: 0 },
    
    // Right leg joints
    { name: 'right_hip_yaw', servoId: 16, minPosition: -0.785, maxPosition: 0.785, maxVelocity: 1.5, maxAcceleration: 3.0, defaultPosition: 0 },
    { name: 'right_hip_roll', servoId: 17, minPosition: -0.785, maxPosition: 0.785, maxVelocity: 1.5, maxAcceleration: 3.0, defaultPosition: 0 },
    { name: 'right_hip_pitch', servoId: 18, minPosition: -1.57, maxPosition: 1.57, maxVelocity: 1.5, maxAcceleration: 3.0, defaultPosition: 0 },
    { name: 'right_knee_pitch', servoId: 19, minPosition: 0, maxPosition: 2.36, maxVelocity: 1.5, maxAcceleration: 3.0, defaultPosition: 0 },
    { name: 'right_ankle_pitch', servoId: 20, minPosition: -0.785, maxPosition: 0.785, maxVelocity: 2.0, maxAcceleration: 4.0, defaultPosition: 0 },
    { name: 'right_ankle_roll', servoId: 21, minPosition: -0.785, maxPosition: 0.785, maxVelocity: 2.0, maxAcceleration: 4.0, defaultPosition: 0 },
    
    // Left leg joints
    { name: 'left_hip_yaw', servoId: 22, minPosition: -0.785, maxPosition: 0.785, maxVelocity: 1.5, maxAcceleration: 3.0, defaultPosition: 0 },
    { name: 'left_hip_roll', servoId: 23, minPosition: -0.785, maxPosition: 0.785, maxVelocity: 1.5, maxAcceleration: 3.0, defaultPosition: 0 },
    { name: 'left_hip_pitch', servoId: 24, minPosition: -1.57, maxPosition: 1.57, maxVelocity: 1.5, maxAcceleration: 3.0, defaultPosition: 0 },
    { name: 'left_knee_pitch', servoId: 25, minPosition: 0, maxPosition: 2.36, maxVelocity: 1.5, maxAcceleration: 3.0, defaultPosition: 0 },
    { name: 'left_ankle_pitch', servoId: 26, minPosition: -0.785, maxPosition: 0.785, maxVelocity: 2.0, maxAcceleration: 4.0, defaultPosition: 0 },
    { name: 'left_ankle_roll', servoId: 27, minPosition: -0.785, maxPosition: 0.785, maxVelocity: 2.0, maxAcceleration: 4.0, defaultPosition: 0 },
  ],
  
  safety: {
    maxJointVelocity: parseFloat(process.env.MAX_JOINT_VELOCITY || '2.0'),
    maxJointAcceleration: parseFloat(process.env.MAX_JOINT_ACCELERATION || '5.0'),
    emergencyStopAcceleration: parseFloat(process.env.EMERGENCY_STOP_ACCELERATION || '20.0'),
    fallDetectionThreshold: parseFloat(process.env.FALL_DETECTION_THRESHOLD || '15.0'),
    temperatureLimit: parseFloat(process.env.TEMPERATURE_LIMIT || '80.0'),
    currentLimit: parseFloat(process.env.CURRENT_LIMIT || '2.0'),
    collisionDetectionEnabled: process.env.COLLISION_DETECTION === 'true',
  },
  
  simulation: {
    rosWebsocketUrl: process.env.ROS_WEBSOCKET_URL || 'ws://localhost:9090',
    updateRateHz: parseInt(process.env.SIMULATION_UPDATE_RATE || '50'),
    physicsStepSize: parseFloat(process.env.PHYSICS_STEP_SIZE || '0.001'),
    gravityCompensation: process.env.GRAVITY_COMPENSATION === 'true',
  },
  
  capabilities: {
    walking: true,
    manipulation: true,
    vision: true,
    speech: false,
    teaching: true,
  },
};

// Load custom configuration
export function loadRobotConfig(configPath?: string): RobotConfig {
  if (configPath) {
    try {
      // In a real implementation, load from file
      logger.info(`[Config] Loading robot configuration from: ${configPath}`);
      // const customConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      // return { ...DEFAULT_AINEX_CONFIG, ...customConfig };
    } catch (error) {
      logger.error('[Config] Failed to load custom configuration:', error);
    }
  }
  
  return DEFAULT_AINEX_CONFIG;
}

// Get joint configuration by name
export function getJointConfig(config: RobotConfig, jointName: string): JointConfig | undefined {
  return config.joints.find(j => j.name === jointName);
}

// Get joint servo mapping
export function getJointServoMap(config: RobotConfig): { [jointName: string]: number } {
  const map: { [jointName: string]: number } = {};
  for (const joint of config.joints) {
    map[joint.name] = joint.servoId;
  }
  return map;
}

// Get joint limits
export function getJointLimits(config: RobotConfig): { [jointName: string]: { min: number; max: number } } {
  const limits: { [jointName: string]: { min: number; max: number } } = {};
  for (const joint of config.joints) {
    limits[joint.name] = {
      min: joint.minPosition,
      max: joint.maxPosition,
    };
  }
  return limits;
}

// Validate joint position
export function validateJointPosition(config: RobotConfig, jointName: string, position: number): boolean {
  const joint = getJointConfig(config, jointName);
  if (!joint) return false;
  return position >= joint.minPosition && position <= joint.maxPosition;
}

// Clamp joint position to limits
export function clampJointPosition(config: RobotConfig, jointName: string, position: number): number {
  const joint = getJointConfig(config, jointName);
  if (!joint) return position;
  return Math.max(joint.minPosition, Math.min(joint.maxPosition, position));
}

// Get default pose
export function getDefaultPose(config: RobotConfig): { [jointName: string]: number } {
  const pose: { [jointName: string]: number } = {};
  for (const joint of config.joints) {
    pose[joint.name] = joint.defaultPosition;
  }
  return pose;
} 