import * as Storage from '@web3-storage/w3up-client';
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory'
import { CarReader } from '@ipld/car'
import { importDAG } from '@ucanto/core/delegation'
import { StorageClientConfig } from '../types'; // Import the config type
import { Signer } from '@ucanto/principal/ed25519';


class StorageClientSingleton {
    private static instance: Storage.Client;

    private constructor() {
        // Private constructor to prevent direct instantiation
    }

    public static async getInstance(config: StorageClientConfig): Promise<Storage.Client> {
        if (!config.agentPrivateKey) {
            throw new Error("Agent private key is missing from the storage client configuration");
        }
        const principal = Signer.parse(config.agentPrivateKey)
        const store = new StoreMemory()
        if (!StorageClientSingleton.instance) {
            StorageClientSingleton.instance = await Storage.create({ principal, store })
        }
        return StorageClientSingleton.instance;
    }

    public static async init(config: StorageClientConfig): Promise<void> {
        const client = await StorageClientSingleton.getInstance(config);
        try {
            if (!config.agentDelegation) {
                throw new Error("Agent delegation is missing from the storage client configuration");
            }
            const delegationProof = await this.parseDelegation(config.agentDelegation);
            const space = await client.addSpace(delegationProof);
            await client.setCurrentSpace(space.did())
            console.log(`Storage client initialized`);
        } catch (error) {
            console.error("Storage client failed to initialize", error);
        }
    }


    /**
     * Parses a delegation from a base64 encoded CAR file
     * @param data - The base64 encoded CAR file
     * @returns The parsed delegation
     */
    static async parseDelegation(data: string) {
        const blocks = []
        const reader = await CarReader.fromBytes(Buffer.from(data, 'base64'))
        for await (const block of reader.blocks()) {
            blocks.push(block)
        }
        return importDAG(blocks)
    }

}

export const getStorageClient = async () => StorageClientSingleton.getInstance(
    {
        agentPrivateKey: process.env.AGENT_PRIVATE_KEY,
        agentDelegation: process.env.AGENT_DELEGATION,
        gateway: process.env.GATEWAY || 'https://w3s.link',
        rootIndexCID: process.env.ROOT_INDEX_CID,
    }
);
export const initStorageClient = StorageClientSingleton.init;
