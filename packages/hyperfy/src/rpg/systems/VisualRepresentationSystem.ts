import * as THREE from 'three';
import { World } from '../../types';
import { System } from '../../core/systems/System';
import { RPGEntity } from '../entities/RPGEntity';
import { Mesh } from '../../core/nodes/Mesh';
import { Group } from '../../core/nodes/Group';

/**
 * Visual templates for different entity types
 */
export const VISUAL_TEMPLATES = {
  // Items
  sword: {
    color: 0xff4444, // Red
    size: { width: 0.15, height: 1.2, depth: 0.1 },
    animations: ['swing_down']
  },
  bow: {
    color: 0x8b4513, // Brown
    size: { width: 0.2, height: 1, depth: 0.1 },
    animations: ['draw']
  },
  staff: {
    color: 0x9400d3, // Purple
    size: { width: 0.15, height: 1.5, depth: 0.15 },
    animations: ['cast']
  },
  shield: {
    color: 0x808080, // Gray
    size: { width: 0.8, height: 1, depth: 0.2 },
    animations: ['block']
  },
  potion: {
    color: 0x00ff00, // Green
    size: { width: 0.3, height: 0.4, depth: 0.3 },
    animations: ['bubble']
  },
  food: {
    color: 0xffa500, // Orange
    size: { width: 0.3, height: 0.3, depth: 0.3 },
    animations: ['rotate']
  },
  armor: {
    color: 0x708090, // Slate gray
    size: { width: 0.6, height: 0.8, depth: 0.3 },
    animations: ['shimmer']
  },
  helmet: {
    color: 0x696969, // Dim gray
    size: { width: 0.4, height: 0.4, depth: 0.4 },
    animations: ['shimmer']
  },
  boots: {
    color: 0x654321, // Dark brown
    size: { width: 0.3, height: 0.2, depth: 0.4 },
    animations: ['shimmer']
  },
  gloves: {
    color: 0x8b7355, // Tan
    size: { width: 0.2, height: 0.3, depth: 0.1 },
    animations: ['shimmer']
  },
  gem: {
    color: 0x00ffff, // Cyan
    size: { width: 0.2, height: 0.2, depth: 0.2 },
    animations: ['sparkle', 'rotate']
  },
  coin: {
    color: 0xffd700, // Gold
    size: { width: 0.3, height: 0.05, depth: 0.3 },
    animations: ['rotate', 'bounce']
  },

  // NPCs/Mobs
  goblin: {
    color: 0x228b22, // Forest green
    size: { width: 0.6, height: 0.8, depth: 0.6 },
    animations: ['walk', 'attack', 'die']
  },
  skeleton: {
    color: 0xf5f5dc, // Beige
    size: { width: 0.5, height: 1.5, depth: 0.5 },
    animations: ['walk', 'attack', 'die']
  },
  hill_giant: {
    color: 0x8b4513, // Saddle brown
    size: { width: 1.2, height: 2.5, depth: 1.2 },
    animations: ['walk', 'attack', 'die', 'stomp']
  },
  guard: {
    color: 0x4169e1, // Royal blue
    size: { width: 0.7, height: 1.8, depth: 0.7 },
    animations: ['walk', 'patrol', 'attack']
  },
  merchant: {
    color: 0xdaa520, // Goldenrod
    size: { width: 0.7, height: 1.6, depth: 0.7 },
    animations: ['idle', 'gesture']
  },
  quest_giver: {
    color: 0xff1493, // Deep pink
    size: { width: 0.7, height: 1.7, depth: 0.7 },
    animations: ['idle', 'wave', 'point']
  },

  // Containers
  chest: {
    color: 0x8b4513, // Brown
    size: { width: 1, height: 0.8, depth: 0.8 },
    animations: ['open', 'close']
  },
  barrel: {
    color: 0x654321, // Dark brown
    size: { width: 0.6, height: 0.8, depth: 0.6 },
    animations: ['wobble']
  },
  crate: {
    color: 0xdeb887, // Burly wood
    size: { width: 0.8, height: 0.8, depth: 0.8 },
    animations: ['shake']
  },

  // Special
  bank_chest: {
    color: 0xffd700, // Gold
    size: { width: 1.2, height: 1, depth: 1 },
    animations: ['open', 'close', 'shimmer']
  },
  spawn_point: {
    color: 0x00ff00, // Green
    size: { width: 0.5, height: 2, depth: 0.5 },
    animations: ['pulse', 'rotate']
  },

  // Default fallback
  default: {
    color: 0x888888, // Gray
    size: { width: 0.5, height: 0.5, depth: 0.5 },
    animations: ['pulse']
  }
};

interface AnimationState {
  entityId: string;
  animationType: string;
  startTime: number;
  duration: number;
  loop: boolean;
  originalPosition?: { x: number; y: number; z: number };
  originalRotation?: { x: number; y: number; z: number };
}

/**
 * System that manages visual representations for all RPG entities
 */
export class VisualRepresentationSystem extends System {
  private entityVisuals: Map<string, { mesh: Mesh; group: Group; template: any }> = new Map();
  private activeAnimations: Map<string, AnimationState> = new Map();

  constructor(world: World) {
    super(world);
  }

  /**
   * Initialize the system
   */
  async init(options: any): Promise<void> {
    // No initialization needed
  }

  /**
   * Create visual representation for an entity
   */
  createVisual(entity: RPGEntity, templateName?: string): void {
    // Remove existing visual if any
    this.removeVisual(entity.data.id);

    // Determine template
    const template = this.getTemplate(entity, templateName);

    // Create group node for the entity
    const group = new Group();

    // Create mesh node
    const mesh = new Mesh({
      type: 'box',
      width: template.size.width,
      height: template.size.height,
      depth: template.size.depth,
      material: this.createMaterial(template.color),
    });

    // Add mesh to group
    group.add(mesh);

    // Store visual group without adding to entity node
    // (The hyperfy node system is separate from Three.js scene graph)
    // The visual is tracked in our entityVisuals map instead

    // Store visual reference
    this.entityVisuals.set(entity.data.id, { mesh, group, template });

    // Start idle animation if entity has one
    if (template.animations.includes('idle')) {
      this.playAnimation(entity.data.id, 'idle', true);
    }
  }

  /**
   * Get template for entity
   */
  private getTemplate(entity: RPGEntity, templateName?: string): any {
    // Use provided template name
    if (templateName && VISUAL_TEMPLATES[templateName]) {
      return VISUAL_TEMPLATES[templateName];
    }

    // Try to determine from entity type/name
    const entityType = entity.data.type?.toLowerCase() || '';
    const entityName = entity.data.name?.toLowerCase() || '';

    // Check for direct matches
    for (const [key, template] of Object.entries(VISUAL_TEMPLATES)) {
      if (entityType.includes(key) || entityName.includes(key)) {
        return template;
      }
    }

    // Check for item types
    const itemComponent = entity.getComponent('item');
    if (itemComponent) {
      const itemType = itemComponent.type?.toLowerCase() || '';
      for (const [key, template] of Object.entries(VISUAL_TEMPLATES)) {
        if (itemType.includes(key)) {
          return template;
        }
      }
    }

    // Check for NPC types
    const npcComponent = entity.getComponent('npc');
    if (npcComponent) {
      const npcType = npcComponent.type?.toLowerCase() || '';
      for (const [key, template] of Object.entries(VISUAL_TEMPLATES)) {
        if (npcType.includes(key)) {
          return template;
        }
      }
    }

    // Default
    return VISUAL_TEMPLATES.default;
  }

  /**
   * Create material with color
   */
  private createMaterial(color: number): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color,
      opacity: 0.9,
      transparent: true
    });
  }

  /**
   * Play animation for entity
   */
  playAnimation(entityId: string, animationType: string, loop: boolean = false, duration: number = 1000): void {
    const visual = this.entityVisuals.get(entityId);
    if (!visual) {return;}

    // Cancel current animation
    this.stopAnimation(entityId);

    // Create animation state
    const animationState: AnimationState = {
      entityId,
      animationType,
      startTime: Date.now(),
      duration,
      loop,
            originalPosition: { 
        x: visual.group.position.x || 0, 
        y: visual.group.position.y || 0, 
        z: visual.group.position.z || 0 
      },
      originalRotation: { 
        x: visual.group.rotation.x || 0, 
        y: visual.group.rotation.y || 0, 
        z: visual.group.rotation.z || 0 
      }
    };

    this.activeAnimations.set(entityId, animationState);
  }

  /**
   * Stop animation for entity
   */
  stopAnimation(entityId: string): void {
    const animation = this.activeAnimations.get(entityId);
    if (!animation) {return;}

    const visual = this.entityVisuals.get(entityId);
    if (visual && animation.originalPosition && animation.originalRotation) {
      // Reset to original position/rotation
      visual.group.position.copy(animation.originalPosition as any);
      visual.group.rotation.copy(animation.originalRotation as any);
    }

    this.activeAnimations.delete(entityId);
  }

  /**
   * Update animations
   */
  update(delta: number): void {
    const currentTime = Date.now();

    for (const [entityId, animation] of this.activeAnimations) {
      const visual = this.entityVisuals.get(entityId);
      if (!visual) {
        this.activeAnimations.delete(entityId);
        continue;
      }

      const elapsed = currentTime - animation.startTime;
      const progress = Math.min(elapsed / animation.duration, 1);

      // Apply animation based on type
      this.applyAnimation(visual, animation, progress);

      // Check if animation is complete
      if (progress >= 1) {
        if (animation.loop) {
          // Restart animation
          animation.startTime = currentTime;
        } else {
          // Remove completed animation
          this.stopAnimation(entityId);
        }
      }
    }
  }

  /**
   * Apply animation to visual
   */
  private applyAnimation(visual: { mesh: Mesh; group: Group; template: any }, animation: AnimationState, progress: number): void {
    switch (animation.animationType) {
      case 'walk':
        // Simple bobbing motion
        visual.group.position.y = animation.originalPosition!.y + Math.sin(progress * Math.PI * 4) * 0.1;
        visual.group.position.x = animation.originalPosition!.x + Math.sin(progress * Math.PI * 2) * 0.05;
        break;

      case 'attack':
      case 'swing_down':
        // Swing down motion
        visual.group.rotation.x = animation.originalRotation!.x - Math.sin(progress * Math.PI) * 0.5;
        visual.group.position.y = animation.originalPosition!.y - Math.sin(progress * Math.PI) * 0.2;
        break;

      case 'die':
        // Fall over
        visual.group.rotation.z = animation.originalRotation!.z + progress * Math.PI / 2;
        visual.group.position.y = animation.originalPosition!.y - progress * 0.5;
        // Set opacity if material exists
        if (visual.mesh._material) {
          visual.mesh._material.opacity = 1 - progress * 0.5;
        }
        break;

      case 'open':
        // Lid opening (rotate top part)
        visual.group.rotation.x = animation.originalRotation!.x - progress * 0.3;
        break;

      case 'close':
        // Lid closing
        visual.group.rotation.x = animation.originalRotation!.x + (1 - progress) * 0.3;
        break;

      case 'pulse':
        // Scale pulsing
        const scale = 1 + Math.sin(progress * Math.PI * 2) * 0.2;
        visual.group.scale.set(scale, scale, scale);
        break;

      case 'rotate':
        // Continuous rotation
        visual.group.rotation.y = animation.originalRotation!.y + progress * Math.PI * 2;
        break;

      case 'bounce':
        // Bouncing motion
        visual.group.position.y = animation.originalPosition!.y + Math.abs(Math.sin(progress * Math.PI * 2)) * 0.3;
        break;

      case 'shimmer':
        // Material shimmer effect
        const shimmer = 0.7 + Math.sin(progress * Math.PI * 4) * 0.3;
        if (visual.mesh._material) {
          visual.mesh._material.opacity = shimmer;
        }
        break;

      case 'sparkle':
        // Sparkle effect (scale and rotate)
        const sparkleScale = 1 + Math.sin(progress * Math.PI * 8) * 0.1;
        visual.group.scale.set(sparkleScale, sparkleScale, sparkleScale);
        visual.group.rotation.y = animation.originalRotation!.y + progress * Math.PI;
        break;

      case 'wobble':
        // Wobbling motion
        visual.group.rotation.z = animation.originalRotation!.z + Math.sin(progress * Math.PI * 4) * 0.1;
        break;

      case 'shake':
        // Shaking motion
        visual.group.position.x = animation.originalPosition!.x + (Math.random() - 0.5) * 0.05;
        visual.group.position.z = animation.originalPosition!.z + (Math.random() - 0.5) * 0.05;
        break;

      case 'cast':
        // Casting motion (raise and glow)
        visual.group.position.y = animation.originalPosition!.y + Math.sin(progress * Math.PI) * 0.3;
        if (visual.mesh._material) {
          visual.mesh._material.emissive = new THREE.Color(0xffffff);
          visual.mesh._material.emissiveIntensity = Math.sin(progress * Math.PI) * 0.5;
        }
        break;

      case 'draw':
        // Drawing bow
        visual.group.scale.x = 1 + progress * 0.3;
        break;

      case 'block':
        // Blocking motion
        visual.group.rotation.x = animation.originalRotation!.x - 0.3;
        visual.group.position.z = animation.originalPosition!.z - 0.2;
        break;

      case 'idle':
        // Gentle floating
        visual.group.position.y = animation.originalPosition!.y + Math.sin(progress * Math.PI * 2) * 0.05;
        break;

      case 'patrol':
        // Walking in place
        visual.group.position.y = animation.originalPosition!.y + Math.abs(Math.sin(progress * Math.PI * 4)) * 0.1;
        visual.group.rotation.y = animation.originalRotation!.y + Math.sin(progress * Math.PI) * 0.1;
        break;

      case 'stomp':
        // Giant stomp
        visual.group.position.y = animation.originalPosition!.y - Math.sin(progress * Math.PI) * 0.3;
        const stompScale = 1 + Math.sin(progress * Math.PI) * 0.1;
        visual.group.scale.set(stompScale, 1 - Math.sin(progress * Math.PI) * 0.1, stompScale);
        break;

      case 'wave':
        // Waving motion
        visual.group.rotation.z = animation.originalRotation!.z + Math.sin(progress * Math.PI * 2) * 0.3;
        break;

      case 'point':
        // Pointing motion
        visual.group.rotation.x = animation.originalRotation!.x - 0.2;
        break;

      case 'gesture':
        // General gesture
        visual.group.rotation.x = animation.originalRotation!.x + Math.sin(progress * Math.PI * 2) * 0.1;
        visual.group.rotation.z = animation.originalRotation!.z + Math.sin(progress * Math.PI * 2 + Math.PI/2) * 0.1;
        break;

      case 'bubble':
        // Bubbling potion
        visual.group.position.y = animation.originalPosition!.y + Math.sin(progress * Math.PI * 8) * 0.02;
        visual.group.scale.set(
          1 + Math.sin(progress * Math.PI * 8) * 0.05,
          1 + Math.sin(progress * Math.PI * 8 + Math.PI/3) * 0.05,
          1 + Math.sin(progress * Math.PI * 8 + Math.PI*2/3) * 0.05
        );
        break;
    }
  }

  /**
   * Remove visual representation
   */
  removeVisual(entityId: string): void {
    this.stopAnimation(entityId);

    const visual = this.entityVisuals.get(entityId);
    if (visual) {
      // Remove group from parent
      if (visual.group.parent) {
        visual.group.parent.remove(visual.group);
      }
      visual.group.deactivate();
      this.entityVisuals.delete(entityId);
    }
  }

  /**
   * Get visual for entity
   */
  getVisual(entityId: string): { mesh: Mesh; group: Group; template: any } | undefined {
    return this.entityVisuals.get(entityId);
  }

  /**
   * Clean up
   */
  override destroy(): void {
    // Remove all visuals
    for (const entityId of this.entityVisuals.keys()) {
      this.removeVisual(entityId);
    }

    this.entityVisuals.clear();
    this.activeAnimations.clear();

    super.destroy();
  }
}
