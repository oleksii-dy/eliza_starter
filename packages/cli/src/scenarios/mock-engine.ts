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
                get: (target, prop: string, receiver) => {
                    const key = `${name}.${prop}`;
                    
                    if (!mockRegistry.has(key)) {
                        return Reflect.get(target, prop, receiver);
                    }
                    
                    return (...args: any[]) => {
                        const potentialMocks = mockRegistry.get(key)!;
                        
                        const conditionalMock = potentialMocks.find(m => 
                            m.when && m.when.args && isEqual(args, m.when.args)
                        );
                        
                        if (conditionalMock) {
                            return Promise.resolve(conditionalMock.response);
                        }
                        
                        const genericMock = potentialMocks.find(m => !m.when);
                        
                        if (genericMock) {
                            return Promise.resolve(genericMock.response);
                        }
                        
                        return Reflect.get(target, prop, receiver)(...args);
                    };
                },
            }) as T;
        };
    }

    restoreMocks() {
        this.runtime.getService = this.originalGetService;
    }
} 