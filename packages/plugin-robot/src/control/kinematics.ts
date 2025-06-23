import { logger } from '@elizaos/core';
import { Vector3, Quaternion, JointState } from '../types';

export interface DHTParameters {
  a: number;     // Link length
  d: number;     // Link offset
  alpha: number; // Link twist
  theta: number; // Joint angle
}

export interface KinematicChain {
  name: string;
  baseFrame: string;
  endEffectorFrame: string;
  joints: string[];
  dhtParams: DHTParameters[];
}

export interface Transform {
  position: Vector3;
  orientation: Quaternion;
}

export class Kinematics {
  private chains: Map<string, KinematicChain> = new Map();
  
  constructor() {
    // Initialize kinematic chains for AiNex robot
    this.initializeChains();
  }
  
  private initializeChains(): void {
    // Left arm kinematic chain
    this.chains.set('left_arm', {
      name: 'left_arm',
      baseFrame: 'torso',
      endEffectorFrame: 'left_gripper',
      joints: [
        'left_shoulder_pitch',
        'left_shoulder_roll',
        'left_elbow_pitch',
        'left_wrist_yaw',
        'left_wrist_pitch',
      ],
      dhtParams: [
        { a: 0, d: 0.1, alpha: -Math.PI/2, theta: 0 },      // Shoulder pitch
        { a: 0, d: 0, alpha: Math.PI/2, theta: 0 },         // Shoulder roll
        { a: 0.25, d: 0, alpha: 0, theta: 0 },              // Elbow pitch
        { a: 0, d: 0.25, alpha: -Math.PI/2, theta: 0 },     // Wrist yaw
        { a: 0, d: 0, alpha: Math.PI/2, theta: 0 },         // Wrist pitch
      ],
    });
    
    // Right arm kinematic chain
    this.chains.set('right_arm', {
      name: 'right_arm',
      baseFrame: 'torso',
      endEffectorFrame: 'right_gripper',
      joints: [
        'right_shoulder_pitch',
        'right_shoulder_roll',
        'right_elbow_pitch',
        'right_wrist_yaw',
        'right_wrist_pitch',
      ],
      dhtParams: [
        { a: 0, d: 0.1, alpha: Math.PI/2, theta: 0 },       // Shoulder pitch
        { a: 0, d: 0, alpha: -Math.PI/2, theta: 0 },        // Shoulder roll
        { a: 0.25, d: 0, alpha: 0, theta: 0 },              // Elbow pitch
        { a: 0, d: 0.25, alpha: Math.PI/2, theta: 0 },      // Wrist yaw
        { a: 0, d: 0, alpha: -Math.PI/2, theta: 0 },        // Wrist pitch
      ],
    });
    
    // Left leg kinematic chain
    this.chains.set('left_leg', {
      name: 'left_leg',
      baseFrame: 'pelvis',
      endEffectorFrame: 'left_foot',
      joints: [
        'left_hip_yaw',
        'left_hip_roll',
        'left_hip_pitch',
        'left_knee_pitch',
        'left_ankle_pitch',
        'left_ankle_roll',
      ],
      dhtParams: [
        { a: 0, d: 0, alpha: -Math.PI/2, theta: 0 },        // Hip yaw
        { a: 0, d: 0, alpha: Math.PI/2, theta: 0 },         // Hip roll
        { a: 0, d: 0.1, alpha: -Math.PI/2, theta: 0 },      // Hip pitch
        { a: 0.3, d: 0, alpha: 0, theta: 0 },               // Knee pitch
        { a: 0.3, d: 0, alpha: 0, theta: 0 },               // Ankle pitch
        { a: 0, d: 0, alpha: Math.PI/2, theta: 0 },         // Ankle roll
      ],
    });
    
    // Right leg kinematic chain
    this.chains.set('right_leg', {
      name: 'right_leg',
      baseFrame: 'pelvis',
      endEffectorFrame: 'right_foot',
      joints: [
        'right_hip_yaw',
        'right_hip_roll',
        'right_hip_pitch',
        'right_knee_pitch',
        'right_ankle_pitch',
        'right_ankle_roll',
      ],
      dhtParams: [
        { a: 0, d: 0, alpha: Math.PI/2, theta: 0 },         // Hip yaw
        { a: 0, d: 0, alpha: -Math.PI/2, theta: 0 },        // Hip roll
        { a: 0, d: 0.1, alpha: Math.PI/2, theta: 0 },       // Hip pitch
        { a: 0.3, d: 0, alpha: 0, theta: 0 },               // Knee pitch
        { a: 0.3, d: 0, alpha: 0, theta: 0 },               // Ankle pitch
        { a: 0, d: 0, alpha: -Math.PI/2, theta: 0 },        // Ankle roll
      ],
    });
  }
  
  /**
   * Compute forward kinematics for a kinematic chain
   */
  forwardKinematics(chainName: string, jointAngles: number[]): Transform | null {
    const chain = this.chains.get(chainName);
    if (!chain) {
      logger.error(`[Kinematics] Unknown chain: ${chainName}`);
      return null;
    }
    
    if (jointAngles.length !== chain.joints.length) {
      logger.error(`[Kinematics] Invalid joint angles count for ${chainName}`);
      return null;
    }
    
    // Start with identity transform
    let transform = this.identityTransform();
    
    // Apply DH transformations for each joint
    for (let i = 0; i < chain.dhtParams.length; i++) {
      const dh = { ...chain.dhtParams[i] };
      dh.theta += jointAngles[i]; // Add joint angle to theta
      
      const jointTransform = this.dhToTransform(dh);
      transform = this.multiplyTransforms(transform, jointTransform);
    }
    
    return transform;
  }
  
  /**
   * Compute inverse kinematics for a kinematic chain
   * Uses numerical Jacobian method
   */
  async inverseKinematics(
    chainName: string,
    targetTransform: Transform,
    initialGuess?: number[],
    maxIterations: number = 100,
    tolerance: number = 0.001
  ): Promise<number[] | null> {
    const chain = this.chains.get(chainName);
    if (!chain) {
      logger.error(`[Kinematics] Unknown chain: ${chainName}`);
      return null;
    }
    
    // Initialize joint angles
    let jointAngles = initialGuess || new Array(chain.joints.length).fill(0);
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Compute current end effector position
      const currentTransform = this.forwardKinematics(chainName, jointAngles);
      if (!currentTransform) return null;
      
      // Compute error
      const positionError = this.vectorSubtract(
        targetTransform.position,
        currentTransform.position
      );
      const orientationError = this.quaternionError(
        targetTransform.orientation,
        currentTransform.orientation
      );
      
      // Check convergence
      const error = Math.sqrt(
        positionError.x ** 2 + positionError.y ** 2 + positionError.z ** 2 +
        orientationError.x ** 2 + orientationError.y ** 2 + orientationError.z ** 2
      );
      
      if (error < tolerance) {
        logger.debug(`[Kinematics] IK converged in ${iter} iterations`);
        return jointAngles;
      }
      
      // Compute Jacobian
      const jacobian = this.computeJacobian(chainName, jointAngles);
      
      // Compute joint angle updates using pseudo-inverse
      const deltaQ = this.solveJacobian(jacobian, positionError, orientationError);
      
      // Update joint angles
      for (let i = 0; i < jointAngles.length; i++) {
        jointAngles[i] += deltaQ[i] * 0.1; // Damping factor
      }
    }
    
    logger.warn(`[Kinematics] IK did not converge for ${chainName}`);
    return null;
  }
  
  /**
   * Convert DH parameters to transformation matrix
   */
  private dhToTransform(dh: DHTParameters): Transform {
    const { a, d, alpha, theta } = dh;
    
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const ca = Math.cos(alpha);
    const sa = Math.sin(alpha);
    
    // Build transformation matrix
    const position: Vector3 = {
      x: a * ct,
      y: a * st,
      z: d,
    };
    
    // Convert rotation matrix to quaternion
    const r11 = ct;
    const r12 = -st * ca;
    const r13 = st * sa;
    const r21 = st;
    const r22 = ct * ca;
    const r23 = -ct * sa;
    const r31 = 0;
    const r32 = sa;
    const r33 = ca;
    
    const orientation = this.rotationMatrixToQuaternion(
      r11, r12, r13,
      r21, r22, r23,
      r31, r32, r33
    );
    
    return { position, orientation };
  }
  
  /**
   * Compute numerical Jacobian
   */
  private computeJacobian(chainName: string, jointAngles: number[]): number[][] {
    const chain = this.chains.get(chainName)!;
    const jacobian: number[][] = [];
    const delta = 0.001; // Small perturbation
    
    // Get current end effector position
    const currentTransform = this.forwardKinematics(chainName, jointAngles)!;
    
    for (let i = 0; i < jointAngles.length; i++) {
      // Perturb joint angle
      const perturbedAngles = [...jointAngles];
      perturbedAngles[i] += delta;
      
      // Compute perturbed position
      const perturbedTransform = this.forwardKinematics(chainName, perturbedAngles)!;
      
      // Compute derivative
      const dPosition = this.vectorSubtract(perturbedTransform.position, currentTransform.position);
      const dOrientation = this.quaternionError(perturbedTransform.orientation, currentTransform.orientation);
      
      jacobian.push([
        dPosition.x / delta,
        dPosition.y / delta,
        dPosition.z / delta,
        dOrientation.x / delta,
        dOrientation.y / delta,
        dOrientation.z / delta,
      ]);
    }
    
    return this.transposeMatrix(jacobian);
  }
  
  /**
   * Solve Jacobian equation using pseudo-inverse
   */
  private solveJacobian(
    jacobian: number[][],
    positionError: Vector3,
    orientationError: Vector3
  ): number[] {
    // Combine errors into single vector
    const error = [
      positionError.x,
      positionError.y,
      positionError.z,
      orientationError.x,
      orientationError.y,
      orientationError.z,
    ];
    
    // Compute pseudo-inverse (simplified for small matrices)
    const jt = this.transposeMatrix(jacobian);
    const jtj = this.multiplyMatrices(jt, jacobian);
    
    // Add damping to avoid singularities
    const lambda = 0.01;
    for (let i = 0; i < jtj.length; i++) {
      jtj[i][i] += lambda;
    }
    
    // Solve using simple matrix operations
    // In production, use a proper linear algebra library
    const deltaQ: number[] = new Array(jt.length).fill(0);
    
    for (let i = 0; i < jt.length; i++) {
      for (let j = 0; j < error.length; j++) {
        deltaQ[i] += jt[i][j] * error[j];
      }
    }
    
    return deltaQ;
  }
  
  // Utility functions
  
  private identityTransform(): Transform {
    return {
      position: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    };
  }
  
  private multiplyTransforms(t1: Transform, t2: Transform): Transform {
    // Multiply positions (simplified - assumes no rotation of t2 position by t1)
    const position = this.vectorAdd(t1.position, t2.position);
    
    // Multiply quaternions
    const orientation = this.quaternionMultiply(t1.orientation, t2.orientation);
    
    return { position, orientation };
  }
  
  private vectorAdd(v1: Vector3, v2: Vector3): Vector3 {
    return {
      x: v1.x + v2.x,
      y: v1.y + v2.y,
      z: v1.z + v2.z,
    };
  }
  
  private vectorSubtract(v1: Vector3, v2: Vector3): Vector3 {
    return {
      x: v1.x - v2.x,
      y: v1.y - v2.y,
      z: v1.z - v2.z,
    };
  }
  
  private quaternionMultiply(q1: Quaternion, q2: Quaternion): Quaternion {
    return {
      x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
      y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
      z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
      w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
    };
  }
  
  private quaternionError(q1: Quaternion, q2: Quaternion): Vector3 {
    // Simplified quaternion error as axis-angle
    const qError = this.quaternionMultiply(q1, this.quaternionConjugate(q2));
    return {
      x: 2 * qError.x,
      y: 2 * qError.y,
      z: 2 * qError.z,
    };
  }
  
  private quaternionConjugate(q: Quaternion): Quaternion {
    return {
      x: -q.x,
      y: -q.y,
      z: -q.z,
      w: q.w,
    };
  }
  
  private rotationMatrixToQuaternion(
    r11: number, r12: number, r13: number,
    r21: number, r22: number, r23: number,
    r31: number, r32: number, r33: number
  ): Quaternion {
    const trace = r11 + r22 + r33;
    
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      return {
        w: 0.25 / s,
        x: (r32 - r23) * s,
        y: (r13 - r31) * s,
        z: (r21 - r12) * s,
      };
    } else if (r11 > r22 && r11 > r33) {
      const s = 2.0 * Math.sqrt(1.0 + r11 - r22 - r33);
      return {
        w: (r32 - r23) / s,
        x: 0.25 * s,
        y: (r12 + r21) / s,
        z: (r13 + r31) / s,
      };
    } else if (r22 > r33) {
      const s = 2.0 * Math.sqrt(1.0 + r22 - r11 - r33);
      return {
        w: (r13 - r31) / s,
        x: (r12 + r21) / s,
        y: 0.25 * s,
        z: (r23 + r32) / s,
      };
    } else {
      const s = 2.0 * Math.sqrt(1.0 + r33 - r11 - r22);
      return {
        w: (r21 - r12) / s,
        x: (r13 + r31) / s,
        y: (r23 + r32) / s,
        z: 0.25 * s,
      };
    }
  }
  
  private transposeMatrix(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const transposed: number[][] = [];
    
    for (let j = 0; j < cols; j++) {
      transposed[j] = [];
      for (let i = 0; i < rows; i++) {
        transposed[j][i] = matrix[i][j];
      }
    }
    
    return transposed;
  }
  
  private multiplyMatrices(a: number[][] b: number[][]): number[][] {
    const result: number[][] = [];
    const rows = a.length;
    const cols = b[0].length;
    const common = a[0].length;
    
    for (let i = 0; i < rows; i++) {
      result[i] = [];
      for (let j = 0; j < cols; j++) {
        result[i][j] = 0;
        for (let k = 0; k < common; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    
    return result;
  }
} 