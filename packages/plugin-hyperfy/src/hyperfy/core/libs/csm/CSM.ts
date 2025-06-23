/**
 * Local stub implementation of Hyperfy CSM (Cascaded Shadow Maps)
 * This replaces the import from '../hyperfy/src/core/libs/csm/CSM.js'
 */

import * as THREE from 'three';

export class CSM {
  camera: THREE.Camera;
  parent: THREE.Object3D;
  cascades: number;
  mode: string;
  shadowMapSize: number;
  lightDirection: THREE.Vector3;
  lightIntensity: number;
  lightNear: number;
  lightFar: number;
  lightMargin: number;
  customSplitsCallback?: (cascades: number, cameraNear: number, cameraFar: number) => number[];
  
  lights: THREE.DirectionalLight[] = [];
  shaders: Map<string, any> = new Map();

  constructor(data: {
    camera: THREE.Camera;
    parent: THREE.Object3D;
    cascades?: number;
    mode?: string;
    shadowMapSize?: number;
    lightDirection?: THREE.Vector3;
    lightIntensity?: number;
    lightNear?: number;
    lightFar?: number;
    lightMargin?: number;
    customSplitsCallback?: (cascades: number, cameraNear: number, cameraFar: number) => number[];
  }) {
    this.camera = data.camera;
    this.parent = data.parent;
    this.cascades = data.cascades || 3;
    this.mode = data.mode || 'practical';
    this.shadowMapSize = data.shadowMapSize || 2048;
    this.lightDirection = data.lightDirection || new THREE.Vector3(1, -1, 1).normalize();
    this.lightIntensity = data.lightIntensity || 1;
    this.lightNear = data.lightNear || 1;
    this.lightFar = data.lightFar || 1000;
    this.lightMargin = data.lightMargin || 100;
    this.customSplitsCallback = data.customSplitsCallback;

    this.createLights();
  }

  private createLights(): void {
    for (let i = 0; i < this.cascades; i++) {
      const light = new THREE.DirectionalLight(0xffffff, this.lightIntensity / this.cascades);
      light.castShadow = true;
      light.shadow.mapSize.width = this.shadowMapSize;
      light.shadow.mapSize.height = this.shadowMapSize;
      
      light.shadow.camera.near = this.lightNear;
      light.shadow.camera.far = this.lightFar;
      
      this.parent.add(light);
      this.parent.add(light.target);
      this.lights.push(light);
    }
  }

  updateShadowBounds(): void {
    // Stub implementation - would calculate cascade splits and update shadow camera bounds
  }

  update(): void {
    this.updateShadowBounds();
  }

  updateUniforms(): void {
    // Stub implementation - would update shader uniforms
  }

  setupMaterial(material: THREE.Material): void {
    // Stub implementation - would modify material to support CSM
  }

  updateCascades(cascades: number): void {
    // Update the number of cascades
    if (cascades !== this.cascades) {
      this.dispose();
      this.cascades = cascades;
      this.createLights();
    }
  }

  updateShadowMapSize(size: number): void {
    // Update shadow map size for all cascade lights
    this.shadowMapSize = size;
    this.lights.forEach(light => {
      light.shadow.mapSize.width = size;
      light.shadow.mapSize.height = size;
      if (light.shadow.map) {
        light.shadow.map.dispose();
        light.shadow.map = null;
      }
    });
  }

  updateFrustums(): void {
    // Update frustum bounds for each cascade
    // Stub implementation
  }

  dispose(): void {
    this.lights.forEach(light => {
      if (light.shadow.map) {
        light.shadow.map.dispose();
      }
      this.parent.remove(light);
      this.parent.remove(light.target);
    });
    this.lights = [];
    this.shaders.clear();
  }
}

export default CSM; 