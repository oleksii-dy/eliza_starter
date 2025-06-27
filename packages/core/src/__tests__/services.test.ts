import { expect, mock } from 'bun:test';
import { createUnitTest } from '../test-utils/unifiedTestSuite';
import { createService, defineService } from '../services';
import { Service, ServiceType } from '../types';
import type { IAgentRuntime } from '../types';
import { AgentRuntime } from '../runtime';

const serviceBuilderSuite = createUnitTest('Service Builder Tests');

// Test context for shared data
interface ServiceBuilderTestContext {
  mockRuntime: IAgentRuntime;
}

serviceBuilderSuite.beforeEach<ServiceBuilderTestContext>((context) => {
  context.mockRuntime = {} as IAgentRuntime;
});

serviceBuilderSuite.addTest<ServiceBuilderTestContext>('createService builds custom class', async (context) => {
  const Builder = createService('TEST')
    .withDescription('d')
    .withStart(
      async () =>
        new (class extends Service {
          capabilityDescription = 'Test service';
          async stop() {}
        })()
    )
    .build();
  const instance = await (Builder as any).start(context.mockRuntime);
  expect(instance).toBeInstanceOf(Service);
  await instance.stop();
});

serviceBuilderSuite.addTest<ServiceBuilderTestContext>('defineService builds from definition', async (context) => {
  const Def = defineService({
    serviceType: 'DEF' as any,
    description: 'desc',
    start: async () =>
      new (class extends Service {
        capabilityDescription = 'Definition service';
        async stop() {}
      })(),
  });
  const instance = await (Def as any).start(context.mockRuntime);
  expect(instance).toBeInstanceOf(Service);
  await instance.stop();
});

serviceBuilderSuite.addTest<ServiceBuilderTestContext>('should throw error when start function is not defined', async (context) => {
  // This test covers lines 59-60 - error when startFn is not defined
  const Builder = createService('NO_START').withDescription('Service without start').build();

  await expect((Builder as any).start(context.mockRuntime)).rejects.toThrow(
    'Start function not defined for service NO_START'
  );
});

serviceBuilderSuite.addTest<ServiceBuilderTestContext>('should call custom stop function when provided', async (context) => {
  // This test covers lines 65-68 - custom stopFn execution
  const stopFn = mock().mockResolvedValue(undefined);

  const Builder = createService('WITH_STOP')
    .withDescription('Service with custom stop')
    .withStart(
      async () =>
        new (class extends Service {
          capabilityDescription = 'Service with stop';
          async stop() {}
        })()
    )
    .withStop(stopFn)
    .build();

  await (Builder as any).start(context.mockRuntime);
  const builtInstance = new Builder();
  await builtInstance.stop();

  expect(stopFn).toHaveBeenCalled();
});

serviceBuilderSuite.addTest<ServiceBuilderTestContext>('should handle service without stop function', async (context) => {
  // This test ensures the else branch (no stopFn) is covered
  const Builder = createService('NO_STOP')
    .withDescription('Service without custom stop')
    .withStart(
      async () =>
        new (class extends Service {
          capabilityDescription = 'Service without stop';
          async stop() {}
        })()
    )
    .build();

  const builtInstance = new Builder();
  // Should not throw when no stopFn is provided
  await expect(builtInstance.stop()).resolves.toBeUndefined();
});

serviceBuilderSuite.addTest<ServiceBuilderTestContext>('defineService should provide default stop function', async (context) => {
  // This test covers the default stop function in defineService
  const Def = defineService({
    serviceType: 'DEF_NO_STOP' as any,
    description: 'Definition without stop',
    start: async () =>
      new (class extends Service {
        capabilityDescription = 'Definition without stop';
        async stop() {}
      })(),
    // Note: no stop function provided
  });

  await (Def as any).start(context.mockRuntime);
  const defInstance = new Def();
  // Should not throw when using default stop
  await expect(defInstance.stop()).resolves.toBeUndefined();
});

serviceBuilderSuite.addTest<ServiceBuilderTestContext>('should set all properties correctly with chaining', async (context) => {
  // Test the full builder chain
  const description = 'Test service description';
  const serviceType = 'CHAINED_SERVICE';

  const builder = createService(serviceType);
  const withDesc = builder.withDescription(description);

  // Verify chaining returns the same instance
  expect(withDesc).toBe(builder);

  const startFn = async () =>
    new (class extends Service {
      capabilityDescription = 'Chained service';
      async stop() {}
    })();
  const withStart = withDesc.withStart(startFn);
  expect(withStart).toBe(builder);

  const stopFn = async () => {};
  const withStop = withStart.withStop(stopFn);
  expect(withStop).toBe(builder);

  const BuiltClass = withStop.build();
  expect((BuiltClass as any).serviceType).toBe(serviceType);
});

const agentRuntimeServicesSuite = createUnitTest('AgentRuntime v2 Service Methods Tests');

// Test context for AgentRuntime tests
interface AgentRuntimeTestContext {
  runtime: AgentRuntime;
}

agentRuntimeServicesSuite.beforeEach<AgentRuntimeTestContext>((context) => {
  const mockAdapter = {
    init: mock().mockResolvedValue(undefined),
    runMigrations: mock().mockResolvedValue(undefined),
    ensureAgentExists: mock().mockResolvedValue({ id: 'agent-123' }),
    getEntityById: mock().mockResolvedValue(null),
    createEntity: mock().mockResolvedValue(true),
    getRoom: mock().mockResolvedValue(null),
    createRoom: mock().mockResolvedValue('room-123'),
    getParticipantsForRoom: mock().mockResolvedValue([]),
    addParticipant: mock().mockResolvedValue(true),
    ensureEmbeddingDimension: mock().mockResolvedValue(undefined),
  } as any;

  context.runtime = new AgentRuntime({
    character: { name: 'TestBot', bio: '' } as any,
    adapter: mockAdapter,
  });
});

agentRuntimeServicesSuite.addTest<AgentRuntimeTestContext>('getServicesByType should return all services of a given type', async (context) => {
  class WalletServiceA extends Service {
    static serviceName = 'WALLET_A';
    static serviceType = ServiceType.WALLET;
    capabilityDescription = 'd';
    static async start(runtime: IAgentRuntime) {
      return new this(runtime);
    }
    async stop() {}
  }
  class WalletServiceB extends Service {
    static serviceName = 'WALLET_B';
    static serviceType = ServiceType.WALLET;
    capabilityDescription = 'd';
    static async start(runtime: IAgentRuntime) {
      return new this(runtime);
    }
    async stop() {}
  }
  class TaskService extends Service {
    static serviceName = 'TASK_A';
    static serviceType = ServiceType.TASK;
    capabilityDescription = 'd';
    static async start(runtime: IAgentRuntime) {
      return new this(runtime);
    }
    async stop() {}
  }

  await context.runtime.registerService(WalletServiceA);
  await context.runtime.registerService(WalletServiceB);
  await context.runtime.registerService(TaskService);

  expect(context.runtime.getService('WALLET_A')).toBeInstanceOf(WalletServiceA);
  expect(context.runtime.getService('WALLET_B')).toBeInstanceOf(WalletServiceB);

  const walletServices = context.runtime.getServicesByType(ServiceType.WALLET);
  expect(walletServices).toHaveLength(2);
  expect(walletServices.some((s) => s instanceof WalletServiceA)).toBe(true);
  expect(walletServices.some((s) => s instanceof WalletServiceB)).toBe(true);

  const taskServices = context.runtime.getServicesByType(ServiceType.TASK);
  expect(taskServices).toHaveLength(1);
  expect(taskServices[0]).toBeInstanceOf(TaskService);
});

agentRuntimeServicesSuite.addTest<AgentRuntimeTestContext>('getServicesByType should return an empty array if no services match', async (context) => {
  class TaskServiceDef extends Service {
    static serviceName = 'TASK_A';
    static serviceType = ServiceType.TASK;
    capabilityDescription = 'd';
    static async start(runtime: IAgentRuntime) {
      return new this(runtime);
    }
    async stop() {}
  }

  await context.runtime.registerService(TaskServiceDef);
  const browserServices = context.runtime.getServicesByType(ServiceType.BROWSER);
  expect(browserServices).toHaveLength(0);
});
