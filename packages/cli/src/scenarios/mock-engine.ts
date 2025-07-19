import { IAgentRuntime, Service } from '@elizaos/core';
import { Mock } from './schema';
import { isEqual } from 'lodash';

export class MockEngine {
    private originalServices = new Map<string, Service>();

    constructor(private runtime: IAgentRuntime) {}

    applyMocks(mocks: Mock[]) {
        const servicesToMock = new Set(mocks.map(m => m.service));

        for (const serviceName of servicesToMock) {
            const service = this.runtime.getService(serviceName);
            if (service) {
                this.originalServices.set(serviceName, service);
                const mockHandler = this.createMockHandler(serviceName, mocks);
                const mockedService = new Proxy(service, mockHandler);
                (this.runtime.services as Map<string, Service[]>).set(serviceName, [mockedService]);
            }
        }
    }

    restoreMocks() {
        for (const [serviceName, originalService] of this.originalServices.entries()) {
            (this.runtime.services as Map<string, Service[]>).set(serviceName, [originalService]);
        }
        this.originalServices.clear();
    }

    private createMockHandler(serviceName: string, mocks: Mock[]): ProxyHandler<Service> {
        return {
            get: (target, prop, receiver) => {
                const serviceMocks = mocks.filter(m => m.service === serviceName && m.method === prop);

                if (serviceMocks.length > 0) {
                    return (...args: any[]) => {
                        const conditionalMock = serviceMocks.find(m => m.args && isEqual(args, m.args));
                        if (conditionalMock) {
                            return Promise.resolve(conditionalMock.response);
                        }

                        const genericMock = serviceMocks.find(m => !m.args);
                        if (genericMock) {
                            return Promise.resolve(genericMock.response);
                        }

                        // If no mock matches, call the original method
                        return Reflect.get(target, prop, receiver).apply(target, args);
                    };
                }

                return Reflect.get(target, prop, receiver);
            },
        };
    }
} 