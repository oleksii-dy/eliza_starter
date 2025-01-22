import {
    type ActionExample,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    type Action,
    elizaLogger,
    composeContext,
    generateObjectDeprecated,
} from "@elizaos/core";
import { ethers } from "ethers";
import { ethstorageAvailConfig } from "../environment";
import { BlobUploader } from "../utils/uploader";
import { encodeOpBlobs } from "../utils/blobs.ts";

export const EthStorageAbi: readonly string[] = [
    'function putBlobs(bytes32[] memory _keys, uint256[] memory _blobIdxs, uint256[] memory _lengths)',
    'function putBlob(bytes32 _key, uint256 _blobIdx, uint256 _length) public payable',
    'function get(bytes32 _key, uint8 _decodeType, uint256 _off, uint256 _len) public view returns (bytes memory)',
    'function size(bytes32 _key) public view returns (uint256)',
    'function upfrontPayment() public view returns (uint256)'
];

export function stringToHex(s: string): string {
    return ethers.hexlify(ethers.toUtf8Bytes(s));
}

const KEY = "data_key";

export async function sendData(
    RPC: string, privateKey: string,
    address: string, data: Buffer
): Promise<boolean> {
    const blobUploader = await BlobUploader.create(RPC, privateKey);
    const contract = new ethers.Contract(this.contractAddr, EthStorageAbi, this.wallet);
    const hexKey = ethers.keccak256(stringToHex(KEY));
    const storageCost = await contract.upfrontPayment();
    const tx = await contract.putBlob.populateTransaction(hexKey, 0, data.length, {
        value: storageCost,
    });

    const blobs = encodeOpBlobs(data);
    const txRes = await blobUploader.sendTx(tx, blobs);
    elizaLogger.success(`Data submitted! tx: \n Tx Hash: ${txRes.hash}`);
    const receipt = await txRes.wait();
    return receipt?.status === 1;
}

const submitDataTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.


Example response:
\`\`\`json
{
    "data": "Hello World, this is the data I submitted"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested EthStorage token transfer:
- Data to be submitted

Respond with a JSON markdown block containing only the extracted values.`;

export default {
    name: "UPLOAD_DATA",
    similes: [
        "UPLOAD_DATA_TO_ETHSTORAGE",
        "SUBMIT_DATA",
        "SUBMIT_DATA_TO_ETHSTORAGE",
        "SEND_DATA",
        "SEND_DATA_TO_ETHSTORAGE",
        "POST_DATA",
        "POST_DATA_TO_ETHSTORAGE",
        "POST_DATA_ON_ETHSTORAGE_NETWORK",
        "POST_DATA_TO_ETHSTORAGE_NETWORK",
        "SEND_DATA_ON_ETHSTORAGE_NETWORK",
        "SEND_DATA_TO_ETHSTORAGE_NETWORK",
        "SUBMIT_DATA_ON_ETHSTORAGE_NETWORK",
        "SUBMIT_DATA_TO_ETHSTORAGE_NETWORK",
        "UPLOAD_DATA_ON_ETHSTORAGE_NETWORK",
        "UPLOAD_DATA_TO_ETHSTORAGE_NETWORK",
    ],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await ethstorageAvailConfig(runtime);
        return true;
    },
    description: "Submit data to EthStorage as per user command",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting SUBMIT_DATA handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose transfer context
        const submitDataContext = composeContext({
            state,
            template: submitDataTemplate,
        });

        // Generate transfer content
        const content = await generateObjectDeprecated({
            runtime,
            context: submitDataContext,
            modelClass: ModelClass.SMALL,
        });

        if (content.data != null) {
            try {
                const RPC = runtime.getSetting("ETHSTORAGE_RPC_URL");
                const privateKey = runtime.getSetting("ETHSTORAGE_PRIVATE_KEY")!;
                const address = runtime.getSetting("ETHSTORAGE_ADDRESS");

                elizaLogger.log(`Transaction Data is ${content.data}`);
                const data = Buffer.from(content.data);

                //submit data
                const submitStatus= await sendData(RPC, privateKey, address, data);
                if (submitStatus) {
                    elizaLogger.success(
                        "Data submitted successfully!"
                    );
                    if (callback) {
                        await callback({
                            text: `Data submitted successfully!`,
                            content: {},
                        });
                    }
                }

                return true;
            } catch (error) {
                elizaLogger.error("Error during data submission:", error);
                if (callback) {
                    await callback({
                        text: `Error submitting data: ${error.message}`,
                        content: {error: error.message},
                    });
                }
                return false;
            }
        } else {
            elizaLogger.log("No data mentioned to be submitted");
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Submit the following data to EthStorage 'Hello World!'",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Sure, I'll send the data 'Hello World!' to EthStorage now.",
                    action: "SUBMIT_DATA",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully submitted the data 'Hello World!' to EthStorage \nTransaction: 0x748057951ff79cea6de0e13b2ef70a1e9f443e9c83ed90e5601f8b45144a4ed4",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Submit 'Don't Fight, Unite!' to EthStorage",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Sure, I'll send the data 'Don't Fight, Unite!' to EthStorage now.",
                    action: "SUBMIT_DATA",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully submitted the data 'Don't Fight, Unite!' to EthStorage \nTransaction: 0x748057951ff79cea6de0e13b2ef70a1e9f443e9c83ed90e5601f8b45144a4ed4",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
