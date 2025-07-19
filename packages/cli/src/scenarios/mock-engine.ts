import { IAgentRuntime, Service } from '@elizaos/core';
import { Mock } from './schema';
import { isEqual } from 'lodash';

export class MockEngine {
    private originalGetService: IAgentRuntime['getService'];

    constructor(private runtime: IAgentRuntime) {
        this.originalGetService = this.runtime.getService.bind(this.runtime);
    }

    applyMocks(mocks: Mock[]) {
        if (mocks.length === 0) return;
        
        const mockRegistry = new Map<string, Mock[]>();
        for (const mock of mocks) {
            const key = `${mock.service}.${mock.method}`;
            if (!mockRegistry.has(key)) {
                mockRegistry.set(key, []);
            }
            mockRegistry.get(key)!.push(mock);
        }
        
        this.runtime.getService = <T extends Service>(name: string): T | null => {
            const originalService = this.originalGetService<T>(name);

            if (!originalService) {
                return null;
            }
            
            return new Proxy(originalService as any, {
                get: (target, prop) => {
                    const key = `${name}.${String(prop)}`;
                    if (mockRegistry.has(key)) {
                        return (...args: any[]) => {
                            const mocks = mockRegistry.get(key)!;
                            const conditionalMock = mocks.find(m => m.when && isEqual(m.when.args, args));
                            if (conditionalMock) {
                                return conditionalMock.response;
                            }
                            const genericMock = mocks.find(m => !m.when);
                            if (genericMock) {
                                return genericMock.response;
                            }
                        };
                    }
                    return Reflect.get(target, prop);
                },
            });
        };
    }

    restore() {
        this.runtime.getService = this.originalGetService;
    }
} 