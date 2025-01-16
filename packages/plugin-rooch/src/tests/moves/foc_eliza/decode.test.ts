import { describe, it, expect } from 'vitest';
import { decodeCharacterData } from '../../../moves/foc_eliza/decode';
import { CharacterData } from '../../../moves/foc_eliza/types';

describe('decodeCharacterData', () => {
    it('should correctly decode a CharacterData object', () => {
        const mockDecodedValue = {
            value: {
                id: { value: { vec: ["0x446f626279"] } },
                name: "0x446f626279",
                username: { value: { vec: ["0x646f626279"] } },
                plugins: { value: [] },
                clients: { value: [] },
                modelProvider: "0x616e7468726f706963",
                imageModelProvider: { value: { vec: [] } },
                imageVisionModelProvider: { value: { vec: [] } },
                modelEndpointOverride: { value: { vec: [] } },
                system: { value: { vec: [] } },
                bio: { value: ["0x446f6262792069732061206672656520617373697374616e742e"] },
                lore: { value: ["0x4f6e6365206120686f7573652d656c662e"] },
                messageExamples: {
                    value: [
                        [
                            {
                                user: "0x7573657231",
                                content: {
                                    text: "0x48656c6c6f21",
                                    action: { value: { vec: [] } },
                                    source: { value: { vec: [] } },
                                    url: { value: { vec: [] } },
                                    inReplyTo: { value: { vec: [] } },
                                    attachments: { value: [] }
                                }
                            }
                        ]
                    ]
                },
                postExamples: { value: ["0x446f62627920736179733a2048656c6c6f21"] },
                topics: { value: [] },
                style: {
                    all: { value: ["0x456e74687573696173746963"] },
                    chat: { value: ["0x4561676572"] },
                    post: { value: ["0x456e636f75726167696e67"] }
                },
                adjectives: { value: ["0x4c6f79616c"] },
                knowledge: { value: ["0x4d61676963"] },
                twitterProfile: { value: { vec: [] } }
            }
        };

        const expectedCharacterData: CharacterData = {
            id: "Dobby",
            name: "Dobby",
            username: "dobby",
            plugins: [],
            clients: [],
            modelProvider: "anthropic",
            imageModelProvider: null,
            imageVisionModelProvider: null,
            modelEndpointOverride: null,
            system: null,
            bio: ["Dobby is a free assistant."],
            lore: ["Once a house-elf."],
            messageExamples: [
                [
                    {
                        user: "user1",
                        content: {
                            text: "Hello!",
                            action: null,
                            source: null,
                            url: null,
                            inReplyTo: null,
                            attachments: []
                        }
                    }
                ]
            ],
            postExamples: ["Dobby says: Hello!"],
            topics: [],
            style: {
                all: ["Enthusiastic"],
                chat: ["Eager"],
                post: ["Encouraging"]
            },
            adjectives: ["Loyal"],
            knowledge: ["Magic"],
            twitterProfile: null
        };

        const result = decodeCharacterData(mockDecodedValue);
        expect(result).toEqual(expectedCharacterData);
    });

    it('should handle empty fields correctly', () => {
        const mockDecodedValue = {
            value: {
                id: { value: { vec: [] } },
                name: "0x456d707479",
                username: { value: { vec: [] } },
                plugins: { value: [] },
                clients: { value: [] },
                modelProvider: "0x656d707479",
                imageModelProvider: { value: { vec: [] } },
                imageVisionModelProvider: { value: { vec: [] } },
                modelEndpointOverride: { value: { vec: [] } },
                system: { value: { vec: [] } },
                bio: { value: [] },
                lore: { value: [] },
                messageExamples: { value: [] },
                postExamples: { value: [] },
                topics: { value: [] },
                style: {
                    all: { value: [] },
                    chat: { value: [] },
                    post: { value: [] }
                },
                adjectives: { value: [] },
                knowledge: { value: [] },
                twitterProfile: { value: { vec: [] } }
            }
        };

        const expectedCharacterData: CharacterData = {
            id: null,
            name: "Empty",
            username: null,
            plugins: [],
            clients: [],
            modelProvider: "empty",
            imageModelProvider: null,
            imageVisionModelProvider: null,
            modelEndpointOverride: null,
            system: null,
            bio: [],
            lore: [],
            messageExamples: [],
            postExamples: [],
            topics: [],
            style: {
                all: [],
                chat: [],
                post: []
            },
            adjectives: [],
            knowledge: [],
            twitterProfile: null
        };

        const result = decodeCharacterData(mockDecodedValue);
        expect(result).toEqual(expectedCharacterData);
    });

    it('should handle TwitterProfile correctly', () => {
        const mockDecodedValue = {
            value: {
                id: { value: { vec: ["0x446f626279"] } },
                name: "0x446f626279",
                username: { value: { vec: ["0x646f626279"] } },
                plugins: { value: [] },
                clients: { value: [] },
                modelProvider: "0x616e7468726f706963",
                imageModelProvider: { value: { vec: [] } },
                imageVisionModelProvider: { value: { vec: [] } },
                modelEndpointOverride: { value: { vec: [] } },
                system: { value: { vec: [] } },
                bio: { value: ["0x446f6262792069732061206672656520617373697374616e742e"] },
                lore: { value: ["0x4f6e6365206120686f7573652d656c662e"] },
                messageExamples: { value: [] },
                postExamples: { value: [] },
                topics: { value: [] },
                style: {
                    all: { value: [] },
                    chat: { value: [] },
                    post: { value: [] }
                },
                adjectives: { value: [] },
                knowledge: { value: [] },
                twitterProfile: {
                    value: {
                        vec: [{
                            id: "0x747769747465724964",
                            username: "0x646f626279",
                            screenName: "0x446f626279",
                            bio: "0x4672656520656c6620617373697374616e742e",
                            nicknames: { value: ["0x446f62", "0x446f626279"] }
                        }]
                    }
                }
            }
        };

        const expectedCharacterData: CharacterData = {
            id: "Dobby",
            name: "Dobby",
            username: "dobby",
            plugins: [],
            clients: [],
            modelProvider: "anthropic",
            imageModelProvider: null,
            imageVisionModelProvider: null,
            modelEndpointOverride: null,
            system: null,
            bio: ["Dobby is a free assistant."],
            lore: ["Once a house-elf."],
            messageExamples: [],
            postExamples: [],
            topics: [],
            style: {
                all: [],
                chat: [],
                post: []
            },
            adjectives: [],
            knowledge: [],
            twitterProfile: {
                id: "twitterId",
                username: "dobby",
                screenName: "Dobby",
                bio: "Free elf assistant.",
                nicknames: ["Dob", "Dobby"]
            }
        };

        const result = decodeCharacterData(mockDecodedValue);
        expect(result).toEqual(expectedCharacterData);
    });
});