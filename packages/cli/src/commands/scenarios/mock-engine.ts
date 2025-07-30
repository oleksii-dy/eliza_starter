import { IAgentRuntime, Service } from '@elizaos/core';
import { Mock } from './schema';
import { isEqual } from 'lodash';

export class MockEngine {
    private originalGetService: (serviceName: string) => any;

    constructor(private runtime: IAgentRuntime) {
        this.originalGetService = this.runtime.getService.bind(this.runtime);
    }

    applyMocks(mocks: any[]) {
        const mockMap = new Map<string, any>();
        for (const mock of mocks) {
            if (!mockMap.has(mock.service)) {
                mockMap.set(mock.service, {});
            }
            mockMap.get(mock.service)[mock.method] = mock.response;
        }

        this.runtime.getService = (serviceName: string) => {
            if (mockMap.has(serviceName)) {
                const serviceMocks = mockMap.get(serviceName);
                const originalService = this.originalGetService(serviceName);
                const mockedService = { ...originalService };

                for (const methodName in serviceMocks) {
                    mockedService[methodName] = () => serviceMocks[methodName];
                }
                return mockedService;
            }
            return this.originalGetService(serviceName);
        };
    }

    restore() {
        this.runtime.getService = this.originalGetService;
    }
} 