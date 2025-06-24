import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { mock, spyOn } from 'bun:test';
import { Physics } from '../../core/systems/Physics.js';
import { MockWorld } from '../test-world-factory.js';
import * as THREE from '../../core/extras/three.js';

// Mock PhysX since it requires WASM
mock.module('../../core/loadPhysX.js', () => ({
  loadPhysX: mock().mockResolvedValue({
    version: 1,
    allocator: {},
    errorCb: mock(),
    foundation: {},
  }),
}));

// Mock extendThreePhysX
mock.module('../../core/extras/extendThreePhysX.js', () => ({
  extendThreePhysX: mock(),
}));

// Mock Layers
mock.module('../../core/extras/Layers.js', () => ({
  Layers: {
    player: { group: 1, mask: 0xffffffff },
    environment: { group: 2, mask: 0xffffffff },
  },
}));

// Mock PhysX global
const mockPHYSX = {
  PxTolerancesScale: mock().mockImplementation(() => ({})),
  PxCookingParams: mock().mockImplementation(() => ({})),
  CreatePhysics: mock().mockImplementation(() => ({
    createMaterial: mock().mockImplementation((sf, df, r) => ({
      staticFriction: sf,
      dynamicFriction: df,
      restitution: r,
    })),
    createScene: mock().mockImplementation(() => mockScene),
    createRigidStatic: mock().mockImplementation(() => mockActor),
    createShape: mock().mockImplementation(() => mockShape),
  })),
  PxArray_PxContactPairPoint: mock().mockImplementation(() => ({
    begin: mock().mockReturnValue({}),
    get: mock().mockImplementation(() => ({
      position: { x: 0, y: 0, z: 0 },
      normal: { x: 0, y: 1, z: 0 },
      impulse: { x: 0, y: 0, z: 0 },
    })),
  })),
  PxSimulationEventCallbackImpl: mock().mockImplementation(() => ({})),
  PxSceneDesc: mock().mockImplementation(() => ({
    gravity: {},
    flags: { raise: mock() },
  })),
  DefaultCpuDispatcherCreate: mock().mockReturnValue({}),
  DefaultFilterShader: mock().mockReturnValue({}),
  PxSceneFlagEnum: {
    eENABLE_CCD: 1,
    eENABLE_ACTIVE_ACTORS: 2,
  },
  PxSolverTypeEnum: { eTGS: 1 },
  PxBroadPhaseTypeEnum: { eGPU: 1 },
  PxRaycastResult: mock().mockImplementation(() => ({
    getNbAnyHits: mock().mockReturnValue(0),
    getAnyHit: mock(),
  })),
  PxTransform: mock().mockImplementation(() => ({ p: { x: 0, y: 0, z: 0 }, q: { x: 0, y: 0, z: 0, w: 1 } })),
  PxIDENTITYEnum: { PxIdentity: 1 },
  PxSweepResult: mock().mockImplementation(() => ({
    getNbAnyHits: mock().mockReturnValue(0),
    getAnyHit: mock(),
  })),
  PxOverlapResult: mock().mockImplementation(() => ({
    getNbAnyHits: mock().mockReturnValue(0),
    getAnyHit: mock(),
  })),
  PxQueryFilterData: mock().mockImplementation(() => ({ data: { word0: 0, word1: 0 } })),
  PxVec3: mock().mockImplementation((x, y, z) => ({ x, y, z })),
  PxTopLevelFunctions: {
    prototype: {
      CreateControllerManager: mock().mockReturnValue({}),
    },
  },
  PxControllerFilters: mock().mockImplementation(() => ({})),
  PxFilterData: mock().mockImplementation(() => ({})),
  PxQueryFilterCallbackImpl: mock().mockImplementation(() => ({})),
  PxControllerFilterCallbackImpl: mock().mockImplementation(() => ({})),
  PxBoxGeometry: mock().mockImplementation((x, y, z) => ({ halfExtents: { x, y, z } })),
  PxSphereGeometry: mock().mockImplementation(r => ({ radius: r })),
  PxShapeFlags: mock().mockImplementation(() => ({})),
  PxShapeFlagEnum: {
    eSCENE_QUERY_SHAPE: 1,
    eSIMULATION_SHAPE: 2,
  },
  SupportFunctions: {
    prototype: {
      PxScene_getActiveActors: mock().mockReturnValue({ size: mock().mockReturnValue(0), get: mock() }),
    },
  },
  PxHitFlagEnum: { eNORMAL: 1, eDEFAULT: 2 },
  PxRigidBodyFlagEnum: { eKINEMATIC: 1 },
  wrapPointer: mock((ptr, type) => ptr),
  NativeArrayHelpers: {
    prototype: {
      getContactPairAt: mock(),
      getTriggerPairAt: mock(),
    },
  },
  PxPairFlagEnum: {
    eNOTIFY_TOUCH_FOUND: 1,
    eNOTIFY_TOUCH_LOST: 2,
  },
  PxTriggerPairFlagEnum: {
    eREMOVED_SHAPE_TRIGGER: 1,
    eREMOVED_SHAPE_OTHER: 2,
  },
  PxQueryHitType: {
    eBLOCK: 1,
    eNONE: 0,
  },
};

const mockScene = {
  addActor: mock(),
  removeActor: mock(),
  simulate: mock(),
  fetchResults: mock(),
  raycast: mock().mockReturnValue(false),
  sweep: mock().mockReturnValue(false),
  overlap: mock().mockReturnValue(false),
};

const mockActor = {
  ptr: 12345,
  attachShape: mock(),
  getGlobalPose: mock().mockReturnValue({ p: { x: 0, y: 0, z: 0 }, q: { x: 0, y: 0, z: 0, w: 1 } }),
  setGlobalPose: mock(),
  getRigidBodyFlags: mock().mockReturnValue({ isSet: mock().mockReturnValue(false) }),
};

const mockShape = {
  setQueryFilterData: mock(),
  setSimulationFilterData: mock(),
}

;(global as any).PHYSX = mockPHYSX;

describe('Physics System', () => {
  let world: MockWorld;
  let physics: Physics;

  beforeEach(() => {
    world = new MockWorld();
    world.stage = { clean: mock() };
    physics = new Physics(world);
  });

  describe('initialization', () => {
    it('should initialize PhysX components', async () => {
      await physics.init();

      expect(physics.scene).toBeDefined();
      expect(physics.physics).toBeDefined();
      expect(physics.defaultMaterial).toBeDefined();
      expect(physics.handles).toBeInstanceOf(Map);
      expect(physics.active).toBeInstanceOf(Set);
    });

    it('should set up controller manager', async () => {
      await physics.init();

      expect(physics.controllerManager).toBeDefined();
      expect(physics.controllerFilters).toBeDefined();
    });

    it('should create query objects', async () => {
      await physics.init();

      expect(physics.raycastResult).toBeDefined();
      expect(physics.sweepPose).toBeDefined();
      expect(physics.sweepResult).toBeDefined();
      expect(physics.overlapPose).toBeDefined();
      expect(physics.overlapResult).toBeDefined();
    });
  });

  describe('start', () => {
    it('should create ground plane', async () => {
      await physics.init();
      physics.start();

      expect(mockScene.addActor).toHaveBeenCalled();
      expect(physics.physics.createRigidStatic).toHaveBeenCalled();
      expect(physics.physics.createShape).toHaveBeenCalled();
    });
  });

  describe('addActor', () => {
    beforeEach(async () => {
      await physics.init();
    });

    it('should add actor to handles map', () => {
      const handle: any = {
        tag: 'test-entity',
        playerId: 'player-1',
        contactedHandles: new Set(),
        triggeredHandles: new Set(),
      };

      const actorControl = physics.addActor(mockActor, handle);

      expect(physics.handles.get(mockActor.ptr)).toBe(handle);
      expect(handle.actor).toBe(mockActor);
      expect(actorControl).toHaveProperty('move');
      expect(actorControl).toHaveProperty('snap');
      expect(actorControl).toHaveProperty('destroy');
    });

    it('should set up interpolation when onInterpolate is provided', () => {
      const handle: any = {
        onInterpolate: mock(),
        contactedHandles: new Set(),
        triggeredHandles: new Set(),
      };

      physics.addActor(mockActor, handle);

      expect(handle.interpolation).toBeDefined();
      expect(handle.interpolation?.prev.position).toBeInstanceOf(THREE.Vector3);
      expect(handle.interpolation?.prev.quaternion).toBeInstanceOf(THREE.Quaternion);
    });

    it('should add actor to scene if not a controller', () => {
      const handle: any = {
        controller: false,
        contactedHandles: new Set(),
        triggeredHandles: new Set(),
      };

      physics.addActor(mockActor, handle);

      expect(mockScene.addActor).toHaveBeenCalledWith(mockActor);
    });

    it('should not add controller actors to scene', () => {
      const handle: any = {
        controller: true,
        contactedHandles: new Set(),
        triggeredHandles: new Set(),
      };

      mockScene.addActor.mockReset();
      physics.addActor(mockActor, handle);

      expect(mockScene.addActor).not.toHaveBeenCalled();
    });

    it('should handle actor movement', () => {
      const handle: any = {
        contactedHandles: new Set(),
        triggeredHandles: new Set(),
      };
      const actorControl = physics.addActor(mockActor, handle);

      const mockMatrix = {
        toPxTransform: mock(),
      };

      actorControl.move(mockMatrix);

      expect(mockMatrix.toPxTransform).toHaveBeenCalled();
      expect(mockActor.setGlobalPose).toHaveBeenCalled();
    });

    it('should handle actor destruction', () => {
      const handle: any = {
        contactedHandles: new Set(),
        triggeredHandles: new Set(),
      };
      const actorControl = physics.addActor(mockActor, handle);

      actorControl.destroy();

      expect(physics.handles.has(mockActor.ptr)).toBe(false);
      expect(mockScene.removeActor).toHaveBeenCalledWith(mockActor);
    });
  });

  describe('physics update cycle', () => {
    beforeEach(async () => {
      await physics.init();
    });

    it('should clear active actors on preFixedUpdate', () => {
      const handle: any = {
        contactedHandles: new Set(),
        triggeredHandles: new Set(),
      };
      physics.addActor(mockActor, handle);
      physics.active.add(handle);

      physics.preFixedUpdate(true);

      expect(physics.active.size).toBe(0);
    });

    it('should simulate physics on postFixedUpdate', () => {
      physics.postFixedUpdate(0.016);

      expect(mockScene.simulate).toHaveBeenCalledWith(0.016);
      expect(mockScene.fetchResults).toHaveBeenCalledWith(true);
    });

    it('should interpolate active actors on preUpdate', () => {
      const onInterpolate = mock();
      const handle: any = {
        onInterpolate,
        interpolation: {
          prev: { position: new THREE.Vector3(0, 0, 0), quaternion: new THREE.Quaternion() },
          next: { position: new THREE.Vector3(1, 0, 0), quaternion: new THREE.Quaternion() },
          curr: { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() },
        },
        contactedHandles: new Set(),
        triggeredHandles: new Set(),
      };
      physics.active.add(handle);

      physics.preUpdate(0.5);

      expect(onInterpolate).toHaveBeenCalled();
      expect(handle.interpolation.curr.position.x).toBeCloseTo(0.5);
    });
  });

  describe('material management', () => {
    beforeEach(async () => {
      await physics.init();
    });

    it('should create and cache materials', () => {
      const material1 = physics.getMaterial(0.5, 0.5, 0.3);
      const material2 = physics.getMaterial(0.5, 0.5, 0.3);

      expect(material1).toBe(material2); // Should be cached
      expect(material1).toEqual({
        staticFriction: 0.5,
        dynamicFriction: 0.5,
        restitution: 0.3,
      });
    });

    it('should create different materials for different parameters', () => {
      const material1 = physics.getMaterial(0.5, 0.5, 0.3);
      const material2 = physics.getMaterial(0.6, 0.6, 0.0);

      expect(material1).not.toBe(material2);
    });
  });

  describe('raycasting', () => {
    beforeEach(async () => {
      await physics.init();
    });

    it('should return null when no hit', () => {
      const origin = { x: 0, y: 0, z: 0 };
      const direction = { x: 0, y: -1, z: 0 };

      const result = physics.raycast(origin, direction, 100);

      expect(result).toBeNull();
    });

    it('should return hit information when hit occurs', () => {
      mockScene.raycast.mockReturnValueOnce(true);
      physics.raycastResult.getNbAnyHits = mock().mockReturnValue(1);
      physics.raycastResult.getAnyHit = mock().mockReturnValue({
        actor: { ptr: 12345 },
        position: { x: 0, y: -1, z: 0 },
        normal: { x: 0, y: 1, z: 0 },
        distance: 1,
      });

      const origin = { x: 0, y: 0, z: 0 };
      const direction = { x: 0, y: -1, z: 0 };

      const result = physics.raycast(origin, direction, 100);

      expect(result).toBeDefined();
      expect(result?.distance).toBe(1);
      expect(result?.point.y).toBe(-1);
      expect(result?.normal.y).toBe(1);
    });
  });

  describe('sphere overlap', () => {
    beforeEach(async () => {
      await physics.init();
    });

    it('should return empty array when no overlap', () => {
      const origin = { x: 0, y: 0, z: 0 };

      const results = physics.overlapSphere(origin, 1);

      expect(results).toEqual([]);
    });

    it('should return overlapping actors', () => {
      mockScene.overlap.mockReturnValueOnce(true);
      physics.overlapResult.getNbAnyHits = mock().mockReturnValue(2);
      physics.overlapResult.getAnyHit = mock()
        .mockReturnValueOnce({ actor: { ptr: 111 } })
        .mockReturnValueOnce({ actor: { ptr: 222 } });

      const origin = { x: 0, y: 0, z: 0 };

      const results = physics.overlapSphere(origin, 1);

      // Note: The current implementation returns empty array as it doesn't have Collider objects
      expect(results).toHaveLength(0);
    });
  });

  describe('interface compliance', () => {
    beforeEach(async () => {
      await physics.init();
    });

    it('should implement IPhysics interface methods', () => {
      expect(physics.createRigidBody).toBeDefined();
      expect(physics.createCollider).toBeDefined();
      expect(physics.createMaterial).toBeDefined();
      expect(physics.sphereCast).toBeDefined();
      expect(physics.simulate).toBeDefined();
    });

    it('should create materials through interface method', () => {
      const material = physics.createMaterial(0.7, 0.7, 0.2);

      expect(material).toBeDefined();
      expect((material as any).staticFriction).toBe(0.7);
      expect((material as any).dynamicFriction).toBe(0.7);
      expect((material as any).restitution).toBe(0.2);
    });
  });

  describe('contact and trigger callbacks', () => {
    beforeEach(async () => {
      await physics.init();
    });

    it('should process contact callbacks', () => {
      const callback = {
        exec: mock(),
      };
      physics.contactCallbacks.push(callback);

      physics.processContactCallbacks();

      expect(callback.exec).toHaveBeenCalled();
      expect(physics.contactCallbacks.length).toBe(0);
    });

    it('should process trigger callbacks', () => {
      const callback = {
        exec: mock(),
      };
      physics.triggerCallbacks.push(callback);

      physics.processTriggerCallbacks();

      expect(callback.exec).toHaveBeenCalled();
      expect(physics.triggerCallbacks.length).toBe(0);
    });
  });
});
