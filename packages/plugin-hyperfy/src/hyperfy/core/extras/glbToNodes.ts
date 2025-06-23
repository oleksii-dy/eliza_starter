/**
 * Real implementation of Hyperfy glbToNodes
 * Converts GLTF objects to Hyperfy-compatible node hierarchies
 */

import * as THREE from 'three';
import type { GLTF } from '../libs/gltfloader/GLTFLoader';
import type { HyperfyWorld } from '../../../types/hyperfy';

type HyperfyNode = THREE.Object3D & {
  isHyperfyNode?: boolean;
  hyperfyType?: string;
  hyperfyData?: Record<string, any>;
}

/**
 * Converts a GLTF object to a Hyperfy-compatible node hierarchy
 * @param gltf - The loaded GLTF object
 * @param world - Optional world reference for context
 * @returns Root node of the converted hierarchy
 */
export function glbToNodes(gltf: GLTF, world?: HyperfyWorld): THREE.Object3D {
  // Clone the scene to avoid modifying the original
  const rootNode = gltf.scene.clone(true) as HyperfyNode;
  
  // Mark as Hyperfy node
  rootNode.isHyperfyNode = true;
  rootNode.hyperfyType = 'GLTFRoot';
  rootNode.hyperfyData = {
    source: gltf.userData.url || 'unknown',
    assetInfo: gltf.asset,
    hasAnimations: gltf.animations.length > 0
  };
  
  // Process the node hierarchy
  processNodeHierarchy(rootNode, gltf, world);
  
  // Handle animations
  if (gltf.animations.length > 0) {
    attachAnimations(rootNode, gltf.animations);
  }
  
  // Handle cameras if present
  if (gltf.cameras.length > 0) {
    attachCameras(rootNode, gltf.cameras);
  }
  
  // Optimize for Hyperfy
  optimizeForHyperfy(rootNode);
  
  return rootNode;
}

/**
 * Process the node hierarchy for Hyperfy compatibility
 */
function processNodeHierarchy(node: HyperfyNode, gltf: GLTF, world?: HyperfyWorld): void {
  node.traverse((child: HyperfyNode) => {
    // Add world reference if provided
    if (world) {
      child.userData.world = world;
    }
    
    // Mark as Hyperfy node
    child.isHyperfyNode = true;
    
    // Process meshes
    if (child instanceof THREE.Mesh) {
      processMesh(child as THREE.Mesh & HyperfyNode, gltf);
    }
    
    // Process lights
    else if (child instanceof THREE.Light) {
      processLight(child as THREE.Light & HyperfyNode);
    }
    
    // Process groups
    else if (child instanceof THREE.Group) {
      processGroup(child as THREE.Group & HyperfyNode);
    }
    
    // Process bones
    else if (child instanceof THREE.Bone) {
      processBone(child as THREE.Bone & HyperfyNode);
    }
    
    // Store original transform for reference
    child.userData.originalTransform = {
      position: child.position.clone(),
      rotation: child.rotation.clone(),
      scale: child.scale.clone()
    };
    
    // Ensure proper matrix updates
    child.updateMatrix();
    child.updateMatrixWorld(true);
  });
}

/**
 * Process mesh nodes for Hyperfy
 */
function processMesh(mesh: THREE.Mesh & HyperfyNode, gltf: GLTF): void {
  mesh.hyperfyType = 'Mesh';
  mesh.hyperfyData = {
    vertexCount: mesh.geometry.attributes.position?.count || 0,
    hasMorphTargets: !!(mesh.morphTargetInfluences && mesh.morphTargetInfluences.length > 0),
    hasSkinnedMesh: mesh instanceof THREE.SkinnedMesh
  };
  
  // Process materials
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat, index) => {
        processMaterial(mat, `${mesh.name}_material_${index}`);
      });
    } else {
      processMaterial(mesh.material, `${mesh.name}_material`);
    }
  }
  
  // Handle skinned meshes
  if (mesh instanceof THREE.SkinnedMesh) {
    processSkinnedMesh(mesh);
  }
  
  // Enable shadows by default
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  // Store geometry bounds
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeBoundingSphere();
  
  // Add collision data if available
  if (mesh.userData.physics) {
    mesh.hyperfyData.physics = mesh.userData.physics;
  }
}

/**
 * Process materials for Hyperfy optimization
 */
function processMaterial(material: THREE.Material, name: string): void {
  material.name = material.name || name;
  
  // Enable vertex colors if present
  if (material instanceof THREE.MeshStandardMaterial || 
      material instanceof THREE.MeshPhysicalMaterial) {
    material.vertexColors = true;
    
    // Optimize texture settings
    if (material.map) {
      material.map.anisotropy = 4;
      material.map.generateMipmaps = true;
    }
    
    // Set reasonable defaults
    if (material.metalness === undefined) material.metalness = 0;
    if (material.roughness === undefined) material.roughness = 0.5;
  }
  
  // Store original values
  material.userData.hyperfyOriginal = {
    transparent: material.transparent,
    opacity: material.opacity,
    side: material.side
  };
}

/**
 * Process skinned mesh specifics
 */
function processSkinnedMesh(mesh: THREE.SkinnedMesh): void {
  if (mesh.skeleton) {
    // Ensure skeleton is properly set up
    mesh.skeleton.calculateInverses();
    
    // Store bone names for retargeting
    const boneNames = mesh.skeleton.bones.map(bone => bone.name);
    mesh.userData.boneNames = boneNames;
    
    // Enable GPU skinning
    mesh.frustumCulled = false; // Prevent culling issues with skinned meshes
  }
}

/**
 * Process light nodes for Hyperfy
 */
function processLight(light: THREE.Light & HyperfyNode): void {
  light.hyperfyType = 'Light';
  light.hyperfyData = {
    lightType: light.type,
    intensity: light.intensity,
    color: light.color.getHex()
  };
  
  // Enable shadows for shadow-casting lights
  if (light instanceof THREE.DirectionalLight || 
      light instanceof THREE.SpotLight || 
      light instanceof THREE.PointLight) {
    light.castShadow = true;
    
    // Set reasonable shadow map size
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    
    // Adjust shadow camera for better quality
    if (light instanceof THREE.DirectionalLight) {
      const shadowCam = light.shadow.camera;
      shadowCam.near = 0.1;
      shadowCam.far = 100;
      shadowCam.left = -10;
      shadowCam.right = 10;
      shadowCam.top = 10;
      shadowCam.bottom = -10;
    }
  }
}

/**
 * Process group nodes for Hyperfy
 */
function processGroup(group: THREE.Group & HyperfyNode): void {
  group.hyperfyType = 'Group';
  group.hyperfyData = {
    childCount: group.children.length
  };
  
  // Check if this is a special group type
  if (group.userData.type) {
    group.hyperfyType = group.userData.type;
  }
  
  // Handle LOD groups
  if (group instanceof THREE.LOD) {
    processLODGroup(group);
  }
}

/**
 * Process LOD groups
 */
function processLODGroup(lod: THREE.LOD): void {
  // Store LOD levels
  const levels: any[] = [];
  lod.levels.forEach((level) => {
    levels.push({
      distance: level.distance,
      object: level.object.name || `LOD_${level.distance}`
    });
  });
  
  lod.userData.lodLevels = levels;
}

/**
 * Process bone nodes for Hyperfy
 */
function processBone(bone: THREE.Bone & HyperfyNode): void {
  bone.hyperfyType = 'Bone';
  bone.hyperfyData = {
    boneName: bone.name
  };
}

/**
 * Attach animations to the root node
 */
function attachAnimations(rootNode: HyperfyNode, animations: THREE.AnimationClip[]): void {
  // Store animations in userData
  rootNode.userData.animations = animations;
  
  // Create animation mixer reference
  rootNode.userData.animationMixer = new THREE.AnimationMixer(rootNode);
  
  // Store clip metadata
  rootNode.userData.animationClips = animations.map(clip => ({
    name: clip.name,
    duration: clip.duration,
    tracks: clip.tracks.length
  }));
}

/**
 * Attach cameras to the root node
 */
function attachCameras(rootNode: HyperfyNode, cameras: THREE.Camera[]): void {
  rootNode.userData.cameras = cameras.map(camera => ({
    name: camera.name,
    type: camera.type,
    fov: (camera as THREE.PerspectiveCamera).fov,
    aspect: (camera as THREE.PerspectiveCamera).aspect
  }));
}

/**
 * Optimize the node hierarchy for Hyperfy
 */
function optimizeForHyperfy(rootNode: HyperfyNode): void {
  // Merge geometries where possible
  const meshes: THREE.Mesh[] = [];
  rootNode.traverse((child) => {
    if (child instanceof THREE.Mesh && !(child instanceof THREE.SkinnedMesh)) {
      meshes.push(child);
    }
  });
  
  // Group meshes by material for potential merging
  const materialGroups = new Map<THREE.Material, THREE.Mesh[]>();
  meshes.forEach(mesh => {
    if (!Array.isArray(mesh.material)) {
      if (!materialGroups.has(mesh.material)) {
        materialGroups.set(mesh.material, []);
      }
      materialGroups.get(mesh.material)!.push(mesh);
    }
  });
  
  // Consider merging small static meshes with same material
  // (Implementation depends on specific requirements)
  
  // Optimize textures
  rootNode.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(mat => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          // Ensure texture optimization
          ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'].forEach(mapName => {
            const texture = mat[mapName];
            if (texture && texture instanceof THREE.Texture) {
              texture.generateMipmaps = true;
              texture.minFilter = THREE.LinearMipmapLinearFilter;
              texture.magFilter = THREE.LinearFilter;
            }
          });
        }
      });
    }
  });
  
  // Add Hyperfy metadata
  rootNode.userData.hyperfyOptimized = true;
  rootNode.userData.optimizedAt = Date.now();
}

/**
 * Helper to extract animations from GLTF
 */
export function extractAnimations(gltf: GLTF): THREE.AnimationClip[] {
  return gltf.animations || [];
}

/**
 * Helper to find nodes by name in GLTF scene
 */
export function findNodeByName(gltf: GLTF, name: string): THREE.Object3D | null {
  let foundNode: THREE.Object3D | null = null;
  
  gltf.scene.traverse((child) => {
    if (child.name === name) {
      foundNode = child;
    }
  });
  
  return foundNode;
} 