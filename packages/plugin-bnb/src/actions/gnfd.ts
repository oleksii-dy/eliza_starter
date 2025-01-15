import {
    MsgCreateBucket,
    MsgDeleteObject,
} from "@bnb-chain/greenfield-cosmos-types/greenfield/storage/tx";
import {
    Client,
    DelegatedPubObjectRequest,
    Long,
    VisibilityType,
} from "@bnb-chain/greenfield-js-sdk";
import { UploadFile } from "@bnb-chain/greenfield-js-sdk/dist/esm/types/sp/Common";
import {
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    Media,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { readFileSync, statSync } from "fs";
import { lookup } from "mime-types";
import { extname } from "node:path";
import { InitGnfdClient } from "../providers/gnfd";
import { initWalletProvider, WalletProvider } from "../providers/wallet";
import { greenfieldTemplate } from "../templates";

export { greenfieldTemplate };

export class GreenfieldAction {
    constructor(
        private walletProvider: WalletProvider,
        private gnfdClient: Client
    ) {}

    async getSps() {
        const sps = await this.gnfdClient.sp.getStorageProviders();

        return sps;
    }

    async selectSp() {
        const finalSps = await this.getSps();

        const selectIndex = Math.floor(Math.random() * finalSps.length);

        const secondarySpAddresses = [
            ...finalSps.slice(0, selectIndex),
            ...finalSps.slice(selectIndex + 1),
        ].map((item) => item.operatorAddress);
        const selectSpInfo = {
            id: finalSps[selectIndex].id,
            endpoint: finalSps[selectIndex].endpoint,
            primarySpAddress: finalSps[selectIndex]?.operatorAddress,
            sealAddress: finalSps[selectIndex].sealAddress,
            secondarySpAddresses,
        };

        return selectSpInfo;
    }

    async createBucket(msg: MsgCreateBucket) {
        elizaLogger.log("create bucket...");
        const createBucketTx = await this.gnfdClient.bucket.createBucket(msg);

        const createBucketTxSimulateInfo = await createBucketTx.simulate({
            denom: "BNB",
        });

        const createBucketTxRes = await createBucketTx.broadcast({
            denom: "BNB",
            gasLimit: Number(createBucketTxSimulateInfo?.gasLimit),
            gasPrice: createBucketTxSimulateInfo?.gasPrice || "5000000000",
            payer: msg.paymentAddress,
            granter: "",
            privateKey: this.walletProvider.getPk(),
        });

        elizaLogger.log("createBucketTxRes", createBucketTxRes);

        if (createBucketTxRes.code === 0) {
            elizaLogger.log("create bucket success");
        }
        return createBucketTxRes.transactionHash;
    }

    async uploadObject(msg: DelegatedPubObjectRequest) {
        const uploadRes = await this.gnfdClient.object.delegateUploadObject(
            msg,
            {
                type: "ECDSA",
                privateKey: this.walletProvider.getPk(),
            }
        );
        if (uploadRes.code === 0) {
            elizaLogger.log("upload object success");
        }
        return uploadRes.message;
    }

    async deleteObject(msg: MsgDeleteObject) {
        const deleteObjectTx = await this.gnfdClient.object.deleteObject(msg);

        const simulateInfo = await deleteObjectTx.simulate({
            denom: "BNB",
        });

        const res = await deleteObjectTx.broadcast({
            denom: "BNB",
            gasLimit: Number(simulateInfo?.gasLimit),
            gasPrice: simulateInfo?.gasPrice || "5000000000",
            payer: msg.operator,
            granter: "",
            privateKey: this.walletProvider.getPk(),
        });

        if (res.code === 0) {
            elizaLogger.log("delete success");
        }

        return res.transactionHash;
    }
}

export const greenfieldAction = {
    name: "GREENFIELD_ACTION",
    description:
        "create bucket, upload object, delete object on the greenfield chain",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting Gnfd action...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose context
        const context = composeContext({
            state,
            template: greenfieldTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context: context,
            modelClass: ModelClass.LARGE,
        });

        elizaLogger.log("content", content);

        const gnfdClient = await InitGnfdClient(runtime);
        const walletProvider = initWalletProvider(runtime);
        const action = new GreenfieldAction(walletProvider, gnfdClient);

        let result;
        const actionType = content.actionType;
        const spInfo = await action.selectSp();

        elizaLogger.log("spInfo", spInfo);

        const { bucketName, objectName } = content;
        const attachment = message.content.attachments?.[0];

        switch (actionType) {
            case "createBucket": {
                const hash = await action.createBucket({
                    bucketName: bucketName,
                    creator: walletProvider.account.address,
                    visibility: VisibilityType.VISIBILITY_TYPE_PUBLIC_READ,
                    chargedReadQuota: Long.fromString("0"),
                    paymentAddress: walletProvider.account.address,
                    primarySpAddress: spInfo.primarySpAddress,
                });
                result = `create bucket successfully, hash: ${hash}`;
                break;
            }

            case "uploadObject": {
                if (!attachment) {
                    throw new Error("no file to upload");
                }

                const uploadObjName = random(10);

                await action.uploadObject({
                    bucketName,
                    objectName: uploadObjName,
                    body: generateFile(attachment),
                    delegatedOpts: {
                        visibility: VisibilityType.VISIBILITY_TYPE_PUBLIC_READ,
                    },
                });
                result = `create bucket successfully, name: ${uploadObjName}`;
                break;
            }

            case "deleteObject": {
                const hash = await action.deleteObject({
                    bucketName,
                    objectName,
                    operator: walletProvider.account.address,
                });
                result = `delete object successfully, hash: ${hash}`;
                break;
            }
        }

        if (result) {
            callback?.({
                text: result,
            });
        } else {
            callback?.({
                text: `Unsuccessfully ${actionType}`,
                content: { ...result },
            });
        }

        try {
            return true;
        } catch (error) {
            elizaLogger.error("Error in get balance:", error.message);
            callback?.({
                text: `Getting balance failed`,
                content: { error: error.message },
            });
            return false;
        }
    },
    template: greenfieldTemplate,
    validate: async (_runtime: IAgentRuntime) => {
        return true;
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Create a bucket on greenfield",
                    action: "GREENFIELD_ACTION",
                },
            },
            {
                user: "user",
                content: {
                    text: "Upload a object on greenfield",
                    action: "GREENFIELD_ACTION",
                },
            },
            {
                user: "user",
                content: {
                    text: "Delete object on  greenfield",
                    action: "GREENFIELD_ACTION",
                },
            },
        ],
    ],
    similes: [
        "GREENFIELD_ACTION",
        "CREATE_BUCKET",
        "UPLOAD_OBJECT",
        "DELETE_BUCKET",
    ],
};

function generateFile(attachment: Media): UploadFile {
    const filePath = fixPath(attachment.url);

    elizaLogger.log("filePath", filePath);

    const stats = statSync(filePath);
    const fileSize = stats.size;
    const name = extname(filePath);
    const type = lookup(name);

    if (!type) throw new Error(`Unsupported file type: ${filePath}`);

    return {
        name: filePath,
        type,
        size: fileSize,
        content: readFileSync(filePath),
    };
}

function fixPath(url: string) {
    return url.replace("/agent/agent/", "/agent/");
}

export function random(length: number) {
    const characters = "abcdefghijklmnopqrstuvwxyz";

    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        );
    }

    return result;
}
