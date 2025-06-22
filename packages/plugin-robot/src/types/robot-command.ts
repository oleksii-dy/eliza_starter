/**
 * Robot command types for the isomorphic interface
 */

export enum RobotCommandType {
  // Basic motion
  MOVE_JOINT = 'MOVE_JOINT',
  MOVE_TO_POSE = 'MOVE_TO_POSE',
  EXECUTE_MOTION = 'EXECUTE_MOTION',
  STOP = 'STOP',
  
  // Advanced motion
  WALK = 'WALK',
  TURN = 'TURN',
  REACH = 'REACH',
  GRASP = 'GRASP',
  RELEASE = 'RELEASE',
  
  // Head/perception
  LOOK_AT = 'LOOK_AT',
  TRACK = 'TRACK',
  SCAN = 'SCAN',
  
  // Gestures
  WAVE = 'WAVE',
  POINT = 'POINT',
  NOD = 'NOD',
  SHAKE_HEAD = 'SHAKE_HEAD',
  
  // System
  SET_MODE = 'SET_MODE',
  CALIBRATE = 'CALIBRATE',
  RESET = 'RESET',
  EMERGENCY_STOP = 'EMERGENCY_STOP',
  
  // Teaching
  START_TEACHING = 'START_TEACHING',
  STOP_TEACHING = 'STOP_TEACHING',
  RECORD_POSE = 'RECORD_POSE',
  SAVE_MOTION = 'SAVE_MOTION',
  
  // Unknown
  UNKNOWN = 'UNKNOWN'
}

/**
 * Robot Command structure for language-based control
 */
export interface RobotCommand {
  id: string;
  type: RobotCommandType;
  natural_language: string;
  parameters?: {
    target?: string;        // e.g., "left arm", "head"
    direction?: string;     // e.g., "up", "forward", "left"
    amount?: number;        // e.g., 30 degrees, 0.5 meters
    speed?: number;         // 0-1 normalized
    duration?: number;      // milliseconds
    pose?: string;          // named pose
    motion?: string;        // named motion sequence
    position?: {            // 3D position
      x: number;
      y: number;
      z: number;
    };
    orientation?: {         // Quaternion
      x: number;
      y: number;
      z: number;
      w: number;
    };
  };
  constraints?: {
    maintain_balance?: boolean;
    avoid_collisions?: boolean;
    respect_limits?: boolean;
    smooth_motion?: boolean;
  };
  metadata?: {
    timestamp: number;
    source: string;
    confidence?: number;
    user_id?: string;
    context?: any;
  };
}

/**
 * Execution result with feedback
 */
export interface ExecutionResult {
  success: boolean;
  command_id: string;
  executed_at: number;
  completed_at?: number;
  state?: any; // RobotState
  error?: string;
  warnings?: string[];
  duration?: number;
  actual_vs_planned?: {
    position_error?: number;
    timing_error?: number;
  };
  metadata?: any;
}

/**
 * Robot capabilities description
 */
export interface RobotCapabilities {
  name: string;
  type: string;
  model?: string;
  version?: string;
  dof: number;
  joints: string[];
  sensors: string[];
  actuators?: string[];
  
  capabilities: {
    walking: boolean;
    running?: boolean;
    manipulation: boolean;
    dual_arm_coordination?: boolean;
    vision: boolean;
    speech: boolean;
    teaching: boolean;
    autonomous_navigation?: boolean;
    object_recognition?: boolean;
    force_feedback?: boolean;
  };
  
  limits: {
    max_velocity: number;       // rad/s or m/s
    max_acceleration: number;   // rad/s² or m/s²
    max_payload?: number;       // kg
    max_reach?: number;         // meters
    battery_life?: number;      // minutes
  };
  
  specifications?: {
    height?: number;            // meters
    weight?: number;            // kg
    footprint?: {              // meters
      length: number;
      width: number;
    };
    workspace?: {              // reachable volume
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    };
  };
} 