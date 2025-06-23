/**
 * Local implementation of Hyperfy Vector3Enhanced
 * This replaces the import from '../hyperfy/src/core/extras/Vector3Enhanced.js'
 */

export class Vector3Enhanced {
  x: number;
  y: number;
  z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Creates a Vector3Enhanced from various input formats
   */
  static from(input: any): Vector3Enhanced {
    if (input instanceof Vector3Enhanced) {
      return input.clone();
    }
    
    if (Array.isArray(input)) {
      return new Vector3Enhanced(input[0] || 0, input[1] || 0, input[2] || 0);
    }
    
    if (typeof input === 'object' && input !== null) {
      return new Vector3Enhanced(input.x || 0, input.y || 0, input.z || 0);
    }
    
    return new Vector3Enhanced(0, 0, 0);
  }

  /**
   * Sets the vector components
   */
  set(x: number, y: number, z: number): Vector3Enhanced {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  /**
   * Converts to array format
   */
  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  /**
   * Converts to object format
   */
  toObject(): { x: number; y: number; z: number } {
    return { x: this.x, y: this.y, z: this.z };
  }

  /**
   * Calculates the length of the vector
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /**
   * Calculates distance to another vector
   */
  distanceTo(v: Vector3Enhanced | any): number {
    const other = Vector3Enhanced.from(v);
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dz = this.z - other.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculates squared distance to another vector (faster than distanceTo)
   */
  distanceToSquared(v: Vector3Enhanced | any): number {
    const other = Vector3Enhanced.from(v);
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dz = this.z - other.z;
    return dx * dx + dy * dy + dz * dz;
  }

  /**
   * Checks if vectors are approximately equal
   */
  approximatelyEquals(v: Vector3Enhanced | any, epsilon: number = 0.001): boolean {
    const other = Vector3Enhanced.from(v);
    return Math.abs(this.x - other.x) < epsilon &&
           Math.abs(this.y - other.y) < epsilon &&
           Math.abs(this.z - other.z) < epsilon;
  }

  /**
   * Clamps vector components to min/max values
   */
  clamp(min: Vector3Enhanced | any, max: Vector3Enhanced | any): Vector3Enhanced {
    const minVec = Vector3Enhanced.from(min);
    const maxVec = Vector3Enhanced.from(max);
    
    this.x = Math.max(minVec.x, Math.min(maxVec.x, this.x));
    this.y = Math.max(minVec.y, Math.min(maxVec.y, this.y));
    this.z = Math.max(minVec.z, Math.min(maxVec.z, this.z));
    
    return this;
  }

  /**
   * Creates a clone of this vector
   */
  clone(): Vector3Enhanced {
    return new Vector3Enhanced(this.x, this.y, this.z);
  }

  /**
   * Sets vector from various input formats
   */
  setFrom(input: any): Vector3Enhanced {
    const v = Vector3Enhanced.from(input);
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  /**
   * Rounds vector components to specified decimal places
   */
  round(decimals: number = 0): Vector3Enhanced {
    const factor = Math.pow(10, decimals);
    this.x = Math.round(this.x * factor) / factor;
    this.y = Math.round(this.y * factor) / factor;
    this.z = Math.round(this.z * factor) / factor;
    return this;
  }

  /**
   * Gets the magnitude (length) of the vector
   */
  magnitude(): number {
    return this.length();
  }

  /**
   * Normalizes the vector
   */
  normalize(): Vector3Enhanced {
    const len = this.length();
    if (len > 0) {
      this.multiplyScalar(1 / len);
    }
    return this;
  }

  /**
   * Multiplies the vector by a scalar
   */
  multiplyScalar(scalar: number): Vector3Enhanced {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  /**
   * Normalizes the vector and returns the previous length
   */
  normalizeWithLength(): { vector: Vector3Enhanced; length: number } {
    const length = this.length();
    if (length > 0) {
      this.multiplyScalar(1 / length);
    }
    return { vector: this, length };
  }

  /**
   * Adds another vector to this vector
   */
  add(v: Vector3Enhanced | any): Vector3Enhanced {
    const other = Vector3Enhanced.from(v);
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
    return this;
  }

  /**
   * Subtracts another vector from this vector
   */
  sub(v: Vector3Enhanced | any): Vector3Enhanced {
    const other = Vector3Enhanced.from(v);
    this.x -= other.x;
    this.y -= other.y;
    this.z -= other.z;
    return this;
  }

  /**
   * Calculates the dot product with another vector
   */
  dot(v: Vector3Enhanced | any): number {
    const other = Vector3Enhanced.from(v);
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  /**
   * Calculates the cross product with another vector
   */
  cross(v: Vector3Enhanced | any): Vector3Enhanced {
    const other = Vector3Enhanced.from(v);
    const x = this.y * other.z - this.z * other.y;
    const y = this.z * other.x - this.x * other.z;
    const z = this.x * other.y - this.y * other.x;
    return new Vector3Enhanced(x, y, z);
  }
} 