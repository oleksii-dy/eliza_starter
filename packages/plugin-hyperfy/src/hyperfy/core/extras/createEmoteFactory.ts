/**
 * Real implementation of Hyperfy createEmoteFactory
 * Creates animation factories from GLTF files for character emotes
 */

import * as THREE from 'three';
import type { GLTF } from '../libs/gltfloader/GLTFLoader';

export interface EmoteFactory {
  gltf: GLTF;
  url: string;
  clips: THREE.AnimationClip[];
  duration: number;
  toClip: (target: THREE.Object3D) => THREE.AnimationClip | null;
  retarget: (sourceSkeleton: THREE.Skeleton, targetSkeleton: THREE.Skeleton) => void;
}

/**
 * Creates an emote factory from a GLTF file
 * @param gltf - The loaded GLTF object containing animation data
 * @param url - The source URL of the emote
 * @returns EmoteFactory object
 */
export function createEmoteFactory(gltf: GLTF, url: string): EmoteFactory {
  const clips = gltf.animations || [];

  // Calculate total duration from all clips
  const duration = clips.reduce((max, clip) => Math.max(max, clip.duration), 0);

  // Find the root bone for retargeting
  let rootBone: THREE.Bone | null = null;
  gltf.scene.traverse((child) => {
    if (child instanceof THREE.Bone && !rootBone) {
      rootBone = child;
    }
  });

  const factory: EmoteFactory = {
    gltf,
    url,
    clips,
    duration,

    /**
     * Creates an animation clip for the target object
     * @param target - The target object to apply animations to
     * @returns Animation clip or null if no compatible animations
     */
    toClip: (target: THREE.Object3D): THREE.AnimationClip | null => {
      if (clips.length === 0) return null;

      // Find the skeleton in the target
      let targetSkeleton: THREE.Skeleton | null = null;
      target.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh && child.skeleton) {
          targetSkeleton = child.skeleton;
        }
      });

      if (!targetSkeleton) {
        console.warn('[EmoteFactory] No skeleton found in target');
        return null;
      }

      // Clone the first clip as base
      const baseClip = clips[0];
      const retargetedClip = baseClip.clone();
      retargetedClip.name = `${baseClip.name}_retargeted`;

      // Retarget the animation tracks
      const retargetedTracks: THREE.KeyframeTrack[] = [];

      for (const track of retargetedClip.tracks) {
        const trackName = track.name;
        const boneName = extractBoneName(trackName);

        // Find corresponding bone in target skeleton
        const targetBone = findBoneByName((targetSkeleton as THREE.Skeleton).bones, boneName);

        if (targetBone) {
          // Create new track with target bone's name
          const targetTrackName = trackName.replace(boneName, targetBone.name);

          let newTrack: THREE.KeyframeTrack;

          if (track instanceof THREE.QuaternionKeyframeTrack) {
            newTrack = new THREE.QuaternionKeyframeTrack(
              targetTrackName,
              track.times,
              track.values,
              track.getInterpolation()
            );
          } else if (track instanceof THREE.VectorKeyframeTrack) {
            newTrack = new THREE.VectorKeyframeTrack(
              targetTrackName,
              track.times,
              track.values,
              track.getInterpolation()
            );
          } else if (track instanceof THREE.NumberKeyframeTrack) {
            newTrack = new THREE.NumberKeyframeTrack(
              targetTrackName,
              track.times,
              track.values,
              track.getInterpolation()
            );
          } else {
            // Generic track type
            newTrack = track.clone();
            newTrack.name = targetTrackName;
          }

          retargetedTracks.push(newTrack);
        }
      }

      // Create new clip with retargeted tracks
      return new THREE.AnimationClip(
        retargetedClip.name,
        retargetedClip.duration,
        retargetedTracks,
        retargetedClip.blendMode
      );
    },

    /**
     * Retargets animations from source skeleton to target skeleton
     * @param sourceSkeleton - The source skeleton from the emote
     * @param targetSkeleton - The target skeleton to apply animations to
     */
    retarget: (sourceSkeleton: THREE.Skeleton, targetSkeleton: THREE.Skeleton): void => {
      // Build bone mapping between skeletons
      const boneMap = new Map<THREE.Bone, THREE.Bone>();

      // Map bones by name similarity
      for (const sourceBone of sourceSkeleton.bones) {
        const targetBone = findBoneByName(targetSkeleton.bones, sourceBone.name);
        if (targetBone) {
          boneMap.set(sourceBone, targetBone);
        }
      }

      // Store the mapping for later use
      factory.gltf.userData.boneMap = boneMap;
      factory.gltf.userData.targetSkeleton = targetSkeleton;
    },
  };

  return factory;
}

/**
 * Extract bone name from animation track name
 * @param trackName - Full track name (e.g., "mixamorigHips.position")
 * @returns Bone name without property
 */
function extractBoneName(trackName: string): string {
  const parts = trackName.split('.');
  return parts[0];
}

/**
 * Find bone by name in bone array
 * @param bones - Array of bones to search
 * @param name - Name to search for
 * @returns Found bone or null
 */
function findBoneByName(bones: THREE.Bone[], name: string): THREE.Bone | null {
  // First try exact match
  let found = bones.find((bone) => bone.name === name);
  if (found) return found;

  // Try case-insensitive match
  const lowerName = name.toLowerCase();
  found = bones.find((bone) => bone.name.toLowerCase() === lowerName);
  if (found) return found;

  // Try common bone name mappings
  const mappings: Record<string, string[]> = {
    hips: ['mixamorigHips', 'Hips', 'hip', 'pelvis'],
    spine: ['mixamorigSpine', 'Spine', 'spine1'],
    chest: ['mixamorigSpine2', 'Chest', 'chest', 'spine2'],
    neck: ['mixamorigNeck', 'Neck', 'neck'],
    head: ['mixamorigHead', 'Head', 'head'],
    leftShoulder: ['mixamorigLeftShoulder', 'LeftShoulder', 'shoulder_L'],
    rightShoulder: ['mixamorigRightShoulder', 'RightShoulder', 'shoulder_R'],
    leftArm: ['mixamorigLeftArm', 'LeftArm', 'arm_L'],
    rightArm: ['mixamorigRightArm', 'RightArm', 'arm_R'],
    leftForeArm: ['mixamorigLeftForeArm', 'LeftForeArm', 'forearm_L'],
    rightForeArm: ['mixamorigRightForeArm', 'RightForeArm', 'forearm_R'],
    leftHand: ['mixamorigLeftHand', 'LeftHand', 'hand_L'],
    rightHand: ['mixamorigRightHand', 'RightHand', 'hand_R'],
    leftUpLeg: ['mixamorigLeftUpLeg', 'LeftUpLeg', 'thigh_L'],
    rightUpLeg: ['mixamorigRightUpLeg', 'RightUpLeg', 'thigh_R'],
    leftLeg: ['mixamorigLeftLeg', 'LeftLeg', 'shin_L'],
    rightLeg: ['mixamorigRightLeg', 'RightLeg', 'shin_R'],
    leftFoot: ['mixamorigLeftFoot', 'LeftFoot', 'foot_L'],
    rightFoot: ['mixamorigRightFoot', 'RightFoot', 'foot_R'],
  };

  // Check if the name matches any mapping
  for (const [key, aliases] of Object.entries(mappings)) {
    if (aliases.includes(name)) {
      // Try to find bone with the key name
      found = bones.find((bone) => bone.name.toLowerCase().includes(key.toLowerCase()));
      if (found) return found;
    }
  }

  return null;
}
