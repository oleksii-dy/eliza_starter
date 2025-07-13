import { describe, it, expect } from 'bun:test';
import {
    localVoiceModels,
    getVoiceModelsByProvider,
    providerPluginMap,
    getAllVoiceModels,
} from '../voice-models';

describe('Voice Models Configuration', () => {
    describe('localVoiceModels', () => {
        it('should contain the four standard local voice models', () => {
            expect(localVoiceModels).toHaveLength(4);

            const expectedModels = [
                { value: 'female_1', label: 'Local Voice - Female 1', gender: 'female' },
                { value: 'female_2', label: 'Local Voice - Female 2', gender: 'female' },
                { value: 'male_1', label: 'Local Voice - Male 1', gender: 'male' },
                { value: 'male_2', label: 'Local Voice - Male 2', gender: 'male' },
            ];

            expectedModels.forEach((expected, index) => {
                expect(localVoiceModels[index]).toMatchObject({
                    value: expected.value,
                    label: expected.label,
                    provider: 'local',
                    gender: expected.gender,
                    language: 'en',
                    features: ['natural', 'local'],
                });
            });
        });

        it('should have correct provider mapping', () => {
            expect(providerPluginMap.local).toBe('@elizaos/plugin-node');
        });
    });

    describe('getVoiceModelsByProvider', () => {
        it('should return local voice models for local provider', () => {
            const localModels = getVoiceModelsByProvider('local');
            expect(localModels).toEqual(localVoiceModels);
            expect(localModels).toHaveLength(4);
        });

        it('should return empty array for unknown provider', () => {
            const unknownModels = getVoiceModelsByProvider('unknown' as any);
            expect(unknownModels).toEqual([]);
        });
    });

    describe('getAllVoiceModels', () => {
        it('should include local voice models in the complete list', () => {
            const allModels = getAllVoiceModels();
            const localModelsInAll = allModels.filter(model => model.provider === 'local');

            expect(localModelsInAll).toHaveLength(4);
            expect(localModelsInAll).toEqual(localVoiceModels);
        });
    });
});