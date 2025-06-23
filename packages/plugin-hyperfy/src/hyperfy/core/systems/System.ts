/**
 * Local stub implementation of Hyperfy System base class
 * This replaces the import from '../hyperfy/src/core/systems/System'
 */

export interface SystemWorld {
  entities?: any;
  network?: any;
  chat?: any;
  stage?: any;
  camera?: any;
  rig?: any;
  controls?: any;
  loader?: any;
  livekit?: any;
  actions?: any;
  environment?: any;
  // Add other world properties as needed
  [key: string]: any;
}

export class System {
  public world: SystemWorld;
  public enabled: boolean = true;

  constructor(world: SystemWorld) {
    this.world = world;
  }

  /**
   * Called when the system is initialized
   */
  init?(): void | Promise<void>;

  /**
   * Called every frame
   * @param delta - Time since last frame in seconds
   */
  tick?(delta: number): void;

  /**
   * Called when the system is destroyed
   */
  destroy?(): void;

  /**
   * Enable the system
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable the system
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Check if the system is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
} 