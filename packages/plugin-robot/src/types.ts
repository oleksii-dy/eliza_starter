// Vision service types and interfaces
export const VisionServiceType = {
  VISION: 'VISION' as const,
};

// Robot service types
export const RobotServiceType = {
  ROBOT: 'ROBOT' as const,
  SIMULATION: 'SIMULATION' as const,
  RL_TRAINING: 'RL_TRAINING' as const,
  SAFETY: 'SAFETY' as const,
};

// Extend the core service types with robot services
declare module '@elizaos/core' {
  interface ServiceTypeRegistry {
    VISION: 'VISION';
    ROBOT: 'ROBOT';
    SIMULATION: 'SIMULATION';
    RL_TRAINING: 'RL_TRAINING';
    SAFETY: 'SAFETY';
  }
}

// Vision-specific types
export interface CameraInfo {
  id: string;
  name: string;
  connected: boolean;
}

export interface SceneDescription {
  timestamp: number;
  description: string;
  objects: DetectedObject[];
  people: PersonInfo[];
  sceneChanged: boolean;
  changePercentage: number;
}

export interface DetectedObject {
  id: string;
  type: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface PersonInfo {
  id: string;
  pose: 'sitting' | 'standing' | 'lying' | 'unknown';
  facing: 'camera' | 'away' | 'left' | 'right' | 'unknown';
  confidence: number;
  boundingBox: BoundingBox;
  keypoints?: Array<{
    part: string;
    position: { x: number; y: number };
    score: number;
  }>;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisionFrame {
  timestamp: number;
  width: number;
  height: number;
  data: Buffer;
  format: 'rgb' | 'rgba' | 'jpeg' | 'png';
}

// Vision modes
export enum VisionMode {
  OFF = 'OFF',
  CAMERA = 'CAMERA',
  SCREEN = 'SCREEN',
  BOTH = 'BOTH',
}

// Screen capture types
export interface ScreenCapture {
  timestamp: number;
  width: number;
  height: number;
  data: Buffer;
  tiles: ScreenTile[];
}

export interface ScreenTile {
  id: string;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  data?: Buffer;
  analysis?: TileAnalysis;
}

export interface TileAnalysis {
  timestamp: number;
  florence2?: Florence2Result;
  ocr?: OCRResult;
  objects?: DetectedObject[];
  text?: string;
  summary?: string;
}

export interface Florence2Result {
  caption?: string;
  objects?: Array<{
    label: string;
    bbox: BoundingBox;
    confidence: number;
  }>;
  regions?: Array<{
    description: string;
    bbox: BoundingBox;
  }>;
  tags?: string[];
}

export interface OCRResult {
  text: string;
  blocks: Array<{
    text: string;
    bbox: BoundingBox;
    confidence: number;
    words?: Array<{
      text: string;
      bbox: BoundingBox;
      confidence: number;
    }>;
  }>;
  fullText: string;
}

// Enhanced scene description with screen data
export interface EnhancedSceneDescription extends SceneDescription {
  screenCapture?: ScreenCapture;
  screenAnalysis?: {
    fullScreenOCR?: string;
    activeTile?: TileAnalysis;
    gridSummary?: string;
    focusedApp?: string;
    uiElements?: Array<{
      type: string;
      text: string;
      position: BoundingBox;
    }>;
  };
}

// Update VisionConfig
export interface VisionConfig {
  cameraName?: string;
  pixelChangeThreshold?: number;
  updateInterval?: number;
  enablePoseDetection?: boolean;
  enableObjectDetection?: boolean;
  tfUpdateInterval?: number;
  vlmUpdateInterval?: number;
  tfChangeThreshold?: number;
  vlmChangeThreshold?: number;
  
  // Screen vision config
  visionMode?: VisionMode;
  screenCaptureInterval?: number; // ms between screen captures
  tileSize?: number; // Size of tiles (e.g., 256 for 256x256)
  tileProcessingOrder?: 'sequential' | 'priority' | 'random';
  ocrEnabled?: boolean;
  florence2Enabled?: boolean;
  screenRegion?: { // Optional: capture only part of screen
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Entity tracking types
export interface TrackedEntity {
  id: string;
  entityType: 'person' | 'object' | 'pet';
  firstSeen: number;
  lastSeen: number;
  lastPosition: BoundingBox;
  appearances: EntityAppearance[];
  attributes: EntityAttributes;
  worldId?: string;
  roomId?: string;
}

export interface EntityAppearance {
  timestamp: number;
  boundingBox: BoundingBox;
  confidence: number;
  embedding?: number[]; // Face embedding for person recognition
  keypoints?: Array<{
    part: string;
    position: { x: number; y: number };
    score: number;
  }>;
}

export interface EntityAttributes {
  // For people
  name?: string;
  faceEmbedding?: number[];
  faceId?: string;
  clothing?: string[];
  hairColor?: string;
  accessories?: string[];
  
  // For objects
  objectType?: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  
  // Common
  description?: string;
  tags?: string[];
}

export interface FaceLibrary {
  faces: Map<string, FaceProfile>;
  embeddings: Map<string, number[][]>; // Multiple embeddings per profile
}

export interface FaceProfile {
  id: string;
  name?: string;
  embeddings: number[][]; // Multiple embeddings for better recognition
  firstSeen: number;
  lastSeen: number;
  seenCount: number;
  attributes?: {
    age?: string;
    gender?: string;
    emotion?: string;
  };
}

export interface WorldState {
  worldId: string;
  entities: Map<string, TrackedEntity>;
  lastUpdate: number;
  activeEntities: string[]; // Currently visible
  recentlyLeft: Array<{
    entityId: string;
    leftAt: number;
    lastPosition: BoundingBox;
  }>;
}

// Robot-specific types
export interface JointState {
  name: string;
  position: number; // radians
  velocity?: number; // rad/s
  effort?: number; // Nm
  temperature?: number; // Celsius
}

export interface RobotState {
  timestamp: number;
  joints: JointState[];
  batteryLevel?: number;
  imuData?: IMUData;
  isEmergencyStopped: boolean;
  mode: RobotMode;
  status: RobotStatus;
}

export interface IMUData {
  timestamp: number;
  accelerometer: Vector3;  // m/s²
  gyroscope: Vector3;      // rad/s
  magnetometer?: Vector3;  // μT (optional)
  orientation?: Quaternion; // Computed orientation (optional)
  temperature?: number;    // Celsius (optional)
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export enum RobotMode {
  IDLE = 'IDLE',
  MANUAL = 'MANUAL',
  AUTONOMOUS = 'AUTONOMOUS',
  TEACHING = 'TEACHING',
  EMERGENCY_STOP = 'EMERGENCY_STOP',
}

export enum RobotStatus {
  OK = 'OK',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  DISCONNECTED = 'DISCONNECTED',
}

export interface ServoCommand {
  header: [0x55, 0x55];
  servoId: number;
  command: ServoCommandType;
  position?: number; // 0-1000 (mapped to servo range)
  speed?: number; // 0-1000
  torque?: number; // 0-1000
  checksum?: number;
}

export enum ServoCommandType {
  MOVE = 0x01,
  SET_SPEED = 0x02,
  SET_TORQUE = 0x03,
  READ_POSITION = 0x04,
  ENABLE = 0x05,
  DISABLE = 0x06,
  IMU_READ = 0x60,
}

export interface RobotConfig {
  // Hardware config
  serialPort?: string;
  baudRate?: number;
  jointNames: string[];
  jointLimits: { [joint: string]: { min: number; max: number } };
  
  // ROS 2 config
  rosWebsocketUrl?: string;
  jointStateTopic?: string;
  jointCommandTopic?: string;
  
  // Safety config
  maxJointVelocity?: number; // rad/s
  maxJointAcceleration?: number; // rad/s^2
  emergencyStopTopic?: string;
  
  // Simulation config
  useSimulation?: boolean;
  gazeboWorldFile?: string;
  urdfPath?: string;
}

export interface Pose {
  name: string;
  joints: { [jointName: string]: number };
  duration?: number; // Time to reach pose in ms
}

export interface Motion {
  name: string;
  description?: string;
  poses: Pose[];
  loop?: boolean;
}

export interface NavigationGoal {
  position: Vector3;
  orientation?: Quaternion;
  frame?: string; // Reference frame
}

export interface RLState {
  observation: number[];
  reward: number;
  done: boolean;
  info: { [key: string]: any };
}

export interface RLAction {
  jointCommands?: number[]; // Joint velocities or positions
  discrete?: number; // For discrete action spaces
}

// Export robot command types
export * from './types/robot-command';
