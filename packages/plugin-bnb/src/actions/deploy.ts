import {
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import solc from "solc";
import {
    Abi,
    Address,
    createWalletClient,
    formatEther,
    formatUnits,
    http,
    parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import {
    erc1155Contract,
    erc20Contract,
    erc721Contract,
} from "../constants/contracts";
import { initWalletProvider, WalletProvider } from "../providers/wallet";
import { ercContractTemplate } from "../templates";
import { IDeploy1155, IDeployBasic, IDeployNFT, IDeployToken } from "../types";

export { ercContractTemplate };

export class DeployAction {
    constructor(private walletProvider: WalletProvider) {}

    async compileSolidity(contractName: string, source: string) {
        const solName = `${contractName}.sol`;
        const input = {
            language: "Solidity",
            sources: {
                [solName]: {
                    content: source,
                },
            },
            settings: {
                outputSelection: {
                    "*": {
                        "*": ["*"],
                    },
                },
            },
        };
        elizaLogger.log("Compiling contract...");
        const output = JSON.parse(solc.compile(JSON.stringify(input)));

        // check compile error
        if (output.errors) {
            const hasError = output.errors.some(
                (error) => error.type === "Error"
            );
            if (hasError) {
                elizaLogger.error(
                    `Compilation errors: ${JSON.stringify(output.errors, null, 2)}`
                );
            }
        }

        const contract = output.contracts[solName][contractName];

        if (!contract) {
            elizaLogger.error("Compilation result is empty");
        }

        elizaLogger.log("Contract compiled successfully");
        return {
            abi: contract.abi as Abi,
            bytecode: contract.evm.bytecode.object,
        };
    }

    async deployToken(
        basicParams: IDeployBasic,
        deployTokenParams: IDeployToken
    ) {
        elizaLogger.log("basicParams", basicParams);
        elizaLogger.log("deployTokenParams", deployTokenParams);
        const { privateKey, rpcUrl } = basicParams;
        const { name, symbol, decimals, totalSupply } = deployTokenParams;

        const publicClient = this.walletProvider.getPublicClient("bscTestnet");

        // check private key
        if (!privateKey) {
            elizaLogger.error(
                "Private key is not set in environment variables"
            );
            return;
        }
        elizaLogger.log("Connecting to rpc node...");
        if (!rpcUrl) {
            elizaLogger.error("rpc url is required");
            return;
        }
        const walletClient = createWalletClient({
            account: privateKeyToAccount(privateKey as Address),
            chain: bscTestnet,
            transport: http(rpcUrl),
        });

        try {
            const { abi, bytecode } = await this.compileSolidity(
                "CustomERC20",
                erc20Contract
            );

            if (!bytecode) {
                throw new Error("Bytecode is empty after compilation");
            }

            // check wallet balance
            const balance = await publicClient.getBalance({
                address: this.walletProvider.getAddress(),
            });
            elizaLogger.log(`Wallet balance: ${formatEther(balance)} BNB`);

            if (balance === 0n) {
                elizaLogger.error("Wallet has no BNB for gas fees");
            }

            const totalSupplyWithDecimals = parseUnits(
                totalSupply.toString(),
                decimals
            );
            const hash = await walletClient.deployContract({
                account: this.walletProvider.getAccount(),
                abi,
                bytecode,
                args: [name, symbol, decimals, totalSupplyWithDecimals],
            });

            elizaLogger.log("Waiting for deployment transaction...", hash);
            const receipt = await publicClient.waitForTransactionReceipt({
                hash,
            });
            const contractAddress = receipt.contractAddress;

            elizaLogger.log("Contract deployed successfully!");
            elizaLogger.log("Contract address:", contractAddress);

            elizaLogger.log("\nToken Information:");
            elizaLogger.log("=================");
            elizaLogger.log(`Name: ${name}`);
            elizaLogger.log(`Symbol: ${symbol}`);
            elizaLogger.log(`Decimals: ${decimals}`);
            elizaLogger.log(
                `Total Supply: ${formatUnits(totalSupplyWithDecimals, decimals)}`
            );

            elizaLogger.log(
                `View on BSCScan: https://testnet.bscscan.com/address/${contractAddress}`
            );

            return {
                address: contractAddress,
            };
        } catch (error) {
            elizaLogger.error("Detailed error:", error);
            throw error;
        }
    }

    async deployNFT(basicParams: IDeployBasic, deployNftParams: IDeployNFT) {
        elizaLogger.log("basicParams", basicParams);
        elizaLogger.log("deployNftParams", deployNftParams);

        const { privateKey, rpcUrl } = basicParams;
        const { baseURI, name, symbol } = deployNftParams;

        const publicClient = this.walletProvider.getPublicClient("bscTestnet");
        // check private key
        if (!privateKey) {
            elizaLogger.error(
                "Private key is not set in environment variables"
            );
            return;
        }
        elizaLogger.log("Connecting to rpc node...");
        if (!rpcUrl) {
            elizaLogger.error("rpc url is required");
            return;
        }
        const walletClient = createWalletClient({
            account: privateKeyToAccount(privateKey as Address),
            chain: bscTestnet,
            transport: http(rpcUrl),
        });

        try {
            const { abi, bytecode } = await this.compileSolidity(
                "CustomERC721",
                erc721Contract
            );
            if (!bytecode) {
                throw new Error("Bytecode is empty after compilation");
            }

            // check wallet balance
            const balance = await publicClient.getBalance({
                address: this.walletProvider.getAddress(),
            });
            elizaLogger.log(`Wallet balance: ${formatEther(balance)} BNB`);

            if (balance === 0n) {
                elizaLogger.error("Wallet has no BNB for gas fees");
            }

            const hash = await walletClient.deployContract({
                account: this.walletProvider.getAccount(),
                abi,
                bytecode,
                args: [name, symbol, baseURI],
            });

            elizaLogger.log("Waiting for deployment transaction...", hash);
            const receipt = await publicClient.waitForTransactionReceipt({
                hash,
            });

            const contractAddress = receipt.contractAddress;

            elizaLogger.log("Contract deployed successfully!");
            elizaLogger.log("Contract address:", contractAddress);

            return {
                address: contractAddress,
            };
        } catch (error) {
            elizaLogger.error("Deployment failed:", error);
            throw error;
        }
    }

    async deploy1155(basicParams: IDeployBasic, deploy1155Params: IDeploy1155) {
        const { privateKey, rpcUrl } = basicParams;
        const { baseURI, name } = deploy1155Params;

        const publicClient = this.walletProvider.getPublicClient("bscTestnet");
        // check private key
        if (!privateKey) {
            elizaLogger.error(
                "Private key is not set in environment variables"
            );
            return;
        }
        elizaLogger.log("Connecting to rpc node...");
        if (!rpcUrl) {
            elizaLogger.error("rpc url is required");
            return;
        }
        const walletClient = createWalletClient({
            account: privateKeyToAccount(privateKey as Address),
            chain: bscTestnet,
            transport: http(rpcUrl),
        });

        try {
            const { bytecode, abi } = await this.compileSolidity(
                "CustomERC1155",
                erc1155Contract
            );

            if (!bytecode) {
                throw new Error("Bytecode is empty after compilation");
            }
            // check wallet balance
            const balance = await publicClient.getBalance({
                address: this.walletProvider.getAddress(),
            });
            elizaLogger.log(`Wallet balance: ${formatEther(balance)} BNB`);

            if (balance === 0n) {
                elizaLogger.error("Wallet has no BNB for gas fees");
            }

            const hash = await walletClient.deployContract({
                account: this.walletProvider.getAccount(),
                abi,
                bytecode,
                args: [name, baseURI],
            });

            elizaLogger.log("Waiting for deployment transaction...", hash);
            const receipt = await publicClient.waitForTransactionReceipt({
                hash,
            });
            const contractAddress = receipt.contractAddress;
            elizaLogger.log("Contract deployed successfully!");
            elizaLogger.log("Contract address:", contractAddress);

            return {
                address: contractAddress,
                name: name,
                baseURI: baseURI,
            };
        } catch (error) {
            elizaLogger.error("Deployment failed:", error);
            throw error;
        }
    }
}

export const deployAction = {
    name: "DEPLOY_TOKEN",
    description:
        "Deploy token contracts (ERC20/721/1155) based on user specifications",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting deploy action...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose swap context
        const context = composeContext({
            state,
            template: ercContractTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context: context,
            modelClass: ModelClass.LARGE,
        });

        elizaLogger.log("content", content);

        const privateKey = runtime.getSetting("BSC_PRIVATE_KEY");
        const rpcUrl = runtime.getSetting("BSC_TESTNET_PROVIDER_URL");

        const walletProvider = initWalletProvider(runtime);
        const action = new DeployAction(walletProvider);

        const contractType = content.contractType;
        let result;
        switch (contractType.toLocaleLowerCase()) {
            case "erc20":
                elizaLogger.log("start deploy token....");
                result = await action.deployToken(
                    {
                        privateKey,
                        rpcUrl,
                    },
                    {
                        decimals: content.decimals,
                        symbol: content.symbol,
                        name: content.name,
                        totalSupply: content.totalSupply,
                    }
                );
                break;
            case "erc721":
                result = await action.deployNFT(
                    {
                        privateKey,
                        rpcUrl,
                    },
                    {
                        name: content.name,
                        symbol: content.symbol,
                        baseURI: content.baseURI,
                    }
                );
                break;
            case "erc1155":
                result = await action.deploy1155(
                    {
                        privateKey,
                        rpcUrl,
                    },
                    {
                        name: content.name,
                        baseURI: content.baseURI,
                    }
                );
                break;
        }

        elizaLogger.log("result: ", result);
        if (result) {
            callback?.({
                text: `Successfully create contract - ${result?.address}`,
                content: { ...result },
            });
        } else {
            callback?.({
                text: `Unsuccessfully create contract`,
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
    template: ercContractTemplate,
    validate: async (_runtime: IAgentRuntime) => {
        return true;
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "deploy an ERC20 token",
                    action: "DEPLOY_TOKEN",
                },
            },
            {
                user: "user",
                content: {
                    text: "Deploy an NFT contract",
                    action: "DEPLOY_TOKEN",
                },
            },
            {
                user: "user",
                content: {
                    text: "Deploy an ERC1155 contract",
                    action: "DEPLOY_TOKEN",
                },
            },
        ],
    ],
    similes: [
        "DEPLOY_ERC20",
        "DEPLOY_ERC721",
        "DEPLOY_ERC1155",
        "CREATE_TOKEN",
        "MINT_TOKEN",
    ],
};
