/**
 * Real implementation of Hyperfy GLTFLoader using Three.js
 * This wraps the Three.js GLTFLoader with Hyperfy-specific extensions
 */

import {
  GLTFLoader as ThreeGLTFLoader,
  GLTF as ThreeGLTF,
} from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import * as THREE from 'three';

export interface GLTF extends ThreeGLTF {
  scene: THREE.Group;
  scenes: THREE.Group[];
  animations: THREE.AnimationClip[];
  asset: {
    generator?: string;
    version?: string;
    [key: string]: any;
  };
  cameras: THREE.Camera[];
  userData: any;
  parser: any;
}

export class GLTFLoader extends ThreeGLTFLoader {
  private dracoLoader: DRACOLoader | null = null;
  private ktx2Loader: KTX2Loader | null = null;

  constructor(manager?: THREE.LoadingManager) {
    super(manager);
  }

  /**
   * Set up Draco decoder for compressed geometry
   */
  setDRACOLoader(dracoLoader: DRACOLoader): this {
    this.dracoLoader = dracoLoader;
    super.setDRACOLoader(dracoLoader);
    return this;
  }

  /**
   * Set up KTX2 loader for compressed textures
   */
  setKTX2Loader(ktx2Loader: KTX2Loader): this {
    this.ktx2Loader = ktx2Loader;
    super.setKTX2Loader(ktx2Loader);
    return this;
  }

  /**
   * Configure mesh optimization settings
   */
  setMeshoptDecoder(decoder: any): this {
    super.setMeshoptDecoder(decoder);
    return this;
  }

  /**
   * Load GLTF/GLB file with Hyperfy-specific processing
   */
  load(
    url: string,
    onLoad: (gltf: GLTF) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void
  ): void {
    super.load(
      url,
      (gltf: ThreeGLTF) => {
        // Process the loaded GLTF for Hyperfy compatibility
        const processedGltf = this.processGLTF(gltf);
        onLoad(processedGltf as GLTF);
      },
      onProgress,
      onError
    );
  }

  /**
   * Load GLTF/GLB file asynchronously
   */
  loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<GLTF> {
    return super.loadAsync(url, onProgress).then((gltf: ThreeGLTF) => {
      return this.processGLTF(gltf) as GLTF;
    });
  }

  /**
   * Parse GLTF data with Hyperfy-specific processing
   */
  parse(
    data: ArrayBuffer | string,
    path: string,
    onLoad: (gltf: GLTF) => void,
    onError?: (event: ErrorEvent) => void
  ): void {
    super.parse(
      data,
      path,
      (gltf: ThreeGLTF) => {
        const processedGltf = this.processGLTF(gltf);
        onLoad(processedGltf as GLTF);
      },
      onError
    );
  }

  /**
   * Process loaded GLTF for Hyperfy compatibility
   */
  private processGLTF(gltf: ThreeGLTF): GLTF {
    const hyperfyGltf = gltf as GLTF;

    // Process the scene for Hyperfy
    hyperfyGltf.scene.traverse((child) => {
      // Enable shadow casting/receiving by default
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        // Process materials for better compatibility
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => this.processMaterial(mat));
          } else {
            this.processMaterial(child.material);
          }
        }
      }

      // Store original names for Hyperfy reference
      if (child.name) {
        child.userData.originalName = child.name;
      }

      // Process animations if present
      if (child.animations && child.animations.length > 0) {
        child.userData.hasAnimations = true;
      }
    });

    // Process animations for Hyperfy
    if (hyperfyGltf.animations && hyperfyGltf.animations.length > 0) {
      hyperfyGltf.animations.forEach((clip, index) => {
        // Ensure unique names for animations
        if (!clip.name) {
          clip.name = `Animation_${index}`;
        }
        // Store original duration for reference
        (clip as any).userData = (clip as any).userData || {};
        (clip as any).userData.originalDuration = clip.duration;
      });
    }

    // Add Hyperfy metadata
    hyperfyGltf.userData.hyperfyProcessed = true;
    hyperfyGltf.userData.processedAt = Date.now();

    return hyperfyGltf;
  }

  /**
   * Process material for Hyperfy compatibility
   */
  private processMaterial(material: THREE.Material): void {
    // Enable transparency support if needed
    if (
      material instanceof THREE.MeshStandardMaterial ||
      material instanceof THREE.MeshPhysicalMaterial
    ) {
      if (material.map && material.map.format === THREE.RGBAFormat) {
        material.transparent = true;
      }

      // Optimize for performance
      material.side = THREE.FrontSide; // Default to front side only

      // Store original values
      material.userData.originalSide = material.side;
      material.userData.originalTransparent = material.transparent;
    }
  }

  /**
   * Create optimized Draco loader for Hyperfy
   */
  static createDracoLoader(): DRACOLoader {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    return dracoLoader;
  }

  /**
   * Create optimized KTX2 loader for Hyperfy
   */
  static createKTX2Loader(renderer: THREE.WebGLRenderer): KTX2Loader {
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath('https://www.gstatic.com/basis-universal/');
    ktx2Loader.detectSupport(renderer);
    return ktx2Loader;
  }
}

// Re-export as default
export default GLTFLoader;
