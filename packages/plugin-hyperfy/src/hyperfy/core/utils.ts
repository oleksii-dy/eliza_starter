/**
 * Local implementation of Hyperfy core utils
 * This replaces the import from '../hyperfy/src/core/utils.js'
 */

import * as THREE from 'three';

/**
 * Generates a unique ID for entities
 */
export function generateId(): string {
  return `entity-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Clones entity data for duplication
 */
export function cloneEntityData(data: any): any {
  const cloned = JSON.parse(JSON.stringify(data));
  
  // Generate new ID for the clone
  cloned.id = generateId();
  
  // Remove any properties that shouldn't be cloned
  delete cloned.createdAt;
  delete cloned.updatedAt;
  delete cloned.owner;
  
  return cloned;
}

/**
 * Validates position coordinates
 */
export function validatePosition(position: any): boolean {
  if (!position) return false;
  
  if (Array.isArray(position)) {
    return position.length === 3 && 
           position.every(coord => typeof coord === 'number' && !isNaN(coord));
  }
  
  if (typeof position === 'object') {
    return typeof position.x === 'number' && !isNaN(position.x) &&
           typeof position.y === 'number' && !isNaN(position.y) &&
           typeof position.z === 'number' && !isNaN(position.z);
  }
  
  return false;
}

/**
 * Normalizes position to array format [x, y, z]
 */
export function normalizePosition(position: any): [number, number, number] {
  if (Array.isArray(position)) {
    return position as [number, number, number];
  }
  
  if (typeof position === 'object' && position !== null) {
    return [position.x || 0, position.y || 0, position.z || 0];
  }
  
  return [0, 0, 0];
}

/**
 * Validates rotation (quaternion or euler)
 */
export function validateRotation(rotation: any): boolean {
  if (!rotation) return false;
  
  if (Array.isArray(rotation)) {
    // Quaternion format [x, y, z, w]
    return rotation.length === 4 && 
           rotation.every(val => typeof val === 'number' && !isNaN(val));
  }
  
  if (typeof rotation === 'object') {
    // Euler format { x, y, z }
    return typeof rotation.x === 'number' && !isNaN(rotation.x) &&
           typeof rotation.y === 'number' && !isNaN(rotation.y) &&
           typeof rotation.z === 'number' && !isNaN(rotation.z);
  }
  
  return false;
}

/**
 * Normalizes rotation to quaternion format [x, y, z, w]
 */
export function normalizeRotation(rotation: any): [number, number, number, number] {
  if (Array.isArray(rotation) && rotation.length === 4) {
    return rotation as [number, number, number, number];
  }
  
  if (typeof rotation === 'object' && rotation !== null) {
    // Convert euler to quaternion
    const euler = new THREE.Euler(
      rotation.x || 0,
      rotation.y || 0,
      rotation.z || 0
    );
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(euler);
    return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
  }
  
  return [0, 0, 0, 1]; // Identity quaternion
}

/**
 * Validates scale values
 */
export function validateScale(scale: any): boolean {
  if (!scale) return false;
  
  if (typeof scale === 'number') {
    return !isNaN(scale) && scale > 0;
  }
  
  if (Array.isArray(scale)) {
    return scale.length === 3 && 
           scale.every(val => typeof val === 'number' && !isNaN(val) && val > 0);
  }
  
  if (typeof scale === 'object') {
    return typeof scale.x === 'number' && !isNaN(scale.x) && scale.x > 0 &&
           typeof scale.y === 'number' && !isNaN(scale.y) && scale.y > 0 &&
           typeof scale.z === 'number' && !isNaN(scale.z) && scale.z > 0;
  }
  
  return false;
}

/**
 * Normalizes scale to array format [x, y, z]
 */
export function normalizeScale(scale: any): [number, number, number] {
  if (typeof scale === 'number') {
    return [scale, scale, scale];
  }
  
  if (Array.isArray(scale)) {
    return scale as [number, number, number];
  }
  
  if (typeof scale === 'object' && scale !== null) {
    return [scale.x || 1, scale.y || 1, scale.z || 1];
  }
  
  return [1, 1, 1];
}

/**
 * Calculates distance between two positions
 */
export function distanceBetween(pos1: any, pos2: any): number {
  const p1 = normalizePosition(pos1);
  const p2 = normalizePosition(pos2);
  
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Checks if a position is within bounds
 */
export function isWithinBounds(position: any, bounds: { min: any, max: any }): boolean {
  const pos = normalizePosition(position);
  const min = normalizePosition(bounds.min);
  const max = normalizePosition(bounds.max);
  
  return pos[0] >= min[0] && pos[0] <= max[0] &&
         pos[1] >= min[1] && pos[1] <= max[1] &&
         pos[2] >= min[2] && pos[2] <= max[2];
}

/**
 * Generates a random position within given bounds
 */
export function randomPositionInBounds(bounds: { min: any, max: any }): [number, number, number] {
  const min = normalizePosition(bounds.min);
  const max = normalizePosition(bounds.max);
  
  return [
    min[0] + Math.random() * (max[0] - min[0]),
    min[1] + Math.random() * (max[1] - min[1]),
    min[2] + Math.random() * (max[2] - min[2])
  ];
}

/**
 * Validates entity blueprint
 */
export function validateBlueprint(blueprint: any): boolean {
  if (!blueprint || typeof blueprint !== 'object') return false;
  
  // Required fields
  if (!blueprint.name || typeof blueprint.name !== 'string') return false;
  
  // Optional but validated fields
  if (blueprint.position && !validatePosition(blueprint.position)) return false;
  if (blueprint.rotation && !validateRotation(blueprint.rotation)) return false;
  if (blueprint.scale && !validateScale(blueprint.scale)) return false;
  
  return true;
} 