/**
 * Local stub implementation of Hyperfy Node
 * This replaces the import from '../hyperfy/src/core/nodes/Node'
 */

import * as THREE from 'three';

export interface NodeContext {
  world: any;
}

export class Node extends THREE.Object3D {
  ctx: NodeContext;
  name: string = '';
  parent: Node | null = null;
  proxy: any = null;
  visible: boolean;
  userData: Record<string, any>;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  
  constructor(ctx?: NodeContext) {
    super();
    this.ctx = ctx || { world: null };
    this.visible = true;
    this.userData = {};
    this.position = new THREE.Vector3();
    this.rotation = new THREE.Euler();
    this.scale = new THREE.Vector3(1, 1, 1);
  }
  
  setDirty(): void {
    // Stub implementation - marks node as needing update
  }
  
  activate(options?: { world?: any; label?: string }): void {
    if (options?.world) {
      this.ctx.world = options.world;
    }
    // Stub implementation - activates the node
  }
  
  deactivate(): void {
    // Stub implementation - deactivates the node
  }
  
  copy(source: Node, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.ctx = source.ctx;
    this.name = source.name;
    return this;
  }
  
  getProxy(): any {
    if (!this.proxy) {
      this.proxy = {
        name: this.name,
        position: this.position,
        rotation: this.rotation,
        scale: this.scale,
      };
    }
    return this.proxy;
  }
} 