import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { existsSync } from "fs";
import simpleGit, { CommitResult } from "simple-git";
import { Octokit } from "@octokit/rest";
import {
    elizaLogger,
    getEmbeddingZeroVector,
    IAgentRuntime,
    Memory,
    State,
    stringToUuid,
    UUID,
} from "@elizaos/core";
import { RestEndpointMethodTypes } from "@octokit/rest";
import { contextTemplate } from "./templates";
import { GitHubService } from "./services/github";

export function getRepoPath(owner: string, repo: string) {
    return path.join("/tmp", "elizaos-repos", owner, repo);
}

export async function createReposDirectory(owner: string) {
    const dirPath = path.join("/tmp", "elizaos-repos", owner);
    if (existsSync(dirPath)) {
        elizaLogger.info(`Repos directory already exists: ${dirPath}`);
        return;
    }
    try {
        // Create repos directory
        await fs.mkdir(dirPath, {
            recursive: true,
        });
    } catch (error) {
        elizaLogger.error("Error creating repos directory:", error);
        throw new Error(`Error creating repos directory: ${error}`);
    }
}

export async function cloneOrPullRepository(
    owner: string,
    repo: string,
    repoPath: string,
    branch: string = "main"
) {
    try {
        elizaLogger.info(
            `Cloning or pulling repository ${owner}/${repo}... @ branch: ${branch}`
        );
        elizaLogger.info(
            `URL: https://github.com/${owner}/${repo}.git @ branch: ${branch}`
        );

        // Clone or pull repository
        if (!existsSync(repoPath)) {
            const git = simpleGit();
            await git.clone(
                `https://github.com/${owner}/${repo}.git`,
                repoPath,
                {
                    "--branch": branch,
                }
            );
        } else {
            const git = simpleGit(repoPath);
            await git.pull();
        }
    } catch (error) {
        elizaLogger.error(
            `Error cloning or pulling repository ${owner}/${repo}:`,
            error
        );
        throw new Error(`Error cloning or pulling repository: ${error}`);
    }
}

export async function writeFiles(
    repoPath: string,
    files: Array<{ path: string; content: string }>
) {
    try {
        // check if the local repo exists
        if (!existsSync(repoPath)) {
            elizaLogger.error(
                `Repository ${repoPath} does not exist locally. Please initialize the repository first.`
            );
            throw new Error(
                `Repository ${repoPath} does not exist locally. Please initialize the repository first.`
            );
        }

        for (const file of files) {
            const filePath = path.join(repoPath, file.path);
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, file.content);
        }
    } catch (error) {
        elizaLogger.error("Error writing files:", error);
        throw new Error(`Error writing files: ${error}`);
    }
}

export async function commitAndPushChanges(
    repoPath: string,
    message: string,
    branch?: string
): Promise<CommitResult> {
    try {
        const git = simpleGit(repoPath);
        await git.add(".");
        const commit = await git.commit(message);
        let pushResult;
        if (branch) {
            pushResult = await git.push("origin", branch);
        } else {
            pushResult = await git.push();
        }
        elizaLogger.info("Push result:", pushResult);
        return commit;
    } catch (error) {
        elizaLogger.error("Error committing and pushing changes:", error);
        throw new Error(`Error committing and pushing changes: ${error}`);
    }
}

export async function checkoutBranch(
    repoPath: string,
    branch?: string,
    create: boolean = false
) {
    if (!branch) {
        return;
    }

    elizaLogger.info(`Checking out branch ${branch} in repository ${repoPath}`);

    try {
        const git = simpleGit(repoPath);

        // Get the list of branches
        const branchList = await git.branch();

        // Check if the branch exists
        const branchExists = branchList.all.includes(branch);

        if (create) {
            if (branchExists) {
                elizaLogger.warn(
                    `Branch "${branch}" already exists. Checking out instead.`
                );
                await git.checkout(branch); // Checkout the existing branch
            } else {
                // Create a new branch
                await git.checkoutLocalBranch(branch);
            }
        } else {
            if (!branchExists) {
                throw new Error(`Branch "${branch}" does not exist.`);
            }
            // Checkout an existing branch
            await git.checkout(branch);
        }
    } catch (error) {
        elizaLogger.error("Error checking out branch:", error.message);
        throw new Error(`Error checking out branch: ${error.message}`);
    }
}

export async function createPullRequest(
    token: string,
    owner: string,
    repo: string,
    branch: string,
    title: string,
    description?: string,
    base?: string
): Promise<RestEndpointMethodTypes["pulls"]["create"]["response"]["data"]> {
    try {
        const octokit = new Octokit({
            auth: token,
        });

        const pr = await octokit.pulls.create({
            owner,
            repo,
            title,
            body: description || title,
            head: branch,
            base: base || "develop",
        });
        return pr.data;
    } catch (error) {
        elizaLogger.error("Error creating pull request:", error);
        throw new Error(`Error creating pull request: ${error}`);
    }
}

export async function retrieveFiles(repoPath: string, gitPath: string) {
    // Build the search path
    const searchPath = gitPath
        ? path.join(repoPath, gitPath, "**/*")
        : path.join(repoPath, "**/*");
    elizaLogger.info(`Repo path: ${repoPath}`);
    elizaLogger.info(`Search path: ${searchPath}`);
    // Exclude `.git` directory and test files
    const ignorePatterns = [
        "**/.git/**",
        "**/.gitignore",
        "**/.github/**",
        "**/.env",
        "**/.env.local",
        "**/.env.*.local",
        "**/.vscode/**",
        "**/.idea/**",
        "**/.idea_modules/**",
        "**/.code-workspace",
        "test/**/*",
        "tests/**/*",
        "**/test/**/*",
        "**/tests/**/*",
        "**/*.test.*",
        "**/*.spec.*",
        "**/.DS_Store",
        "LICENSE",
        "CONTRIBUTING.md",
        "CODE_OF_CONDUCT.md",
    ];

    // Check if a .gitignore file exists
    const gitignorePath = path.join(repoPath, ".gitignore");
    if (existsSync(gitignorePath)) {
        const gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
        const gitignoreLines = gitignoreContent
            .split("\n")
            .map((line) => line.trim())
            .filter(
                (line) => line && !line.startsWith("#") && !line.startsWith("!")
            ) // Exclude comments and lines starting with '!'
            .map((line) => `**/${line}`); // Convert to glob patterns

        ignorePatterns.push(...gitignoreLines);
    }

    elizaLogger.info(`Ignore patterns:\n${ignorePatterns.join("\n")}`);

    const files = await glob(searchPath, {
        nodir: true,
        dot: true, // Include dotfiles
        ignore: ignorePatterns, // Exclude .git, test files and .gitignore patterns
    });

    elizaLogger.info(`Retrieved Files:\n${files.join("\n")}`);

    return files;
}

export const getFilesFromMemories = async (
    runtime: IAgentRuntime,
    message: Memory
) => {
    const allMemories = await runtime.messageManager.getMemories({
        roomId: message.roomId,
    });
    // elizaLogger.info("All Memories:", allMemories);
    // const memories = [
    //     {
    //         id: "2541ff45-8dc4-0b12-af68-24569243eabc",
    //         userId: "12dea96f-ec20-0935-a6ab-75692c994959",
    //         agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
    //         roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
    //         content: {
    //             text: 'import {\\n    Coinbase,\\n    Trade,\\n    Transfer,\\n    Wallet,\\n    WalletData,\\n    Webhook,\\n} from "@coinbase/coinbase-sdk";\\nimport { elizaLogger, IAgentRuntime, settings } from "@elizaos/core";\\nimport fs from "fs";\\nimport path from "path";\\nimport { EthereumTransaction } from "@coinbase/coinbase-sdk/dist/client";\\nimport { fileURLToPath } from "url";\\nimport { createArrayCsvWriter } from "csv-writer";\\nimport { Transaction } from "./types";\\n\\n// Dynamically resolve the file path to the src/plugins directory\\nconst __filename = fileURLToPath(import.meta.url);\\nconst __dirname = path.dirname(__filename);\\nconst baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");\\nconst tradeCsvFilePath = path.join(baseDir, "trades.csv");\\nconst transactionCsvFilePath = path.join(baseDir, "transactions.csv");\\nconst webhookCsvFilePath = path.join(baseDir, "webhooks.csv");\\n\\nexport async function initializeWallet(\\n    runtime: IAgentRuntime,\\n    networkId: string = Coinbase.networks.EthereumMainnet\\n) {\\n    let wallet: Wallet;\\n    const storedSeed =\\n        runtime.getSetting("COINBASE_GENERATED_WALLET_HEX_SEED") ??\\n        process.env.COINBASE_GENERATED_WALLET_HEX_SEED;\\n\\n    const storedWalletId =\\n        runtime.getSetting("COINBASE_GENERATED_WALLET_ID") ??\\n        process.env.COINBASE_GENERATED_WALLET_ID;\\n    if (!storedSeed || !storedWalletId) {\\n        // No stored seed or wallet ID, creating a new wallet\\n        wallet = await Wallet.create({ networkId });\\n\\n        // Export wallet data directly\\n        const walletData: WalletData = wallet.export();\\n        const walletAddress = await wallet.getDefaultAddress();\\n        try {\\n            const characterFilePath = `characters/${runtime.character.name.toLowerCase()}.character.json`;\\n            const walletIDSave = await updateCharacterSecrets(\\n                characterFilePath,\\n                "COINBASE_GENERATED_WALLET_ID",\\n                walletData.walletId\\n            );\\n            const seedSave = await updateCharacterSecrets(\\n                characterFilePath,\\n                "COINBASE_GENERATED_WALLET_HEX_SEED",\\n                walletData.seed\\n            );\\n            if (walletIDSave && seedSave) {\\n                elizaLogger.log("Successfully updated character secrets.");\\n            } else {\\n                const seedFilePath = `characters/${runtime.character.name.toLowerCase()}-seed.txt`;\\n                elizaLogger.error(\\n                    `Failed to update character secrets so adding gitignored ${seedFilePath} file please add it your env or character file and delete:`\\n                );\\n                // save it to gitignored file\\n                wallet.saveSeed(seedFilePath);\\n            }\\n            elizaLogger.log(\\n                "Wallet created and stored new wallet:",\\n                walletAddress\\n            );\\n        } catch (error) {\\n            elizaLogger.error("Error updating character secrets:", error);\\n            throw error;\\n        }\\n\\n        // Logging wallet creation\\n        elizaLogger.log("Created and stored new wallet:", walletAddress);\\n    } else {\\n        // Importing existing wallet using stored seed and wallet ID\\n        // Always defaults to base-mainnet we can\'t select the network here\\n        wallet = await Wallet.import({\\n            seed: storedSeed,\\n            walletId: storedWalletId,\\n        });\\n        const networkId = wallet.getNetworkId();\\n        elizaLogger.log("Imported existing wallet for network:", networkId);\\n\\n        // Logging wallet import\\n        elizaLogger.log(\\n            "Imported existing wallet:",\\n            await wallet.getDefaultAddress()\\n        );\\n    }\\n\\n    return wallet;\\n}\\n\\n/**\\n * Executes a trade and a charity transfer.\\n * @param {IAgentRuntime} runtime - The runtime for wallet initialization.\\n * @param {string} network - The network to use.\\n * @param {number} amount - The amount to trade and transfer.\\n * @param {string} sourceAsset - The source asset to trade.\\n * @param {string} targetAsset - The target asset to trade.\\n */\\nexport async function executeTradeAndCharityTransfer(\\n    runtime: IAgentRuntime,\\n    network: string,\\n    amount: number,\\n    sourceAsset: string,\\n    targetAsset: string\\n) {\\n    const wallet = await initializeWallet(runtime, network);\\n\\n    elizaLogger.log("Wallet initialized:", {\\n        network,\\n        address: await wallet.getDefaultAddress(),\\n    });\\n\\n    const charityAddress = getCharityAddress(network);\\n    const charityAmount = charityAddress ? amount * 0.01 : 0;\\n    const tradeAmount = charityAddress ? amount - charityAmount : amount;\\n    const assetIdLowercase = sourceAsset.toLowerCase();\\n    const tradeParams = {\\n        amount: tradeAmount,\\n        fromAssetId: assetIdLowercase,\\n        toAssetId: targetAsset.toLowerCase(),\\n    };\\n\\n    let transfer: Transfer;\\n    if (charityAddress && charityAmount > 0) {\\n        transfer = await executeTransfer(\\n            wallet,\\n            charityAmount,\\n            assetIdLowercase,\\n            charityAddress\\n        );\\n        elizaLogger.log("Charity Transfer successful:", {\\n            address: charityAddress,\\n            transactionUrl: transfer.getTransactionLink(),\\n        });\\n        await appendTransactionsToCsv([\\n            {\\n                address: charityAddress,\\n                amount: charityAmount,\\n                status: "Success",\\n                errorCode: null,\\n                transactionUrl: transfer.getTransactionLink(),\\n            },\\n        ]);\\n    }\\n\\n    const trade: Trade = await wallet.createTrade(tradeParams);\\n    elizaLogger.log("Trade initiated:", trade.toString());\\n    await trade.wait();\\n    elizaLogger.log("Trade completed successfully:", trade.toString());\\n    await appendTradeToCsv(trade);\\n    return {\\n        trade,\\n        transfer,\\n    };\\n}\\n\\nexport async function appendTradeToCsv(trade: Trade) {\\n    try {\\n        const csvWriter = createArrayCsvWriter({\\n            path: tradeCsvFilePath,\\n            header: [\\n                "Network",\\n                "From Amount",\\n                "Source Asset",\\n                "To Amount",\\n                "Target Asset",\\n                "Status",\\n                "Transaction URL",\\n            ],\\n            append: true,\\n        });\\n\\n        const formattedTrade = [\\n            trade.getNetworkId(),\\n            trade.getFromAmount(),\\n            trade.getFromAssetId(),\\n            trade.getToAmount(),\\n            trade.getToAssetId(),\\n            trade.getStatus(),\\n            trade.getTransaction().getTransactionLink() || "",\\n        ];\\n\\n        elizaLogger.log("Writing trade to CSV:", formattedTrade);\\n        await csvWriter.writeRecords([formattedTrade]);\\n        elizaLogger.log("Trade written to CSV successfully.");\\n    } catch (error) {\\n        elizaLogger.error("Error writing trade to CSV:", error);\\n    }\\n}\\n\\nexport async function appendTransactionsToCsv(transactions: Transaction[]) {\\n    try {\\n        const csvWriter = createArrayCsvWriter({\\n            path: transactionCsvFilePath,\\n            header: [\\n                "Address",\\n                "Amount",\\n                "Status",\\n                "Error Code",\\n                "Transaction URL",\\n            ],\\n            append: true,\\n        });\\n\\n        const formattedTransactions = transactions.map((transaction) => [\\n            transaction.address,\\n            transaction.amount.toString(),\\n            transaction.status,\\n            transaction.errorCode || "",\\n            transaction.transactionUrl || "",\\n        ]);\\n\\n        elizaLogger.log("Writing transactions to CSV:", formattedTransactions);\\n        await csvWriter.writeRecords(formattedTransactions);\\n        elizaLogger.log("All transactions written to CSV successfully.");\\n    } catch (error) {\\n        elizaLogger.error("Error writing transactions to CSV:", error);\\n    }\\n}\\n// create a function to append webhooks to a csv\\nexport async function appendWebhooksToCsv(webhooks: Webhook[]) {\\n    try {\\n        // Ensure the CSV file exists\\n        if (!fs.existsSync(webhookCsvFilePath)) {\\n            elizaLogger.warn("CSV file not found. Creating a new one.");\\n            const csvWriter = createArrayCsvWriter({\\n                path: webhookCsvFilePath,\\n                header: [\\n                    "Webhook ID",\\n                    "Network ID",\\n                    "Event Type",\\n                    "Event Filters",\\n                    "Event Type Filter",\\n                    "Notification URI",\\n                ],\\n            });\\n            await csvWriter.writeRecords([]); // Create an empty file with headers\\n            elizaLogger.log("New CSV file created with headers.");\\n        }\\n        const csvWriter = createArrayCsvWriter({\\n            path: webhookCsvFilePath,\\n            header: [\\n                "Webhook ID",\\n                "Network ID",\\n                "Event Type",\\n                "Event Filters",\\n                "Event Type Filter",\\n                "Notification URI",\\n            ],\\n            append: true,\\n        });\\n\\n        const formattedWebhooks = webhooks.map((webhook) => [\\n            webhook.getId(),\\n            webhook.getNetworkId(),\\n            webhook.getEventType(),\\n            JSON.stringify(webhook.getEventFilters()),\\n            JSON.stringify(webhook.getEventTypeFilter()),\\n            webhook.getNotificationURI(),\\n        ]);\\n\\n        elizaLogger.log("Writing webhooks to CSV:", formattedWebhooks);\\n        await csvWriter.writeRecords(formattedWebhooks);\\n        elizaLogger.log("All webhooks written to CSV successfully.");\\n    } catch (error) {\\n        elizaLogger.error("Error writing webhooks to CSV:", error);\\n    }\\n}\\n\\n/**\\n * Updates a key-value pair in character.settings.secrets.\\n * @param {string} characterfilePath - The file path to the character.\\n * @param {string} key - The secret key to update or add.\\n * @param {string} value - The new value for the secret key.\\n */\\nexport async function updateCharacterSecrets(\\n    characterfilePath: string,\\n    key: string,\\n    value: string\\n): Promise<boolean> {\\n    try {\\n        const characterFilePath = path.resolve(\\n            process.cwd(),\\n            characterfilePath\\n        );\\n\\n        // Check if the character file exists\\n        if (!fs.existsSync(characterFilePath)) {\\n            elizaLogger.error("Character file not found:", characterFilePath);\\n            return false;\\n        }\\n\\n        // Read the existing character file\\n        const characterData = JSON.parse(\\n            fs.readFileSync(characterFilePath, "utf-8")\\n        );\\n\\n        // Ensure settings and secrets exist in the character file\\n        if (!characterData.settings) {\\n            characterData.settings = {};\\n        }\\n        if (!characterData.settings.secrets) {\\n            characterData.settings.secrets = {};\\n        }\\n\\n        // Update or add the key-value pair\\n        characterData.settings.secrets[key] = value;\\n\\n        // Write the updated data back to the file\\n        fs.writeFileSync(\\n            characterFilePath,\\n            JSON.stringify(characterData, null, 2),\\n            "utf-8"\\n        );\\n\\n        console.log(\\n            `Updated ${key} in character.settings.secrets for ${characterFilePath}.`\\n        );\\n    } catch (error) {\\n        elizaLogger.error("Error updating character secrets:", error);\\n        return false;\\n    }\\n    return true;\\n}\\n\\nexport const getAssetType = (transaction: EthereumTransaction) => {\\n    // Check for ETH\\n    if (transaction.value && transaction.value !== "0") {\\n        return "ETH";\\n    }\\n\\n    // Check for ERC-20 tokens\\n    if (transaction.token_transfers && transaction.token_transfers.length > 0) {\\n        return transaction.token_transfers\\n            .map((transfer) => {\\n                return transfer.token_id;\\n            })\\n            .join(", ");\\n    }\\n\\n    return "N/A";\\n};\\n\\n/**\\n * Fetches and formats wallet balances and recent transactions.\\n *\\n * @param {IAgentRuntime} runtime - The runtime for wallet initialization.\\n * @param {string} networkId - The network ID (optional, defaults to ETH mainnet).\\n * @returns {Promise<{balances: Array<{asset: string, amount: string}>, transactions: Array<any>}>} - An object with formatted balances and transactions.\\n */\\nexport async function getWalletDetails(\\n    runtime: IAgentRuntime,\\n    networkId: string = Coinbase.networks.EthereumMainnet\\n): Promise<{\\n    balances: Array<{ asset: string; amount: string }>;\\n    transactions: Array<{\\n        timestamp: string;\\n        amount: string;\\n        asset: string; // Ensure getAssetType is implemented\\n        status: string;\\n        transactionUrl: string;\\n    }>;\\n}> {\\n    try {\\n        // Initialize the wallet, defaulting to the specified network or ETH mainnet\\n        const wallet = await initializeWallet(runtime, networkId);\\n\\n        // Fetch balances\\n        const balances = await wallet.listBalances();\\n        const formattedBalances = Array.from(balances, (balance) => ({\\n            asset: balance[0],\\n            amount: balance[1].toString(),\\n        }));\\n\\n        // Fetch the wallet\'s recent transactions\\n\\n        const transactionsData = [];\\n        const formattedTransactions = transactionsData.map((transaction) => {\\n            const content = transaction.content();\\n            return {\\n                timestamp: content.block_timestamp || "N/A",\\n                amount: content.value || "N/A",\\n                asset: getAssetType(content) || "N/A", // Ensure getAssetType is implemented\\n                status: transaction.getStatus(),\\n                transactionUrl: transaction.getTransactionLink() || "N/A",\\n            };\\n        });\\n\\n        // Return formatted data\\n        return {\\n            balances: formattedBalances,\\n            transactions: formattedTransactions,\\n        };\\n    } catch (error) {\\n        console.error("Error fetching wallet details:", error);\\n        throw new Error("Unable to retrieve wallet details.");\\n    }\\n}\\n\\n/**\\n * Executes a transfer.\\n * @param {Wallet} wallet - The wallet to use.\\n * @param {number} amount - The amount to transfer.\\n * @param {string} sourceAsset - The source asset to transfer.\\n * @param {string} targetAddress - The target address to transfer to.\\n */\\nexport async function executeTransferAndCharityTransfer(\\n    wallet: Wallet,\\n    amount: number,\\n    sourceAsset: string,\\n    targetAddress: string,\\n    network: string\\n) {\\n    const charityAddress = getCharityAddress(network);\\n    const charityAmount = charityAddress ? amount * 0.01 : 0;\\n    const transferAmount = charityAddress ? amount - charityAmount : amount;\\n    const assetIdLowercase = sourceAsset.toLowerCase();\\n\\n    let charityTransfer: Transfer;\\n    if (charityAddress && charityAmount > 0) {\\n        charityTransfer = await executeTransfer(\\n            wallet,\\n            charityAmount,\\n            assetIdLowercase,\\n            charityAddress\\n        );\\n        elizaLogger.log(\\n            "Charity Transfer successful:",\\n            charityTransfer.toString()\\n        );\\n    }\\n\\n    const transferDetails = {\\n        amount: transferAmount,\\n        assetId: assetIdLowercase,\\n        destination: targetAddress,\\n        gasless: assetIdLowercase === "usdc" ? true : false,\\n    };\\n    elizaLogger.log("Initiating transfer:", transferDetails);\\n    const transfer = await wallet.createTransfer(transferDetails);\\n    elizaLogger.log("Transfer initiated:", transfer.toString());\\n    await transfer.wait();\\n\\n    let responseText = `Transfer executed successfully:\\n- Amount: ${transfer.getAmount()}\\n- Asset: ${assetIdLowercase}\\n- Destination: ${targetAddress}\\n- Transaction URL: ${transfer.getTransactionLink() || ""}`;\\n\\n    if (charityTransfer) {\\n        responseText += `\\n- Charity Amount: ${charityTransfer.getAmount()}\\n- Charity Transaction URL: ${charityTransfer.getTransactionLink() || ""}`;\\n    } else {\\n        responseText += "\\n(Note: Charity transfer was not completed)";\\n    }\\n\\n    elizaLogger.log(responseText);\\n\\n    return {\\n        transfer,\\n        charityTransfer,\\n        responseText,\\n    };\\n}\\n\\n/**\\n * Executes a transfer.\\n * @param {Wallet} wallet - The wallet to use.\\n * @param {number} amount - The amount to transfer.\\n * @param {string} sourceAsset - The source asset to transfer.\\n * @param {string} targetAddress - The target address to transfer to.\\n */\\nexport async function executeTransfer(\\n    wallet: Wallet,\\n    amount: number,\\n    sourceAsset: string,\\n    targetAddress: string\\n) {\\n    const assetIdLowercase = sourceAsset.toLowerCase();\\n    const transferDetails = {\\n        amount,\\n        assetId: assetIdLowercase,\\n        destination: targetAddress,\\n        gasless: assetIdLowercase === "usdc" ? true : false,\\n    };\\n    elizaLogger.log("Initiating transfer:", transferDetails);\\n    let transfer: Transfer | undefined;\\n    try {\\n        transfer = await wallet.createTransfer(transferDetails);\\n        elizaLogger.log("Transfer initiated:", transfer.toString());\\n        await transfer.wait({\\n            intervalSeconds: 1,\\n            timeoutSeconds: 20,\\n        });\\n    } catch (error) {\\n        elizaLogger.error("Error executing transfer:", error);\\n    }\\n    return transfer;\\n}\\n\\n/**\\n * Gets the charity address based on the network.\\n * @param {string} network - The network to use.\\n * @param {boolean} isCharitable - Whether charity donations are enabled\\n * @throws {Error} If charity address for the network is not configured when charity is enabled\\n */\\nexport function getCharityAddress(\\n    network: string,\\n    isCharitable: boolean = false\\n): string | null {\\n    // Check both environment variable and passed parameter\\n    const isCharityEnabled =\\n        process.env.IS_CHARITABLE === "true" && isCharitable;\\n\\n    if (!isCharityEnabled) {\\n        return null;\\n    }\\n    const networkKey = `CHARITY_ADDRESS_${network.toUpperCase()}`;\\n    const charityAddress = settings[networkKey];\\n\\n    if (!charityAddress) {\\n        throw new Error(\\n            `Charity address not configured for network ${network}. Please set ${networkKey} in your environment variables.`\\n        );\\n    }\\n\\n    return charityAddress;\\n}\\n',
    //             hash: "69d85800b68eb2d631003c0d1216b8698e628c9da10aca43adada2814c33b87e",
    //             source: "github",
    //             attachments: [],
    //             metadata: {
    //                 path: "packages/plugin-coinbase/src/utils.ts",
    //                 repo: "eliza",
    //                 owner: "elizaOS",
    //             },
    //         },
    //     },
    //     {
    //         id: "ed4debac-82bd-0771-bb2a-84afdf518fb4",
    //         userId: "12dea96f-ec20-0935-a6ab-75692c994959",
    //         agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
    //         roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
    //         content: {
    //             text: 'import { Coinbase } from "@coinbase/coinbase-sdk";\\nimport { z } from "zod";\\nimport { WebhookEventType, WebhookEventFilter, WebhookEventTypeFilter } from "@coinbase/coinbase-sdk/dist/client";\\n\\nexport const ChargeSchema = z.object({\\n    id: z.string().nullable(),\\n    price: z.number(),\\n    type: z.string(),\\n    currency: z.string().min(3).max(3),\\n    name: z.string().min(1),\\n    description: z.string().min(1),\\n});\\n\\nexport interface ChargeContent {\\n    id: string | null;\\n    price: number;\\n    type: string;\\n    currency: string; // Currency code (e.g., USD)\\n    name: string; // Name of the charge\\n    description: string; // Description of the charge\\n}\\n\\nexport const isChargeContent = (object: any): object is ChargeContent => {\\n    if (ChargeSchema.safeParse(object).success) {\\n        return true;\\n    }\\n    console.error("Invalid content: ", object);\\n    return false;\\n};\\n\\nexport const TransferSchema = z.object({\\n    network: z.string().toLowerCase(),\\n    receivingAddresses: z.array(z.string()),\\n    transferAmount: z.number(),\\n    assetId: z.string().toLowerCase(),\\n});\\n\\nexport interface TransferContent {\\n    network: string;\\n    receivingAddresses: string[];\\n    transferAmount: number;\\n    assetId: string;\\n}\\n\\nexport const isTransferContent = (object: any): object is TransferContent => {\\n    return TransferSchema.safeParse(object).success;\\n};\\n\\nexport type Transaction = {\\n    address: string;\\n    amount: number;\\n    status: string;\\n    errorCode: string | null;\\n    transactionUrl: string | null;\\n};\\nconst assetValues = Object.values(Coinbase.assets) as [string, ...string[]];\\nexport const TradeSchema = z.object({\\n    network: z.string().toLowerCase(),\\n    amount: z.number(),\\n    sourceAsset: z.enum(assetValues),\\n    targetAsset: z.enum(assetValues),\\n    side: z.enum(["BUY", "SELL"]),\\n});\\n\\nexport interface TradeContent {\\n    network: string;\\n    amount: number;\\n    sourceAsset: string;\\n    targetAsset: string;\\n    side: "BUY" | "SELL";\\n\\n}\\n\\nexport const isTradeContent = (object: any): object is TradeContent => {\\n    return TradeSchema.safeParse(object).success;\\n};\\n\\nexport type TradeTransaction = {\\n    network: string;\\n    amount: number;\\n    sourceAsset: string;\\n    targetAsset: string;\\n    status: string;\\n    errorCode: string | null;\\n    transactionUrl: string | null;\\n};\\n\\nexport interface TokenContractContent {\\n    contractType: "ERC20" | "ERC721" | "ERC1155";\\n    name: string;\\n    symbol: string;\\n    network: string;\\n    baseURI?: string;\\n    totalSupply?: number;\\n}\\n\\nexport const TokenContractSchema = z.object({\\n    contractType: z.enum(["ERC20", "ERC721", "ERC1155"]).describe("The type of token contract to deploy"),\\n    name: z.string().describe("The name of the token"),\\n    symbol: z.string().describe("The symbol of the token"),\\n    network: z.string().describe("The blockchain network to deploy on"),\\n    baseURI: z.string().optional().describe("The base URI for token metadata (required for ERC721 and ERC1155)"),\\n    totalSupply: z.number().optional().describe("The total supply of tokens (only for ERC20)"),\\n}).refine(data => {\\n    if (data.contractType === "ERC20") {\\n        return typeof data.totalSupply === "number" || data.totalSupply === undefined;\\n    }\\n    if (["ERC721", "ERC1155"].includes(data.contractType)) {\\n        return typeof data.baseURI === "string" || data.baseURI === undefined;\\n    }\\n    return true;\\n}, {\\n    message: "Invalid token contract content",\\n    path: ["contractType"],\\n});\\n\\nexport const isTokenContractContent = (obj: any): obj is TokenContractContent => {\\n    return TokenContractSchema.safeParse(obj).success;\\n};\\n\\n// Add to types.ts\\nexport interface ContractInvocationContent {\\n    contractAddress: string;\\n    method: string;\\n    abi: any[];\\n    args?: Record<string, any>;\\n    amount?: string;\\n    assetId: string;\\n    networkId: string;\\n}\\n\\nexport const ContractInvocationSchema = z.object({\\n    contractAddress: z.string().describe("The address of the contract to invoke"),\\n    method: z.string().describe("The method to invoke on the contract"),\\n    abi: z.array(z.any()).describe("The ABI of the contract"),\\n    args: z.record(z.string(), z.any()).optional().describe("The arguments to pass to the contract method"),\\n    amount: z.string().optional().describe("The amount of the asset to send (as string to handle large numbers)"),\\n    assetId: z.string().describe("The ID of the asset to send (e.g., \'USDC\')"),\\n    networkId: z.string().describe("The network ID to use (e.g., \'ethereum-mainnet\')")\\n});\\n\\nexport const isContractInvocationContent = (obj: any): obj is ContractInvocationContent => {\\n    return ContractInvocationSchema.safeParse(obj).success;\\n};\\n\\n\\nexport const WebhookSchema = z.object({\\n    networkId: z.string(),\\n    eventType: z.nativeEnum(WebhookEventType),\\n    eventTypeFilter:z.custom<WebhookEventTypeFilter>().optional(),\\n    eventFilters: z.array(z.custom<WebhookEventFilter>()).optional()\\n});\\n\\nexport type WebhookContent = z.infer<typeof WebhookSchema>;\\n\\nexport const isWebhookContent = (object: any): object is WebhookContent => {\\n    return WebhookSchema.safeParse(object).success;\\n};\\n\\nexport const AdvancedTradeSchema = z.object({\\n    productId: z.string(),\\n    side: z.enum(["BUY", "SELL"]),\\n    amount: z.number(),\\n    orderType: z.enum(["MARKET", "LIMIT"]),\\n    limitPrice: z.number().optional(),\\n});\\n\\nexport interface AdvancedTradeContent {\\n    productId: string;\\n    side: "BUY" | "SELL";\\n    amount: number;\\n    orderType: "MARKET" | "LIMIT";\\n    limitPrice?: number;\\n}\\n\\nexport const isAdvancedTradeContent = (object: any): object is AdvancedTradeContent => {\\n    return AdvancedTradeSchema.safeParse(object).success;\\n};\\n\\nexport interface ReadContractContent {\\n    contractAddress: `0x${string}`;\\n    method: string;\\n    networkId: string;\\n    args: Record<string, any>;\\n    abi?: any[];\\n}\\n\\nexport const ReadContractSchema = z.object({\\n    contractAddress: z.string().describe("The address of the contract to read from"),\\n    method: z.string().describe("The view/pure method to call on the contract"),\\n    networkId: z.string().describe("The network ID to use"),\\n    args: z.record(z.string(), z.any()).describe("The arguments to pass to the contract method"),\\n    abi: z.array(z.any()).optional().describe("The contract ABI (optional)")\\n});\\n\\nexport const isReadContractContent = (obj: any): obj is ReadContractContent => {\\n    return ReadContractSchema.safeParse(obj).success;\\n};',
    //             hash: "d6268dbae600cbb31291650dc9904d1b77147c1caf86a1e1fc78434f0781948c",
    //             source: "github",
    //             attachments: [],
    //             metadata: {
    //                 path: "packages/plugin-coinbase/src/types.ts",
    //                 repo: "eliza",
    //                 owner: "elizaOS",
    //             },
    //         },
    //     },
    //     {
    //         id: "dbea65e8-5233-0126-9ae0-229d809ff40c",
    //         userId: "12dea96f-ec20-0935-a6ab-75692c994959",
    //         agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
    //         roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
    //         content: {
    //             text: 'export const chargeTemplate = `\\nExtract the following details to create a Coinbase charge:\\n- **price** (number): The amount for the charge (e.g., 100.00).\\n- **currency** (string): The 3-letter ISO 4217 currency code (e.g., USD, EUR).\\n- **type** (string): The pricing type for the charge (e.g., fixed_price, dynamic_price). Assume price type is fixed unless otherwise stated\\n- **name** (string): A non-empty name for the charge (e.g., "The Human Fund").\\n- **description** (string): A non-empty description of the charge (e.g., "Money For People").\\n\\nProvide the values in the following JSON format:\\n\\n\\`\\`\\`json\\n{\\n    "price": <number>,\\n    "currency": "<currency>",\\n    "type": "<type>",\\n    "name": "<name>",\\n    "description": "<description>"\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\nexport const getChargeTemplate = `\\nExtract the details for a Coinbase charge using the provided charge ID:\\n- **charge_id** (string): The unique identifier of the charge (e.g., "2b364ef7-ad60-4fcd-958b-e550a3c47dc6").\\n\\nProvide the charge details in the following JSON format after retrieving the charge details:\\n\\n\\`\\`\\`json\\n{\\n    "charge_id": "<charge_id>",\\n    "price": <number>,\\n    "currency": "<currency>",\\n    "type": "<type>",\\n    "name": "<name>",\\n    "description": "<description>",\\n    "status": "<status>",\\n    "created_at": "<ISO8601 timestamp>",\\n    "expires_at": "<ISO8601 timestamp>"\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\nexport const transferTemplate = `\\nExtract the following details for processing a mass payout using the Coinbase SDK:\\n- **receivingAddresses** (array): A list of wallet addresses receiving the funds.\\n- **transferAmount** (number): The amount to transfer to each address.\\n- **assetId** (string): The asset ID to transfer (e.g., ETH, BTC).\\n- **network** (string): The blockchain network to use. Allowed values are:\\n    static networks: {\\n        readonly BaseSepolia: "base-sepolia";\\n        readonly BaseMainnet: "base-mainnet";\\n        readonly EthereumHolesky: "ethereum-holesky";\\n        readonly EthereumMainnet: "ethereum-mainnet";\\n        readonly PolygonMainnet: "polygon-mainnet";\\n        readonly SolanaDevnet: "solana-devnet";\\n        readonly SolanaMainnet: "solana-mainnet";\\n        readonly ArbitrumMainnet: "arbitrum-mainnet";\\n    };\\n\\nProvide the details in the following JSON format:\\n\\n\\`\\`\\`json\\n{\\n    "receivingAddresses": ["<receiving_address_1>", "<receiving_address_2>"],\\n    "transferAmount": <amount>,\\n    "assetId": "<asset_id>",\\n    "network": "<network>"\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\nexport const tradeTemplate = `\\nExtract the following details for processing a trade using the Coinbase SDK:\\n- **network** (string): The blockchain network to use (e.g., base, sol, eth, arb, pol).\\n- **amount** (number): The amount to trade.\\n- **sourceAsset** (string): The asset ID to trade from (must be one of: ETH, SOL, USDC, WETH, GWEI, LAMPORT).\\n- **targetAsset** (string): The asset ID to trade to (must be one of: ETH, SOL, USDC, WETH, GWEI, LAMPORT).\\n- **side** (string): The side of the trade (must be either "BUY" or "SELL").\\n\\nEnsure that:\\n1. **network** is one of the supported networks: "base", "sol", "eth", "arb", or "pol".\\n2. **sourceAsset** and **targetAsset** are valid assets from the provided list.\\n3. **amount** is a positive number.\\n4. **side** is either "BUY" or "SELL".\\n\\nProvide the details in the following JSON format:\\n\\n\\`\\`\\`json\\n{\\n    "network": "<network>",\\n    "amount": <amount>,\\n    "sourceAsset": "<source_asset_id>",\\n    "targetAsset": "<target_asset_id>",\\n    "side": "<side>"\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\nexport const advancedTradeTemplate = `\\nExtract the following details for processing an advanced trade using the Coinbase Advanced Trading API:\\n- **productId** (string): The trading pair ID (e.g., "BTC-USD", "ETH-USD", "SOL-USD")\\n- **side** (string): The side of the trade (must be either "BUY" or "SELL")\\n- **amount** (number): The amount to trade\\n- **orderType** (string): The type of order (must be either "MARKET" or "LIMIT")\\n- **limitPrice** (number, optional): The limit price for limit orders\\n\\nEnsure that:\\n1. **productId** follows the format "ASSET-USD" (e.g., "BTC-USD")\\n2. **side** is either "BUY" or "SELL"\\n3. **amount** is a positive number\\n4. **orderType** is either "MARKET" or "LIMIT"\\n5. **limitPrice** is provided when orderType is "LIMIT"\\n\\nProvide the details in the following JSON format:\\n\\n\\`\\`\\`json\\n{\\n    "productId": "<product_id>",\\n    "side": "<side>",\\n    "amount": <amount>,\\n    "orderType": "<order_type>",\\n    "limitPrice": <limit_price>\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\n\\nexport const tokenContractTemplate = `\\nExtract the following details for deploying a token contract using the Coinbase SDK:\\n- **contractType** (string): The type of token contract to deploy (ERC20, ERC721, or ERC1155)\\n- **name** (string): The name of the token\\n- **symbol** (string): The symbol of the token\\n- **network** (string): The blockchain network to deploy on (e.g., base, eth, arb, pol)\\n- **baseURI** (string, optional): The base URI for token metadata (required for ERC721 and ERC1155)\\n- **totalSupply** (number, optional): The total supply of tokens (only for ERC20)\\n\\nProvide the details in the following JSON format:\\n\\n\\`\\`\\`json\\n{\\n    "contractType": "<contract_type>",\\n    "name": "<token_name>",\\n    "symbol": "<token_symbol>",\\n    "network": "<network>",\\n    "baseURI": "<base_uri>",\\n    "totalSupply": <total_supply>\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\n// Add to templates.ts\\nexport const contractInvocationTemplate = `\\nExtract the following details for invoking a smart contract using the Coinbase SDK:\\n- **contractAddress** (string): The address of the contract to invoke\\n- **method** (string): The method to invoke on the contract\\n- **abi** (array): The ABI of the contract\\n- **args** (object, optional): The arguments to pass to the contract method\\n- **amount** (string, optional): The amount of the asset to send (as string to handle large numbers)\\n- **assetId** (string, required): The ID of the asset to send (e.g., \'USDC\')\\n- **networkId** (string, required): The network ID to use in format "chain-network".\\n static networks: {\\n        readonly BaseSepolia: "base-sepolia";\\n        readonly BaseMainnet: "base-mainnet";\\n        readonly EthereumHolesky: "ethereum-holesky";\\n        readonly EthereumMainnet: "ethereum-mainnet";\\n        readonly PolygonMainnet: "polygon-mainnet";\\n        readonly SolanaDevnet: "solana-devnet";\\n        readonly SolanaMainnet: "solana-mainnet";\\n        readonly ArbitrumMainnet: "arbitrum-mainnet";\\n    };\\n\\nProvide the details in the following JSON format:\\n\\n\\`\\`\\`json\\n{\\n    "contractAddress": "<contract_address>",\\n    "method": "<method_name>",\\n    "abi": [<contract_abi>],\\n    "args": {\\n        "<arg_name>": "<arg_value>"\\n    },\\n    "amount": "<amount_as_string>",\\n    "assetId": "<asset_id>",\\n    "networkId": "<network_id>"\\n}\\n\\`\\`\\`\\n\\nExample for invoking a transfer method on the USDC contract:\\n\\n\\`\\`\\`json\\n{\\n    "contractAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",\\n    "method": "transfer",\\n    "abi": [\\n        {\\n            "constant": false,\\n            "inputs": [\\n                {\\n                    "name": "to",\\n                    "type": "address"\\n                },\\n                {\\n                    "name": "amount",\\n                    "type": "uint256"\\n                }\\n            ],\\n            "name": "transfer",\\n            "outputs": [\\n                {\\n                    "name": "",\\n                    "type": "bool"\\n                }\\n            ],\\n            "payable": false,\\n            "stateMutability": "nonpayable",\\n            "type": "function"\\n        }\\n    ],\\n    "args": {\\n        "to": "0xbcF7C64B880FA89a015970dC104E848d485f99A3",\\n        "amount": "1000000" // 1 USDC (6 decimals)\\n    },\\n    "networkId": "ethereum-mainnet",\\n    "assetId": "USDC"\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\nexport const webhookTemplate = `\\nExtract the following details for creating a webhook:\\n- **networkId** (string): The network ID for which the webhook is created.\\nAllowed values are:\\n    static networks: {\\n        readonly BaseSepolia: "base-sepolia";\\n        readonly BaseMainnet: "base-mainnet";\\n        readonly EthereumHolesky: "ethereum-holesky";\\n        readonly EthereumMainnet: "ethereum-mainnet";\\n        readonly PolygonMainnet: "polygon-mainnet";\\n        readonly SolanaDevnet: "solana-devnet";\\n        readonly SolanaMainnet: "solana-mainnet";\\n        readonly ArbitrumMainnet: "arbitrum-mainnet";\\n    };\\n- **eventType** (string): The type of event for the webhook.\\nexport declare const WebhookEventType: {\\n    readonly Unspecified: "unspecified";\\n    readonly Erc20Transfer: "erc20_transfer";\\n    readonly Erc721Transfer: "erc721_transfer";\\n    readonly WalletActivity: "wallet_activity";\\n};\\n- **eventTypeFilter** (string, optional): Filter for wallet activity event type.\\nexport interface WebhookEventTypeFilter {\\n    /**\\n     * A list of wallet addresses to filter on.\\n     * @type {Array<string>}\\n     * @memberof WebhookWalletActivityFilter\\n     */\\n    \'addresses\'?: Array<string>;\\n    /**\\n     * The ID of the wallet that owns the webhook.\\n     * @type {string}\\n     * @memberof WebhookWalletActivityFilter\\n     */\\n    \'wallet_id\'?: string;\\n}\\n- **eventFilters** (array, optional): Filters applied to the events that determine which specific events trigger the webhook.\\nexport interface Array<WebhookEventFilter> {\\n    /**\\n     * The onchain contract address of the token for which the events should be tracked.\\n     * @type {string}\\n     * @memberof WebhookEventFilter\\n     */\\n    \'contract_address\'?: string;\\n    /**\\n     * The onchain address of the sender. Set this filter to track all transfer events originating from your address.\\n     * @type {string}\\n     * @memberof WebhookEventFilter\\n     */\\n    \'from_address\'?: string;\\n    /**\\n     * The onchain address of the receiver. Set this filter to track all transfer events sent to your address.\\n     * @type {string}\\n     * @memberof WebhookEventFilter\\n     */\\n    \'to_address\'?: string;\\n}\\nProvide the details in the following JSON format:\\n\\`\\`\\`json\\n{\\n    "networkId": "<networkId>",\\n    "eventType": "<eventType>",\\n    "eventTypeFilter": "<eventTypeFilter>",\\n    "eventFilters": [<eventFilter1>, <eventFilter2>]\\n}\\n\\`\\`\\`\\n\\n\\n\\nExample for creating a webhook on the Sepolia testnet for ERC20 transfers originating from a specific wallet 0x1234567890123456789012345678901234567890 on transfers from 0xbcF7C64B880FA89a015970dC104E848d485f99A3\\n\\n\\`\\`\\`javascript\\n\\n    networkId: \'base-sepolia\', // Listening on sepolia testnet transactions\\n    eventType: \'erc20_transfer\',\\n    eventTypeFilter: {\\n      addresses: [\'0x1234567890123456789012345678901234567890\']\\n    },\\n    eventFilters: [{\\n      from_address: \'0xbcF7C64B880FA89a015970dC104E848d485f99A3\',\\n    }],\\n});\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;\\n\\nexport const readContractTemplate = `\\nExtract the following details for reading from a smart contract using the Coinbase SDK:\\n- **contractAddress** (string): The address of the contract to read from (must start with 0x)\\n- **method** (string): The view/pure method to call on the contract\\n- **networkId** (string): The network ID based on networks configured in Coinbase SDK\\nAllowed values are:\\n    static networks: {\\n        readonly BaseSepolia: "base-sepolia";\\n        readonly BaseMainnet: "base-mainnet";\\n        readonly EthereumHolesky: "ethereum-holesky";\\n        readonly EthereumMainnet: "ethereum-mainnet";\\n        readonly PolygonMainnet: "polygon-mainnet";\\n        readonly SolanaDevnet: "solana-devnet";\\n        readonly SolanaMainnet: "solana-mainnet";\\n        readonly ArbitrumMainnet: "arbitrum-mainnet";\\n    };\\n- **args** (object): The arguments to pass to the contract method\\n- **abi** (array, optional): The contract ABI if needed for complex interactions\\n\\nProvide the details in the following JSON format:\\n\\n\\`\\`\\`json\\n{\\n    "contractAddress": "<0x-prefixed-address>",\\n    "method": "<method_name>",\\n    "networkId": "<network_id>",\\n    "args": {\\n        "<arg_name>": "<arg_value>"\\n    },\\n    "abi": [\\n        // Optional ABI array\\n    ]\\n}\\n\\`\\`\\`\\n\\nExample for reading the balance of an ERC20 token:\\n\\n\\`\\`\\`json\\n{\\n    "contractAddress": "0x37f2131ebbc8f97717edc3456879ef56b9f4b97b",\\n    "method": "balanceOf",\\n    "networkId": "eth-mainnet",\\n    "args": {\\n        "account": "0xbcF7C64B880FA89a015970dC104E848d485f99A3"\\n    }\\n}\\n\\`\\`\\`\\n\\nHere are the recent user messages for context:\\n{{recentMessages}}\\n`;',
    //             hash: "8bcacdfa3ca93b5a9b553a8a5f6535627a386ea29001846864fb3108193e7a17",
    //             source: "github",
    //             attachments: [],
    //             metadata: {
    //                 path: "packages/plugin-coinbase/src/templates.ts",
    //                 repo: "eliza",
    //                 owner: "elizaOS",
    //             },
    //         },
    //     },
    //     {
    //         id: "4c3b1b0e-bf46-0aed-a53f-77159b20a8cf",
    //         userId: "12dea96f-ec20-0935-a6ab-75692c994959",
    //         agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
    //         roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
    //         content: {
    //             text: 'import { coinbaseMassPaymentsPlugin } from "./plugins/massPayments";\\nimport { coinbaseCommercePlugin } from "./plugins/commerce";\\nimport { tradePlugin } from "./plugins/trade";\\nimport { tokenContractPlugin } from "./plugins/tokenContract";\\nimport { webhookPlugin } from "./plugins/webhooks";\\nimport { advancedTradePlugin } from "./plugins/advancedTrade";\\n\\nexport const plugins = {\\n    coinbaseMassPaymentsPlugin,\\n    coinbaseCommercePlugin,\\n    tradePlugin,\\n    tokenContractPlugin,\\n    webhookPlugin,\\n    advancedTradePlugin,\\n};\\n\\nexport * from "./plugins/massPayments";\\nexport * from "./plugins/commerce";\\nexport * from "./plugins/trade";\\nexport * from "./plugins/tokenContract";\\nexport * from "./plugins/webhooks";\\nexport * from "./plugins/advancedTrade";\\n',
    //             hash: "6a09c58be16ec7d623e930899001c65baf983550a99ae2e3935a21c140f79e06",
    //             source: "github",
    //             attachments: [],
    //             metadata: {
    //                 path: "packages/plugin-coinbase/src/index.ts",
    //                 repo: "eliza",
    //                 owner: "elizaOS",
    //             },
    //         },
    //     },
    //     {
    //         id: "65d45173-1633-0c37-9f46-3b48574436eb",
    //         userId: "12dea96f-ec20-0935-a6ab-75692c994959",
    //         agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
    //         roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
    //         content: {
    //             text: 'export const ABI = [\\n    {\\n        inputs: [],\\n        name: "name",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "string",\\n                internalType: "string"\\n            }\\n        ],\\n        stateMutability: "view",\\n        type: "function"\\n    },\\n    {\\n        inputs: [\\n            {\\n                name: "spender",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                name: "amount",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        name: "approve",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "bool",\\n                internalType: "bool"\\n            }\\n        ],\\n        stateMutability: "nonpayable",\\n        type: "function"\\n    },\\n    {\\n        inputs: [],\\n        name: "totalSupply",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        stateMutability: "view",\\n        type: "function"\\n    },\\n    {\\n        inputs: [\\n            {\\n                name: "from",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                name: "to",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                name: "amount",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        name: "transferFrom",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "bool",\\n                internalType: "bool"\\n            }\\n        ],\\n        stateMutability: "nonpayable",\\n        type: "function"\\n    },\\n    {\\n        inputs: [],\\n        name: "decimals",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "uint8",\\n                internalType: "uint8"\\n            }\\n        ],\\n        stateMutability: "view",\\n        type: "function"\\n    },\\n    {\\n        inputs: [\\n            {\\n                name: "account",\\n                type: "address",\\n                internalType: "address"\\n            }\\n        ],\\n        name: "balanceOf",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        stateMutability: "view",\\n        type: "function"\\n    },\\n    {\\n        inputs: [],\\n        name: "symbol",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "string",\\n                internalType: "string"\\n            }\\n        ],\\n        stateMutability: "view",\\n        type: "function"\\n    },\\n    {\\n        inputs: [\\n            {\\n                name: "to",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                name: "amount",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        name: "transfer",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "bool",\\n                internalType: "bool"\\n            }\\n        ],\\n        stateMutability: "nonpayable",\\n        type: "function"\\n    },\\n    {\\n        inputs: [\\n            {\\n                name: "owner",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                name: "spender",\\n                type: "address",\\n                internalType: "address"\\n            }\\n        ],\\n        name: "allowance",\\n        outputs: [\\n            {\\n                name: "",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        stateMutability: "view",\\n        type: "function"\\n    },\\n    {\\n        inputs: [\\n            {\\n                indexed: true,\\n                name: "owner",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                indexed: true,\\n                name: "spender",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                indexed: false,\\n                name: "value",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        name: "Approval",\\n        type: "event",\\n        anonymous: false\\n    },\\n    {\\n        inputs: [\\n            {\\n                indexed: true,\\n                name: "from",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                indexed: true,\\n                name: "to",\\n                type: "address",\\n                internalType: "address"\\n            },\\n            {\\n                indexed: false,\\n                name: "value",\\n                type: "uint256",\\n                internalType: "uint256"\\n            }\\n        ],\\n        name: "Transfer",\\n        type: "event",\\n        anonymous: false\\n    }\\n];',
    //             hash: "1efec9e09a67c91bcd292440590e52ca5518bbf79a0f5158b37ce35b6f4a418a",
    //             source: "github",
    //             attachments: [],
    //             metadata: {
    //                 path: "packages/plugin-coinbase/src/constants.ts",
    //                 repo: "eliza",
    //                 owner: "elizaOS",
    //             },
    //         },
    //     },
    //     {
    //         id: "4c822d37-abbb-0b88-9afb-666a5af57fb9",
    //         userId: "12dea96f-ec20-0935-a6ab-75692c994959",
    //         agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
    //         roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
    //         content: {
    //             text: 'import { Coinbase, Webhook } from "@coinbase/coinbase-sdk";\\nimport {\\n    Action,\\n    Plugin,\\n    elizaLogger,\\n    IAgentRuntime,\\n    Memory,\\n    HandlerCallback,\\n    State,\\n    composeContext,\\n    generateObject,\\n    ModelClass,\\n    Provider,\\n} from "@elizaos/core";\\nimport { WebhookSchema, isWebhookContent, WebhookContent } from "../types";\\nimport { webhookTemplate } from "../templates";\\nimport { appendWebhooksToCsv } from "../utils";\\n\\nexport const webhookProvider: Provider = {\\n    get: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.debug("Starting webhookProvider.get function");\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n\\n            // List all webhooks\\n            const resp = await Webhook.list();\\n            elizaLogger.info("Listing all webhooks:", resp.data);\\n\\n            return {\\n                webhooks: resp.data.map((webhook: Webhook) => ({\\n                    id: webhook.getId(),\\n                    networkId: webhook.getNetworkId(),\\n                    eventType: webhook.getEventType(),\\n                    eventFilters: webhook.getEventFilters(),\\n                    eventTypeFilter: webhook.getEventTypeFilter(),\\n                    notificationURI: webhook.getNotificationURI(),\\n                })),\\n            };\\n        } catch (error) {\\n            elizaLogger.error("Error in webhookProvider:", error);\\n            return [];\\n        }\\n    },\\n};\\n\\nexport const createWebhookAction: Action = {\\n    name: "CREATE_WEBHOOK",\\n    description: "Create a new webhook using the Coinbase SDK.",\\n    validate: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.info("Validating runtime for CREATE_WEBHOOK...");\\n        return (\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_API_KEY ||\\n                process.env.COINBASE_API_KEY\\n            ) &&\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||\\n                process.env.COINBASE_PRIVATE_KEY\\n            ) &&\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_NOTIFICATION_URI ||\\n                process.env.COINBASE_NOTIFICATION_URI\\n            )\\n        );\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        _message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.debug("Starting CREATE_WEBHOOK handler...");\\n\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n\\n            const context = composeContext({\\n                state,\\n                template: webhookTemplate,\\n            });\\n\\n            const webhookDetails = await generateObject({\\n                runtime,\\n                context,\\n                modelClass: ModelClass.SMALL,\\n                schema: WebhookSchema,\\n            });\\n\\n            if (!isWebhookContent(webhookDetails.object)) {\\n                callback(\\n                    {\\n                        text: "Invalid webhook details. Ensure network, URL, event type, and contract address are correctly specified.",\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            const { networkId, eventType, eventFilters, eventTypeFilter } =\\n                webhookDetails.object as WebhookContent;\\n            const notificationUri =\\n                runtime.getSetting("COINBASE_NOTIFICATION_URI") ??\\n                process.env.COINBASE_NOTIFICATION_URI;\\n\\n            if (!notificationUri) {\\n                callback(\\n                    {\\n                        text: "Notification URI is not set in the environment variables.",\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n            elizaLogger.info("Creating webhook with details:", {\\n                networkId,\\n                notificationUri,\\n                eventType,\\n                eventTypeFilter,\\n                eventFilters,\\n            });\\n            const webhook = await Webhook.create({\\n                networkId,\\n                notificationUri,\\n                eventType,\\n                eventFilters,\\n            });\\n            elizaLogger.info(\\n                "Webhook created successfully:",\\n                webhook.toString()\\n            );\\n            callback(\\n                {\\n                    text: `Webhook created successfully: ${webhook.toString()}`,\\n                },\\n                []\\n            );\\n            await appendWebhooksToCsv([webhook]);\\n            elizaLogger.info("Webhook appended to CSV successfully");\\n        } catch (error) {\\n            elizaLogger.error("Error during webhook creation:", error);\\n            callback(\\n                {\\n                    text: "Failed to create the webhook. Please check the logs for more details.",\\n                },\\n                []\\n            );\\n        }\\n    },\\n    similes: ["WEBHOOK", "NOTIFICATION", "EVENT", "TRIGGER", "LISTENER"],\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Create a webhook on base for address 0xbcF7C64B880FA89a015970dC104E848d485f99A3 on the event type: transfers",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Webhook created successfully: Webhook ID: {{webhookId}}, Network ID: {{networkId}}, Notification URI: {{notificationUri}}, Event Type: {{eventType}}`,\\n                    action: "CREATE_WEBHOOK",\\n                },\\n            },\\n        ],\\n    ],\\n};\\n\\nexport const webhookPlugin: Plugin = {\\n    name: "webhookPlugin",\\n    description: "Manages webhooks using the Coinbase SDK.",\\n    actions: [createWebhookAction],\\n    providers: [webhookProvider],\\n};\\n',
    //             hash: "5fc0a933aac0510e406df2ee09d0296d9d8694777ff8ed1e2a48956c14e5649b",
    //             source: "github",
    //             attachments: [],
    //             metadata: {
    //                 path: "packages/plugin-coinbase/src/plugins/webhooks.ts",
    //                 repo: "eliza",
    //                 owner: "elizaOS",
    //             },
    //         },
    //     },
    //     {
    //         id: "5af49f77-82d9-0c60-ab64-a165c95827c1",
    //         userId: "12dea96f-ec20-0935-a6ab-75692c994959",
    //         agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
    //         roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
    //         content: {
    //             text: 'import { Coinbase } from "@coinbase/coinbase-sdk";\\nimport {\\n    Action,\\n    Plugin,\\n    elizaLogger,\\n    IAgentRuntime,\\n    Memory,\\n    HandlerCallback,\\n    State,\\n    composeContext,\\n    generateObject,\\n    ModelClass,\\n    Provider,\\n} from "@elizaos/core";\\nimport { executeTradeAndCharityTransfer, getWalletDetails } from "../utils";\\nimport { tradeTemplate } from "../templates";\\nimport { isTradeContent, TradeContent, TradeSchema } from "../types";\\nimport { readFile } from "fs/promises";\\nimport { parse } from "csv-parse/sync";\\nimport path from "path";\\nimport { fileURLToPath } from "url";\\nimport fs from "fs";\\nimport { createArrayCsvWriter } from "csv-writer";\\n\\n// Dynamically resolve the file path to the src/plugins directory\\nconst __filename = fileURLToPath(import.meta.url);\\nconst __dirname = path.dirname(__filename);\\nconst baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");\\nconst tradeCsvFilePath = path.join(baseDir, "trades.csv");\\n\\nexport const tradeProvider: Provider = {\\n    get: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.debug("Starting tradeProvider.get function");\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n            elizaLogger.info("Reading CSV file from:", tradeCsvFilePath);\\n\\n            // Check if the file exists; if not, create it with headers\\n            if (!fs.existsSync(tradeCsvFilePath)) {\\n                elizaLogger.warn("CSV file not found. Creating a new one.");\\n                const csvWriter = createArrayCsvWriter({\\n                    path: tradeCsvFilePath,\\n                    header: [\\n                        "Network",\\n                        "From Amount",\\n                        "Source Asset",\\n                        "To Amount",\\n                        "Target Asset",\\n                        "Status",\\n                        "Transaction URL",\\n                    ],\\n                });\\n                await csvWriter.writeRecords([]); // Create an empty file with headers\\n                elizaLogger.info("New CSV file created with headers.");\\n            }\\n\\n            // Read and parse the CSV file\\n            const csvData = await readFile(tradeCsvFilePath, "utf-8");\\n            const records = parse(csvData, {\\n                columns: true,\\n                skip_empty_lines: true,\\n            });\\n\\n            elizaLogger.info("Parsed CSV records:", records);\\n            const { balances, transactions } = await getWalletDetails(runtime);\\n            elizaLogger.info("Current Balances:", balances);\\n            elizaLogger.info("Last Transactions:", transactions);\\n            return {\\n                currentTrades: records.map((record: any) => ({\\n                    network: record["Network"] || undefined,\\n                    amount: parseFloat(record["From Amount"]) || undefined,\\n                    sourceAsset: record["Source Asset"] || undefined,\\n                    toAmount: parseFloat(record["To Amount"]) || undefined,\\n                    targetAsset: record["Target Asset"] || undefined,\\n                    status: record["Status"] || undefined,\\n                    transactionUrl: record["Transaction URL"] || "",\\n                })),\\n                balances,\\n                transactions,\\n            };\\n        } catch (error) {\\n            elizaLogger.error("Error in tradeProvider:", error);\\n            return [];\\n        }\\n    },\\n};\\n\\nexport const executeTradeAction: Action = {\\n    name: "EXECUTE_TRADE",\\n    description:\\n        "Execute a trade between two assets using the Coinbase SDK and log the result.",\\n    validate: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.info("Validating runtime for EXECUTE_TRADE...");\\n        return (\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_API_KEY ||\\n                process.env.COINBASE_API_KEY\\n            ) &&\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||\\n                process.env.COINBASE_PRIVATE_KEY\\n            )\\n        );\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        _message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.debug("Starting EXECUTE_TRADE handler...");\\n\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n\\n            const context = composeContext({\\n                state,\\n                template: tradeTemplate,\\n            });\\n\\n            const tradeDetails = await generateObject({\\n                runtime,\\n                context,\\n                modelClass: ModelClass.SMALL,\\n                schema: TradeSchema,\\n            });\\n\\n            if (!isTradeContent(tradeDetails.object)) {\\n                callback(\\n                    {\\n                        text: "Invalid trade details. Ensure network, amount, source asset, and target asset are correctly specified.",\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            const { network, amount, sourceAsset, targetAsset } =\\n                tradeDetails.object as TradeContent;\\n\\n            const allowedNetworks = ["base", "sol", "eth", "arb", "pol"];\\n            if (!allowedNetworks.includes(network)) {\\n                callback(\\n                    {\\n                        text: `Invalid network. Supported networks are: ${allowedNetworks.join(\\n                            ", "\\n                        )}.`,\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            const { trade, transfer } = await executeTradeAndCharityTransfer(\\n                runtime,\\n                network,\\n                amount,\\n                sourceAsset,\\n                targetAsset\\n            );\\n\\n            let responseText = `Trade executed successfully:\\n- Network: ${network}\\n- Amount: ${trade.getFromAmount()}\\n- From: ${sourceAsset}\\n- To: ${targetAsset}\\n- Transaction URL: ${trade.getTransaction().getTransactionLink() || ""}\\n- Charity Transaction URL: ${transfer.getTransactionLink() || ""}`;\\n\\n            if (transfer) {\\n                responseText += `\\n- Charity Amount: ${transfer.getAmount()}`;\\n            } else {\\n                responseText += "\\n(Note: Charity transfer was not completed)";\\n            }\\n\\n            callback({ text: responseText }, []);\\n        } catch (error) {\\n            elizaLogger.error("Error during trade execution:", error);\\n            callback(\\n                {\\n                    text: "Failed to execute the trade. Please check the logs for more details.",\\n                },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Swap 1 ETH for USDC on base network",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Trade executed successfully:\\n- Swapped 1 ETH for USDC on base network\\n- Transaction URL: https://basescan.io/tx/...\\n- Status: Completed",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Convert 1000 USDC to SOL on Solana",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Trade executed successfully:\\n- Converted 1000 USDC to SOL on Solana network\\n- Transaction URL: https://solscan.io/tx/...\\n- Status: Completed",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Exchange 5 WETH for ETH on Arbitrum",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Trade executed successfully:\\n- Exchanged 5 WETH for ETH on Arbitrum network\\n- Transaction URL: https://arbiscan.io/tx/...\\n- Status: Completed",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Trade 100 GWEI for USDC on Polygon",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Trade executed successfully:\\n- Traded 100 GWEI for USDC on Polygon network\\n- Transaction URL: https://polygonscan.com/tx/...\\n- Status: Completed",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Market buy ETH with 500 USDC on base",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Trade executed successfully:\\n- Bought ETH with 500 USDC on base network\\n- Transaction URL: https://basescan.io/tx/...\\n- Status: Completed",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Sell 2.5 SOL for USDC on Solana mainnet",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Trade executed successfully:\\n- Sold 2.5 SOL for USDC on Solana network\\n- Transaction URL: https://solscan.io/tx/...\\n- Status: Completed",\\n                },\\n            },\\n        ],\\n    ],\\n    similes: [\\n        "EXECUTE_TRADE", // Primary action name\\n        "SWAP_TOKENS", // For token swaps\\n        "CONVERT_CURRENCY", // For currency conversion\\n        "EXCHANGE_ASSETS", // For asset exchange\\n        "MARKET_BUY", // For buying assets\\n        "MARKET_SELL", // For selling assets\\n        "TRADE_CRYPTO", // Generic crypto trading\\n    ],\\n};\\n\\nexport const tradePlugin: Plugin = {\\n    name: "tradePlugin",\\n    description: "Enables asset trading using the Coinbase SDK.",\\n    actions: [executeTradeAction],\\n    providers: [tradeProvider],\\n};\\n',
    //             hash: "fc278359c6eb10d3da3582ac9375baaeb3d2215a266d7a4810836304aac4b54b",
    //             source: "github",
    //             attachments: [],
    //             metadata: {
    //                 path: "packages/plugin-coinbase/src/plugins/trade.ts",
    //                 repo: "eliza",
    //                 owner: "elizaOS",
    //             },
    //         },
    //     },
    //     {
    //         id: "df59ebc8-57d3-0119-a5b0-ae096f7165bb",
    //         userId: "12dea96f-ec20-0935-a6ab-75692c994959",
    //         agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
    //         roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
    //         content: {
    //             text: 'import { Coinbase, readContract, SmartContract } from "@coinbase/coinbase-sdk";\\nimport {\\n    Action,\\n    Plugin,\\n    elizaLogger,\\n    IAgentRuntime,\\n    Memory,\\n    HandlerCallback,\\n    State,\\n    composeContext,\\n    generateObject,\\n    ModelClass,\\n} from "@elizaos/core";\\nimport { initializeWallet } from "../utils";\\nimport {\\n    contractInvocationTemplate,\\n    tokenContractTemplate,\\n    readContractTemplate,\\n} from "../templates";\\nimport {\\n    ContractInvocationSchema,\\n    TokenContractSchema,\\n    isContractInvocationContent,\\n    isTokenContractContent,\\n    ReadContractSchema,\\n    isReadContractContent,\\n} from "../types";\\nimport path from "path";\\nimport { fileURLToPath } from "url";\\nimport { createArrayCsvWriter } from "csv-writer";\\nimport fs from "fs";\\nimport { ABI } from "../constants";\\n\\n// Dynamically resolve the file path to the src/plugins directory\\nconst __filename = fileURLToPath(import.meta.url);\\nconst __dirname = path.dirname(__filename);\\nconst baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");\\nconst contractsCsvFilePath = path.join(baseDir, "contracts.csv");\\n\\n// Add this helper at the top level\\nconst serializeBigInt = (value: any): any => {\\n    if (typeof value === "bigint") {\\n        return value.toString();\\n    }\\n    if (Array.isArray(value)) {\\n        return value.map(serializeBigInt);\\n    }\\n    if (typeof value === "object" && value !== null) {\\n        return Object.fromEntries(\\n            Object.entries(value).map(([k, v]) => [k, serializeBigInt(v)])\\n        );\\n    }\\n    return value;\\n};\\n\\nexport const deployTokenContractAction: Action = {\\n    name: "DEPLOY_TOKEN_CONTRACT",\\n    description:\\n        "Deploy an ERC20, ERC721, or ERC1155 token contract using the Coinbase SDK",\\n    validate: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.info("Validating runtime for DEPLOY_TOKEN_CONTRACT...");\\n        return (\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_API_KEY ||\\n                process.env.COINBASE_API_KEY\\n            ) &&\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||\\n                process.env.COINBASE_PRIVATE_KEY\\n            )\\n        );\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        _message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.debug("Starting DEPLOY_TOKEN_CONTRACT handler...");\\n\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n\\n            // Ensure CSV file exists\\n            if (!fs.existsSync(contractsCsvFilePath)) {\\n                const csvWriter = createArrayCsvWriter({\\n                    path: contractsCsvFilePath,\\n                    header: [\\n                        "Contract Type",\\n                        "Name",\\n                        "Symbol",\\n                        "Network",\\n                        "Contract Address",\\n                        "Transaction URL",\\n                        "Base URI",\\n                        "Total Supply",\\n                    ],\\n                });\\n                await csvWriter.writeRecords([]);\\n            }\\n\\n            const context = composeContext({\\n                state,\\n                template: tokenContractTemplate,\\n            });\\n\\n            const contractDetails = await generateObject({\\n                runtime,\\n                context,\\n                modelClass: ModelClass.SMALL,\\n                schema: TokenContractSchema,\\n            });\\n            elizaLogger.info("Contract details:", contractDetails.object);\\n\\n            if (!isTokenContractContent(contractDetails.object)) {\\n                callback(\\n                    {\\n                        text: "Invalid contract details. Please check the inputs.",\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            const {\\n                contractType,\\n                name,\\n                symbol,\\n                network,\\n                baseURI,\\n                totalSupply,\\n            } = contractDetails.object;\\n            elizaLogger.info("Contract details:", contractDetails.object);\\n            const wallet = await initializeWallet(runtime, network);\\n            let contract: SmartContract;\\n            let deploymentDetails;\\n\\n            switch (contractType.toLowerCase()) {\\n                case "erc20":\\n                    contract = await wallet.deployToken({\\n                        name,\\n                        symbol,\\n                        totalSupply: totalSupply || 1000000,\\n                    });\\n                    deploymentDetails = {\\n                        contractType: "ERC20",\\n                        totalSupply,\\n                        baseURI: "N/A",\\n                    };\\n                    break;\\n\\n                case "erc721":\\n                    contract = await wallet.deployNFT({\\n                        name,\\n                        symbol,\\n                        baseURI: baseURI || "",\\n                    });\\n                    deploymentDetails = {\\n                        contractType: "ERC721",\\n                        totalSupply: "N/A",\\n                        baseURI,\\n                    };\\n                    break;\\n                default:\\n                    throw new Error(\\n                        `Unsupported contract type: ${contractType}`\\n                    );\\n            }\\n\\n            // Wait for deployment to complete\\n            await contract.wait();\\n            elizaLogger.info("Deployment details:", deploymentDetails);\\n            elizaLogger.info("Contract deployed successfully:", contract);\\n            // Log deployment to CSV\\n            const csvWriter = createArrayCsvWriter({\\n                path: contractsCsvFilePath,\\n                header: [\\n                    "Contract Type",\\n                    "Name",\\n                    "Symbol",\\n                    "Network",\\n                    "Contract Address",\\n                    "Transaction URL",\\n                    "Base URI",\\n                    "Total Supply",\\n                ],\\n                append: true,\\n            });\\n            const transaction =\\n                contract.getTransaction()?.getTransactionLink() || "";\\n            const contractAddress = contract.getContractAddress();\\n            await csvWriter.writeRecords([\\n                [\\n                    deploymentDetails.contractType,\\n                    name,\\n                    symbol,\\n                    network,\\n                    contractAddress,\\n                    transaction,\\n                    deploymentDetails.baseURI,\\n                    deploymentDetails.totalSupply || "",\\n                ],\\n            ]);\\n\\n            callback(\\n                {\\n                    text: `Token contract deployed successfully:\\n- Type: ${deploymentDetails.contractType}\\n- Name: ${name}\\n- Symbol: ${symbol}\\n- Network: ${network}\\n- Contract Address: ${contractAddress}\\n- Transaction URL: ${transaction}\\n${deploymentDetails.baseURI !== "N/A" ? `- Base URI: ${deploymentDetails.baseURI}` : ""}\\n${deploymentDetails.totalSupply !== "N/A" ? `- Total Supply: ${deploymentDetails.totalSupply}` : ""}\\n\\nContract deployment has been logged to the CSV file.`,\\n                },\\n                []\\n            );\\n        } catch (error) {\\n            elizaLogger.error("Error deploying token contract:", error);\\n            callback(\\n                {\\n                    text: "Failed to deploy token contract. Please check the logs for more details.",\\n                },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Deploy an ERC721 token named \'MyNFT\' with symbol \'MNFT\' on base network with URI \'https://pbs.twimg.com/profile_images/1848823420336934913/oI0-xNGe_400x400.jpg\'",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Token contract deployed successfully:\\n- Type: ERC20\\n- Name: MyToken\\n- Symbol: MTK\\n- Network: base\\n- Contract Address: 0x...\\n- Transaction URL: https://basescan.org/tx/...\\n- Total Supply: 1000000`,\\n                },\\n            },\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Deploy an ERC721 token named \'MyNFT\' with symbol \'MNFT\' on the base network",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Token contract deployed successfully:\\n- Type: ERC721\\n- Name: MyNFT\\n- Symbol: MNFT\\n- Network: base\\n- Contract Address: 0x...\\n- Transaction URL: https://basescan.org/tx/...\\n- URI: https://pbs.twimg.com/profile_images/1848823420336934913/oI0-xNGe_400x400.jpg`,\\n                },\\n            },\\n        ],\\n    ],\\n    similes: ["DEPLOY_CONTRACT", "CREATE_TOKEN", "MINT_TOKEN", "CREATE_NFT"],\\n};\\n\\n// Add to tokenContract.ts\\nexport const invokeContractAction: Action = {\\n    name: "INVOKE_CONTRACT",\\n    description:\\n        "Invoke a method on a deployed smart contract using the Coinbase SDK",\\n    validate: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.info("Validating runtime for INVOKE_CONTRACT...");\\n        return (\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_API_KEY ||\\n                process.env.COINBASE_API_KEY\\n            ) &&\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||\\n                process.env.COINBASE_PRIVATE_KEY\\n            )\\n        );\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        _message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.debug("Starting INVOKE_CONTRACT handler...");\\n\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n\\n            const context = composeContext({\\n                state,\\n                template: contractInvocationTemplate,\\n            });\\n\\n            const invocationDetails = await generateObject({\\n                runtime,\\n                context,\\n                modelClass: ModelClass.SMALL,\\n                schema: ContractInvocationSchema,\\n            });\\n            elizaLogger.info("Invocation details:", invocationDetails.object);\\n            if (!isContractInvocationContent(invocationDetails.object)) {\\n                callback(\\n                    {\\n                        text: "Invalid contract invocation details. Please check the inputs.",\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            const {\\n                contractAddress,\\n                method,\\n                args,\\n                amount,\\n                assetId,\\n                networkId,\\n            } = invocationDetails.object;\\n            const wallet = await initializeWallet(runtime, networkId);\\n\\n            // Prepare invocation options\\n            const invocationOptions = {\\n                contractAddress,\\n                method,\\n                abi: ABI,\\n                args: {\\n                    ...args,\\n                    amount: args.amount || amount, // Ensure amount is passed in args\\n                },\\n                networkId,\\n                assetId,\\n            };\\n            elizaLogger.info("Invocation options:", invocationOptions);\\n            // Invoke the contract\\n            const invocation = await wallet.invokeContract(invocationOptions);\\n\\n            // Wait for the transaction to be mined\\n            await invocation.wait();\\n\\n            // Log the invocation to CSV\\n            const csvWriter = createArrayCsvWriter({\\n                path: contractsCsvFilePath,\\n                header: [\\n                    "Contract Address",\\n                    "Method",\\n                    "Network",\\n                    "Status",\\n                    "Transaction URL",\\n                    "Amount",\\n                    "Asset ID",\\n                ],\\n                append: true,\\n            });\\n\\n            await csvWriter.writeRecords([\\n                [\\n                    contractAddress,\\n                    method,\\n                    networkId,\\n                    invocation.getStatus(),\\n                    invocation.getTransactionLink() || "",\\n                    amount || "",\\n                    assetId || "",\\n                ],\\n            ]);\\n\\n            callback(\\n                {\\n                    text: `Contract method invoked successfully:\\n- Contract Address: ${contractAddress}\\n- Method: ${method}\\n- Network: ${networkId}\\n- Status: ${invocation.getStatus()}\\n- Transaction URL: ${invocation.getTransactionLink() || "N/A"}\\n${amount ? `- Amount: ${amount}` : ""}\\n${assetId ? `- Asset ID: ${assetId}` : ""}\\n\\nContract invocation has been logged to the CSV file.`,\\n                },\\n                []\\n            );\\n        } catch (error) {\\n            elizaLogger.error("Error invoking contract method:", error);\\n            callback(\\n                {\\n                    text: "Failed to invoke contract method. Please check the logs for more details.",\\n                },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Call the \'transfer\' method on my ERC20 token contract at 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 with amount 100 to recepient 0xbcF7C64B880FA89a015970dC104E848d485f99A3",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Contract method invoked successfully:\\n- Contract Address: 0x123...\\n- Method: transfer\\n- Network: base\\n- Status: SUCCESS\\n- Transaction URL: https://basescan.org/tx/...\\n- Amount: 100\\n- Asset ID: wei\\n\\nContract invocation has been logged to the CSV file.`,\\n                },\\n            },\\n        ],\\n    ],\\n    similes: ["CALL_CONTRACT", "EXECUTE_CONTRACT", "INTERACT_WITH_CONTRACT"],\\n};\\n\\nexport const readContractAction: Action = {\\n    name: "READ_CONTRACT",\\n    description:\\n        "Read data from a deployed smart contract using the Coinbase SDK",\\n    validate: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.info("Validating runtime for READ_CONTRACT...");\\n        return (\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_API_KEY ||\\n                process.env.COINBASE_API_KEY\\n            ) &&\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||\\n                process.env.COINBASE_PRIVATE_KEY\\n            )\\n        );\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        _message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.debug("Starting READ_CONTRACT handler...");\\n\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n\\n            const context = composeContext({\\n                state,\\n                template: readContractTemplate,\\n            });\\n\\n            const readDetails = await generateObject({\\n                runtime,\\n                context,\\n                modelClass: ModelClass.SMALL,\\n                schema: ReadContractSchema,\\n            });\\n\\n            if (!isReadContractContent(readDetails.object)) {\\n                callback(\\n                    {\\n                        text: "Invalid contract read details. Please check the inputs.",\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            const { contractAddress, method, args, networkId, abi } =\\n                readDetails.object;\\n            elizaLogger.info("Reading contract:", {\\n                contractAddress,\\n                method,\\n                args,\\n                networkId,\\n                abi,\\n            });\\n\\n            const result = await readContract({\\n                networkId,\\n                contractAddress,\\n                method,\\n                args,\\n                abi: ABI as any,\\n            });\\n\\n            // Serialize the result before using it\\n            const serializedResult = serializeBigInt(result);\\n\\n            elizaLogger.info("Contract read result:", serializedResult);\\n\\n            callback(\\n                {\\n                    text: `Contract read successful:\\n- Contract Address: ${contractAddress}\\n- Method: ${method}\\n- Network: ${networkId}\\n- Result: ${JSON.stringify(serializedResult, null, 2)}`,\\n                },\\n                []\\n            );\\n        } catch (error) {\\n            elizaLogger.error("Error reading contract:", error);\\n            callback(\\n                {\\n                    text: `Failed to read contract: ${error instanceof Error ? error.message : "Unknown error"}`,\\n                },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Read the balance of address 0xbcF7C64B880FA89a015970dC104E848d485f99A3 from the ERC20 contract at 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 on eth",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Contract read successful:\\n- Contract Address: 0x37f2131ebbc8f97717edc3456879ef56b9f4b97b\\n- Method: balanceOf\\n- Network: eth\\n- Result: "1000000"`,\\n                },\\n            },\\n        ],\\n    ],\\n    similes: ["READ_CONTRACT", "GET_CONTRACT_DATA", "QUERY_CONTRACT"],\\n};\\n\\nexport const tokenContractPlugin: Plugin = {\\n    name: "tokenContract",\\n    description:\\n        "Enables deployment, invocation, and reading of ERC20, ERC721, and ERC1155 token contracts using the Coinbase SDK",\\n    actions: [\\n        deployTokenContractAction,\\n        invokeContractAction,\\n        readContractAction,\\n    ],\\n};\\n',
    //             hash: "2d173e104abd800666e199866b1ac5eee73b7edef81eb713a805e7d47a7d5192",
    //             source: "github",
    //             attachments: [],
    //             metadata: {
    //                 path: "packages/plugin-coinbase/src/plugins/tokenContract.ts",
    //                 repo: "eliza",
    //                 owner: "elizaOS",
    //             },
    //         },
    //     },
    //     {
    //         id: "c0dfe298-8089-0ddb-a727-d92cb3b03281",
    //         userId: "12dea96f-ec20-0935-a6ab-75692c994959",
    //         agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
    //         roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
    //         content: {
    //             text: 'import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";\\nimport {\\n    composeContext,\\n    elizaLogger,\\n    generateObject,\\n    ModelClass,\\n    Action,\\n    IAgentRuntime,\\n    Memory,\\n    Provider,\\n    State,\\n    HandlerCallback,\\n    Plugin,\\n} from "@elizaos/core";\\nimport {\\n    TransferSchema,\\n    isTransferContent,\\n    TransferContent,\\n    Transaction,\\n} from "../types";\\nimport { transferTemplate } from "../templates";\\nimport { readFile } from "fs/promises";\\nimport { parse } from "csv-parse/sync";\\nimport path from "path";\\nimport { fileURLToPath } from "url";\\nimport fs from "fs";\\nimport { createArrayCsvWriter } from "csv-writer";\\nimport {\\n    appendTransactionsToCsv,\\n    executeTransfer,\\n    getCharityAddress,\\n    getWalletDetails,\\n    initializeWallet,\\n} from "../utils";\\n\\n// Dynamically resolve the file path to the src/plugins directory\\nconst __filename = fileURLToPath(import.meta.url);\\nconst __dirname = path.dirname(__filename);\\nconst baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");\\nconst csvFilePath = path.join(baseDir, "transactions.csv");\\n\\nexport const massPayoutProvider: Provider = {\\n    get: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.debug("Starting massPayoutProvider.get function");\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n            elizaLogger.info("Reading CSV file from:", csvFilePath);\\n\\n            // Ensure the CSV file exists\\n            if (!fs.existsSync(csvFilePath)) {\\n                elizaLogger.warn("CSV file not found. Creating a new one.");\\n                const csvWriter = createArrayCsvWriter({\\n                    path: csvFilePath,\\n                    header: [\\n                        "Address",\\n                        "Amount",\\n                        "Status",\\n                        "Error Code",\\n                        "Transaction URL",\\n                    ],\\n                });\\n                await csvWriter.writeRecords([]); // Create an empty file with headers\\n                elizaLogger.info("New CSV file created with headers.");\\n            }\\n\\n            // Read and parse the CSV file\\n            const csvData = await readFile(csvFilePath, "utf-8");\\n            const records = parse(csvData, {\\n                columns: true,\\n                skip_empty_lines: true,\\n            });\\n\\n            const { balances, transactions } = await getWalletDetails(runtime);\\n\\n            elizaLogger.info("Parsed CSV records:", records);\\n            elizaLogger.info("Current Balances:", balances);\\n            elizaLogger.info("Last Transactions:", transactions);\\n\\n            return {\\n                currentTransactions: records.map((record: any) => ({\\n                    address: record["Address"] || undefined,\\n                    amount: parseFloat(record["Amount"]) || undefined,\\n                    status: record["Status"] || undefined,\\n                    errorCode: record["Error Code"] || "",\\n                    transactionUrl: record["Transaction URL"] || "",\\n                })),\\n                balances,\\n                transactionHistory: transactions,\\n            };\\n        } catch (error) {\\n            elizaLogger.error("Error in massPayoutProvider:", error);\\n            return { csvRecords: [], balances: [], transactions: [] };\\n        }\\n    },\\n};\\n\\nasync function executeMassPayout(\\n    runtime: IAgentRuntime,\\n    networkId: string,\\n    receivingAddresses: string[],\\n    transferAmount: number,\\n    assetId: string\\n): Promise<Transaction[]> {\\n    elizaLogger.debug("Starting executeMassPayout function");\\n    const transactions: Transaction[] = [];\\n    const assetIdLowercase = assetId.toLowerCase();\\n    let sendingWallet: Wallet;\\n    try {\\n        elizaLogger.debug("Initializing sending wallet");\\n        sendingWallet = await initializeWallet(runtime, networkId);\\n    } catch (error) {\\n        elizaLogger.error("Error initializing sending wallet:", error);\\n        throw error;\\n    }\\n    for (const address of receivingAddresses) {\\n        elizaLogger.info("Processing payout for address:", address);\\n        if (address) {\\n            try {\\n                // Check balance before initiating transfer\\n\\n                const walletBalance =\\n                    await sendingWallet.getBalance(assetIdLowercase);\\n\\n                elizaLogger.info("Wallet balance for asset:", {\\n                    assetId,\\n                    walletBalance,\\n                });\\n\\n                if (walletBalance.lessThan(transferAmount)) {\\n                    const insufficientFunds = `Insufficient funds for address ${sendingWallet.getDefaultAddress()} to send to ${address}. Required: ${transferAmount}, Available: ${walletBalance}`;\\n                    elizaLogger.error(insufficientFunds);\\n\\n                    transactions.push({\\n                        address,\\n                        amount: transferAmount,\\n                        status: "Failed",\\n                        errorCode: insufficientFunds,\\n                        transactionUrl: null,\\n                    });\\n                    continue;\\n                }\\n\\n                // Execute the transfer\\n                const transfer = await executeTransfer(\\n                    sendingWallet,\\n                    transferAmount,\\n                    assetIdLowercase,\\n                    address\\n                );\\n\\n                transactions.push({\\n                    address,\\n                    amount: transfer.getAmount().toNumber(),\\n                    status: "Success",\\n                    errorCode: null,\\n                    transactionUrl: transfer.getTransactionLink(),\\n                });\\n            } catch (error) {\\n                elizaLogger.error(\\n                    "Error during transfer for address:",\\n                    address,\\n                    error\\n                );\\n                transactions.push({\\n                    address,\\n                    amount: transferAmount,\\n                    status: "Failed",\\n                    errorCode: error?.code || "Unknown Error",\\n                    transactionUrl: null,\\n                });\\n            }\\n        } else {\\n            elizaLogger.info("Skipping invalid or empty address.");\\n            transactions.push({\\n                address: "Invalid or Empty",\\n                amount: transferAmount,\\n                status: "Failed",\\n                errorCode: "Invalid Address",\\n                transactionUrl: null,\\n            });\\n        }\\n    }\\n    // Send 1% to charity\\n    const charityAddress = getCharityAddress(networkId);\\n\\n    try {\\n        elizaLogger.debug("Sending 1% to charity:", charityAddress);\\n        const charityTransfer = await executeTransfer(\\n            sendingWallet,\\n            transferAmount * 0.01,\\n            assetId,\\n            charityAddress\\n        );\\n\\n        transactions.push({\\n            address: charityAddress,\\n            amount: charityTransfer.getAmount().toNumber(),\\n            status: "Success",\\n            errorCode: null,\\n            transactionUrl: charityTransfer.getTransactionLink(),\\n        });\\n    } catch (error) {\\n        elizaLogger.error("Error during charity transfer:", error);\\n        transactions.push({\\n            address: charityAddress,\\n            amount: transferAmount * 0.01,\\n            status: "Failed",\\n            errorCode: error?.message || "Unknown Error",\\n            transactionUrl: null,\\n        });\\n    }\\n    await appendTransactionsToCsv(transactions);\\n    elizaLogger.info("Finished processing mass payouts.");\\n    return transactions;\\n}\\n\\n// Action for sending mass payouts\\nexport const sendMassPayoutAction: Action = {\\n    name: "SEND_MASS_PAYOUT",\\n    similes: ["BULK_TRANSFER", "DISTRIBUTE_FUNDS", "SEND_PAYMENTS"],\\n    description:\\n        "Sends mass payouts to a list of receiving addresses using a predefined sending wallet and logs all transactions to a CSV file.",\\n    validate: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.info("Validating runtime and message...");\\n        return (\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_API_KEY ||\\n                process.env.COINBASE_API_KEY\\n            ) &&\\n            !!(\\n                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||\\n                process.env.COINBASE_PRIVATE_KEY\\n            )\\n        );\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.debug("Starting SEND_MASS_PAYOUT handler...");\\n        try {\\n            Coinbase.configure({\\n                apiKeyName:\\n                    runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                privateKey:\\n                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY,\\n            });\\n            if (!state) {\\n                state = (await runtime.composeState(message, {\\n                    providers: [massPayoutProvider],\\n                })) as State;\\n            } else {\\n                state = await runtime.updateRecentMessageState(state);\\n            }\\n\\n            const context = composeContext({\\n                state,\\n                template: transferTemplate,\\n            });\\n\\n            const transferDetails = await generateObject({\\n                runtime,\\n                context,\\n                modelClass: ModelClass.SMALL,\\n                schema: TransferSchema,\\n            });\\n\\n            elizaLogger.info(\\n                "Transfer details generated:",\\n                transferDetails.object\\n            );\\n\\n            if (!isTransferContent(transferDetails.object)) {\\n                callback(\\n                    {\\n                        text: "Invalid transfer details. Please check the inputs.",\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            const { receivingAddresses, transferAmount, assetId, network } =\\n                transferDetails.object as TransferContent;\\n\\n            const allowedNetworks = Object.values(Coinbase.networks);\\n\\n            if (\\n                !network ||\\n                !allowedNetworks.includes(network.toLowerCase() as any) ||\\n                !receivingAddresses?.length ||\\n                transferAmount <= 0 ||\\n                !assetId\\n            ) {\\n                elizaLogger.error("Missing or invalid input parameters:", {\\n                    network,\\n                    receivingAddresses,\\n                    transferAmount,\\n                    assetId,\\n                });\\n                callback(\\n                    {\\n                        text: `Invalid input parameters. Please ensure:\\n- Network is one of: ${allowedNetworks.join(", ")}.\\n- Receiving addresses are provided.\\n- Transfer amount is greater than zero.\\n- Asset ID is valid.`,\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            elizaLogger.info("◎ Starting mass payout...");\\n            const transactions = await executeMassPayout(\\n                runtime,\\n                network,\\n                receivingAddresses,\\n                transferAmount,\\n                assetId\\n            );\\n\\n            const successTransactions = transactions.filter(\\n                (tx) => tx.status === "Success"\\n            );\\n            const failedTransactions = transactions.filter(\\n                (tx) => tx.status === "Failed"\\n            );\\n            const successDetails = successTransactions\\n                .map(\\n                    (tx) =>\\n                        `Address: ${tx.address}, Amount: ${tx.amount}, Transaction URL: ${\\n                            tx.transactionUrl || "N/A"\\n                        }`\\n                )\\n                .join("\\n");\\n            const failedDetails = failedTransactions\\n                .map(\\n                    (tx) =>\\n                        `Address: ${tx.address}, Amount: ${tx.amount}, Error Code: ${\\n                            tx.errorCode || "Unknown Error"\\n                        }`\\n                )\\n                .join("\\n");\\n            const charityTransactions = transactions.filter(\\n                (tx) => tx.address === getCharityAddress(network)\\n            );\\n            const charityDetails = charityTransactions\\n                .map(\\n                    (tx) =>\\n                        `Address: ${tx.address}, Amount: ${tx.amount}, Transaction URL: ${\\n                            tx.transactionUrl || "N/A"\\n                        }`\\n                )\\n                .join("\\n");\\n            callback(\\n                {\\n                    text: `Mass payouts completed successfully.\\n- Successful Transactions: ${successTransactions.length}\\n- Failed Transactions: ${failedTransactions.length}\\n\\nDetails:\\n${successTransactions.length > 0 ? `✅ Successful Transactions:\\n${successDetails}` : "No successful transactions."}\\n${failedTransactions.length > 0 ? `❌ Failed Transactions:\\n${failedDetails}` : "No failed transactions."}\\n${charityTransactions.length > 0 ? `✅ Charity Transactions:\\n${charityDetails}` : "No charity transactions."}\\n\\nCheck the CSV file for full details.`,\\n                },\\n                []\\n            );\\n        } catch (error) {\\n            elizaLogger.error("Error during mass payouts:", error);\\n            callback(\\n                { text: "Failed to complete payouts. Please try again." },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Distribute 0.0001 ETH on base to 0xA0ba2ACB5846A54834173fB0DD9444F756810f06 and 0xF14F2c49aa90BaFA223EE074C1C33b59891826bF",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Mass payouts completed successfully.\\n- Successful Transactions: {{2}}\\n- Failed Transactions: {{1}}\\n\\nDetails:\\n✅ Successful Transactions:\\nAddress: 0xABC123..., Amount: 0.005, Transaction URL: https://etherscan.io/tx/...\\nAddress: 0xDEF456..., Amount: 0.005, Transaction URL: https://etherscan.io/tx/...\\n\\n❌ Failed Transactions:\\nAddress: 0xGHI789..., Amount: 0.005, Error Code: Insufficient Funds\\n\\nCheck the CSV file for full details.`,\\n                    action: "SEND_MASS_PAYOUT",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Airdrop 10 USDC to these community members: 0x789..., 0x101... on base network",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Mass payout completed successfully:\\n- Airdropped 10 USDC to 2 addresses on base network\\n- Successful Transactions: 2\\n- Failed Transactions: 0\\nCheck the CSV file for transaction details.",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Multi-send 0.25 ETH to team wallets: 0x222..., 0x333... on Ethereum",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Mass payout completed successfully:\\n- Multi-sent 0.25 ETH to 2 addresses on Ethereum network\\n- Successful Transactions: 2\\n- Failed Transactions: 0\\nCheck the CSV file for transaction details.",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Distribute rewards of 5 SOL each to contest winners: winner1.sol, winner2.sol on Solana",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Mass payout completed successfully:\\n- Distributed 5 SOL to 2 addresses on Solana network\\n- Successful Transactions: 2\\n- Failed Transactions: 0\\nCheck the CSV file for transaction details.",\\n                },\\n            },\\n        ],\\n    ],\\n};\\n\\nexport const coinbaseMassPaymentsPlugin: Plugin = {\\n    name: "automatedPayments",\\n    description:\\n        "Processes mass payouts using Coinbase SDK and logs all transactions (success and failure) to a CSV file. Provides dynamic transaction data through a provider.",\\n    actions: [sendMassPayoutAction],\\n    providers: [massPayoutProvider],\\n};\\n',
    //             hash: "af590857fd0e2ae1648ad1a5454791137b14fbd71c6c2bde3e4a16ed975638f4",
    //             source: "github",
    //             attachments: [],
    //             metadata: {
    //                 path: "packages/plugin-coinbase/src/plugins/massPayments.ts",
    //                 repo: "eliza",
    //                 owner: "elizaOS",
    //             },
    //         },
    //     },
    //     {
    //         id: "e7ac7854-751a-073b-9d0d-692e5fcf2814",
    //         userId: "12dea96f-ec20-0935-a6ab-75692c994959",
    //         agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
    //         roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
    //         content: {
    //             text: 'import {\\n    composeContext,\\n    elizaLogger,\\n    generateObject,\\n    ModelClass,\\n    Provider,\\n} from "@elizaos/core";\\nimport {\\n    Action,\\n    HandlerCallback,\\n    IAgentRuntime,\\n    Memory,\\n    Plugin,\\n    State,\\n} from "@elizaos/core";\\nimport { ChargeContent, ChargeSchema, isChargeContent } from "../types";\\nimport { chargeTemplate, getChargeTemplate } from "../templates";\\nimport { getWalletDetails } from "../utils";\\nimport { Coinbase } from "@coinbase/coinbase-sdk";\\n\\nconst url = "https://api.commerce.coinbase.com/charges";\\ninterface ChargeRequest {\\n    name: string;\\n    description: string;\\n    pricing_type: string;\\n    local_price: {\\n        amount: string;\\n        currency: string;\\n    };\\n}\\n\\nexport async function createCharge(apiKey: string, params: ChargeRequest) {\\n    elizaLogger.debug("Starting createCharge function");\\n    try {\\n        const response = await fetch(url, {\\n            method: "POST",\\n            headers: {\\n                "Content-Type": "application/json",\\n                "X-CC-Api-Key": apiKey,\\n            },\\n            body: JSON.stringify(params),\\n        });\\n\\n        if (!response.ok) {\\n            throw new Error(`Failed to create charge: ${response.statusText}`);\\n        }\\n\\n        const data = await response.json();\\n        return data.data;\\n    } catch (error) {\\n        elizaLogger.error("Error creating charge:", error);\\n        throw error;\\n    }\\n}\\n\\n// Function to fetch all charges\\nexport async function getAllCharges(apiKey: string) {\\n    elizaLogger.debug("Starting getAllCharges function");\\n    try {\\n        const response = await fetch(url, {\\n            method: "GET",\\n            headers: {\\n                "Content-Type": "application/json",\\n                "X-CC-Api-Key": apiKey,\\n            },\\n        });\\n\\n        if (!response.ok) {\\n            throw new Error(\\n                `Failed to fetch all charges: ${response.statusText}`\\n            );\\n        }\\n\\n        const data = await response.json();\\n        return data.data;\\n    } catch (error) {\\n        elizaLogger.error("Error fetching charges:", error);\\n        throw error;\\n    }\\n}\\n\\n// Function to fetch details of a specific charge\\nexport async function getChargeDetails(apiKey: string, chargeId: string) {\\n    elizaLogger.debug("Starting getChargeDetails function");\\n    const getUrl = `${url}${chargeId}`;\\n\\n    try {\\n        const response = await fetch(getUrl, {\\n            method: "GET",\\n            headers: {\\n                "Content-Type": "application/json",\\n                "X-CC-Api-Key": apiKey,\\n            },\\n        });\\n\\n        if (!response.ok) {\\n            throw new Error(\\n                `Failed to fetch charge details: ${response.statusText}`\\n            );\\n        }\\n\\n        const data = await response.json();\\n        return data;\\n    } catch (error) {\\n        elizaLogger.error(\\n            `Error fetching charge details for ID ${chargeId}:`,\\n            error\\n        );\\n        throw error;\\n    }\\n}\\n\\nexport const createCoinbaseChargeAction: Action = {\\n    name: "CREATE_CHARGE",\\n    similes: [\\n        "MAKE_CHARGE",\\n        "INITIATE_CHARGE",\\n        "GENERATE_CHARGE",\\n        "CREATE_TRANSACTION",\\n        "COINBASE_CHARGE",\\n        "GENERATE_INVOICE",\\n        "CREATE_PAYMENT",\\n        "SETUP_BILLING",\\n        "REQUEST_PAYMENT",\\n        "CREATE_CHECKOUT",\\n        "GET_CHARGE_STATUS",\\n        "LIST_CHARGES",\\n    ],\\n    description:\\n        "Create and manage payment charges using Coinbase Commerce. Supports fixed and dynamic pricing, multiple currencies (USD, EUR, USDC), and provides charge status tracking and management features.",\\n    validate: async (runtime: IAgentRuntime, _message: Memory) => {\\n        const coinbaseCommerceKeyOk = !!runtime.getSetting(\\n            "COINBASE_COMMERCE_KEY"\\n        );\\n\\n        // Ensure Coinbase Commerce API key is available\\n        return coinbaseCommerceKeyOk;\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.info("Composing state for message:", message);\\n        if (!state) {\\n            state = (await runtime.composeState(message)) as State;\\n        } else {\\n            state = await runtime.updateRecentMessageState(state);\\n        }\\n\\n        const context = composeContext({\\n            state,\\n            template: chargeTemplate,\\n        });\\n\\n        const chargeDetails = await generateObject({\\n            runtime,\\n            context,\\n            modelClass: ModelClass.SMALL,\\n            schema: ChargeSchema,\\n        });\\n        if (!isChargeContent(chargeDetails.object)) {\\n            throw new Error("Invalid content");\\n        }\\n        const charge = chargeDetails.object as ChargeContent;\\n        if (!charge || !charge.price || !charge.type) {\\n            callback(\\n                {\\n                    text: "Invalid charge details provided.",\\n                },\\n                []\\n            );\\n            return;\\n        }\\n\\n        elizaLogger.info("Charge details received:", chargeDetails);\\n\\n        // Initialize Coinbase Commerce client\\n        elizaLogger.debug("Starting Coinbase Commerce client initialization");\\n        try {\\n            // Create a charge\\n            const chargeResponse = await createCharge(\\n                runtime.getSetting("COINBASE_COMMERCE_KEY"),\\n                {\\n                    local_price: {\\n                        amount: charge.price.toString(),\\n                        currency: charge.currency,\\n                    },\\n                    pricing_type: charge.type,\\n                    name: charge.name,\\n                    description: charge.description,\\n                }\\n            );\\n\\n            elizaLogger.info(\\n                "Coinbase Commerce charge created:",\\n                chargeResponse\\n            );\\n\\n            callback(\\n                {\\n                    text: `Charge created successfully: ${chargeResponse.hosted_url}`,\\n                    attachments: [\\n                        {\\n                            id: crypto.randomUUID(),\\n                            url: chargeResponse.id,\\n                            title: "Coinbase Commerce Charge",\\n                            description: `Charge ID: ${chargeResponse.id}`,\\n                            text: `Pay here: ${chargeResponse.hosted_url}`,\\n                            source: "coinbase",\\n                        },\\n                    ],\\n                },\\n                []\\n            );\\n        } catch (error) {\\n            elizaLogger.error(\\n                "Error creating Coinbase Commerce charge:",\\n                error\\n            );\\n            callback(\\n                {\\n                    text: "Failed to create a charge. Please try again.",\\n                },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Create a charge for $100 USD for Digital Art NFT with description \'Exclusive digital artwork collection\'",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Charge created successfully:\\n- Amount: $100 USD\\n- Name: Digital Art NFT\\n- Description: Exclusive digital artwork collection\\n- Type: fixed_price\\n- Charge URL: https://commerce.coinbase.com/charges/...",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Set up a dynamic price charge for Premium Membership named \'VIP Access Pass\'",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Charge created successfully:\\n- Type: dynamic_price\\n- Name: VIP Access Pass\\n- Description: Premium Membership\\n- Charge URL: https://commerce.coinbase.com/charges/...",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Generate a payment request for 50 EUR for Workshop Registration",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Charge created successfully:\\n- Amount: 50 EUR\\n- Name: Workshop Registration\\n- Type: fixed_price\\n- Charge URL: https://commerce.coinbase.com/charges/...",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Create an invoice for 1000 USDC for Consulting Services",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Charge created successfully:\\n- Amount: 1000 USDC\\n- Name: Consulting Services\\n- Type: fixed_price\\n- Charge URL: https://commerce.coinbase.com/charges/...",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Check the status of charge abc-123-def",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Charge details retrieved:\\n- ID: abc-123-def\\n- Status: COMPLETED\\n- Amount: 100 USD\\n- Created: 2024-01-20T10:00:00Z\\n- Expires: 2024-01-21T10:00:00Z",\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "List all active charges",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Active charges retrieved:\\n1. ID: abc-123 - $100 USD - Digital Art NFT\\n2. ID: def-456 - 50 EUR - Workshop\\n3. ID: ghi-789 - 1000 USDC - Consulting\\n\\nTotal active charges: 3",\\n                },\\n            },\\n        ],\\n    ],\\n} as Action;\\n\\nexport const getAllChargesAction: Action = {\\n    name: "GET_ALL_CHARGES",\\n    similes: ["FETCH_ALL_CHARGES", "RETRIEVE_ALL_CHARGES", "LIST_ALL_CHARGES"],\\n    description: "Fetch all charges using Coinbase Commerce.",\\n    validate: async (runtime: IAgentRuntime) => {\\n        const coinbaseCommerceKeyOk = !!runtime.getSetting(\\n            "COINBASE_COMMERCE_KEY"\\n        );\\n\\n        // Ensure Coinbase Commerce API key is available\\n        return coinbaseCommerceKeyOk;\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        try {\\n            elizaLogger.info("Composing state for message:", message);\\n            if (!state) {\\n                state = (await runtime.composeState(message)) as State;\\n            } else {\\n                state = await runtime.updateRecentMessageState(state);\\n            }\\n            const charges = await getAllCharges(\\n                runtime.getSetting("COINBASE_COMMERCE_KEY")\\n            );\\n\\n            elizaLogger.info("Fetched all charges:", charges);\\n\\n            callback(\\n                {\\n                    text: `Successfully fetched all charges. Total charges: ${charges.length}`,\\n                },\\n                []\\n            );\\n        } catch (error) {\\n            elizaLogger.error("Error fetching all charges:", error);\\n            callback(\\n                {\\n                    text: "Failed to fetch all charges. Please try again.",\\n                },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: { text: "Fetch all charges" },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Successfully fetched all charges.",\\n                    action: "GET_ALL_CHARGES",\\n                },\\n            },\\n        ],\\n    ],\\n} as Action;\\n\\nexport const getChargeDetailsAction: Action = {\\n    name: "GET_CHARGE_DETAILS",\\n    similes: ["FETCH_CHARGE_DETAILS", "RETRIEVE_CHARGE_DETAILS", "GET_CHARGE"],\\n    description: "Fetch details of a specific charge using Coinbase Commerce.",\\n    validate: async (runtime: IAgentRuntime) => {\\n        const coinbaseCommerceKeyOk = !!runtime.getSetting(\\n            "COINBASE_COMMERCE_KEY"\\n        );\\n\\n        // Ensure Coinbase Commerce API key is available\\n        return coinbaseCommerceKeyOk;\\n    },\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        elizaLogger.info("Composing state for message:", message);\\n        if (!state) {\\n            state = (await runtime.composeState(message)) as State;\\n        } else {\\n            state = await runtime.updateRecentMessageState(state);\\n        }\\n\\n        const context = composeContext({\\n            state,\\n            template: getChargeTemplate,\\n        });\\n        const chargeDetails = await generateObject({\\n            runtime,\\n            context,\\n            modelClass: ModelClass.SMALL,\\n            schema: ChargeSchema,\\n        });\\n        if (!isChargeContent(chargeDetails.object)) {\\n            throw new Error("Invalid content");\\n        }\\n        const charge = chargeDetails.object as ChargeContent;\\n        if (!charge.id) {\\n            callback(\\n                {\\n                    text: "Missing charge ID. Please provide a valid charge ID.",\\n                },\\n                []\\n            );\\n            return;\\n        }\\n\\n        try {\\n            const chargeDetails = await getChargeDetails(\\n                runtime.getSetting("COINBASE_COMMERCE_KEY"),\\n                charge.id\\n            );\\n\\n            elizaLogger.info("Fetched charge details:", chargeDetails);\\n\\n            callback(\\n                {\\n                    text: `Successfully fetched charge details for ID: ${charge.id}`,\\n                    attachments: [\\n                        {\\n                            id: crypto.randomUUID(),\\n                            url: chargeDetails.hosted_url,\\n                            title: `Charge Details for ${charge.id}`,\\n                            description: `Details: ${JSON.stringify(chargeDetails, null, 2)}`,\\n                            source: "coinbase",\\n                            text: "",\\n                        },\\n                    ],\\n                },\\n                []\\n            );\\n        } catch (error) {\\n            elizaLogger.error(\\n                `Error fetching details for charge ID ${charge.id}:`,\\n                error\\n            );\\n            callback(\\n                {\\n                    text: `Failed to fetch details for charge ID: ${charge.id}. Please try again.`,\\n                },\\n                []\\n            );\\n        }\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Fetch details of charge ID: 123456",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: "Successfully fetched charge details. {{charge.id}} for {{charge.amount}} {{charge.currency}} to {{charge.name}} for {{charge.description}}",\\n                    action: "GET_CHARGE_DETAILS",\\n                },\\n            },\\n        ],\\n    ],\\n};\\n\\nexport const chargeProvider: Provider = {\\n    get: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.debug("Starting chargeProvider.get function");\\n        const charges = await getAllCharges(\\n            runtime.getSetting("COINBASE_COMMERCE_KEY")\\n        );\\n        // Ensure API key is available\\n        const coinbaseAPIKey =\\n            runtime.getSetting("COINBASE_API_KEY") ??\\n            process.env.COINBASE_API_KEY;\\n        const coinbasePrivateKey =\\n            runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n            process.env.COINBASE_PRIVATE_KEY;\\n        const balances = [];\\n        const transactions = [];\\n        if (coinbaseAPIKey && coinbasePrivateKey) {\\n            Coinbase.configure({\\n                apiKeyName: coinbaseAPIKey,\\n                privateKey: coinbasePrivateKey,\\n            });\\n            const { balances, transactions } = await getWalletDetails(runtime);\\n            elizaLogger.info("Current Balances:", balances);\\n            elizaLogger.info("Last Transactions:", transactions);\\n        }\\n        const formattedCharges = charges.map((charge) => ({\\n            id: charge.id,\\n            name: charge.name,\\n            description: charge.description,\\n            pricing: charge.pricing,\\n        }));\\n        elizaLogger.info("Charges:", formattedCharges);\\n        return { charges: formattedCharges, balances, transactions };\\n    },\\n};\\n\\nexport const coinbaseCommercePlugin: Plugin = {\\n    name: "coinbaseCommerce",\\n    description:\\n        "Integration with Coinbase Commerce for creating and managing charges.",\\n    actions: [\\n        createCoinbaseChargeAction,\\n        getAllChargesAction,\\n        getChargeDetailsAction,\\n    ],\\n    evaluators: [],\\n    providers: [chargeProvider],\\n};\\n',
    //             hash: "4bcda6d54d73c72965ce3cbb7a1dd618cf1e7461bf0b0c2c1aaf889127eed397",
    //             source: "github",
    //             attachments: [],
    //             metadata: {
    //                 path: "packages/plugin-coinbase/src/plugins/commerce.ts",
    //                 repo: "eliza",
    //                 owner: "elizaOS",
    //             },
    //         },
    //     },
    //     {
    //         id: "b43b992e-db67-0181-a40f-b30a0d156afd",
    //         userId: "12dea96f-ec20-0935-a6ab-75692c994959",
    //         agentId: "b1ccf0ce-60b8-00ed-8da1-0fd7b791d233",
    //         roomId: "dccf6a23-6ea6-0b35-a54e-00c9c1fb9c2d",
    //         content: {
    //             text: 'import { RESTClient } from "../../advanced-sdk-ts/src/rest";\\nimport {\\n    Action,\\n    Plugin,\\n    elizaLogger,\\n    IAgentRuntime,\\n    Memory,\\n    HandlerCallback,\\n    State,\\n    composeContext,\\n    generateObject,\\n    ModelClass,\\n    Provider,\\n} from "@elizaos/core";\\nimport { advancedTradeTemplate } from "../templates";\\nimport { isAdvancedTradeContent, AdvancedTradeSchema } from "../types";\\nimport { readFile } from "fs/promises";\\nimport { parse } from "csv-parse/sync";\\nimport path from "path";\\nimport { fileURLToPath } from "url";\\nimport fs from "fs";\\nimport { createArrayCsvWriter } from "csv-writer";\\nimport {\\n    OrderSide,\\n    OrderConfiguration,\\n} from "../../advanced-sdk-ts/src/rest/types/common-types";\\nimport { CreateOrderResponse } from "../../advanced-sdk-ts/src/rest/types/orders-types";\\n\\n// File path setup remains the same\\nconst __filename = fileURLToPath(import.meta.url);\\nconst __dirname = path.dirname(__filename);\\nconst baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");\\nconst tradeCsvFilePath = path.join(baseDir, "advanced_trades.csv");\\n\\nconst tradeProvider: Provider = {\\n    get: async (runtime: IAgentRuntime, _message: Memory) => {\\n        elizaLogger.debug("Starting tradeProvider function");\\n        try {\\n            const client = new RESTClient(\\n                runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY\\n            );\\n\\n            // Get accounts and products information\\n            let accounts, products;\\n            try {\\n                accounts = await client.listAccounts({});\\n            } catch (error) {\\n                elizaLogger.error("Error fetching accounts:", error);\\n                return [];\\n            }\\n\\n            try {\\n                products = await client.listProducts({});\\n            } catch (error) {\\n                elizaLogger.error("Error fetching products:", error);\\n                return [];\\n            }\\n\\n            // Read CSV file logic remains the same\\n            if (!fs.existsSync(tradeCsvFilePath)) {\\n                const csvWriter = createArrayCsvWriter({\\n                    path: tradeCsvFilePath,\\n                    header: [\\n                        "Order ID",\\n                        "Success",\\n                        "Order Configuration",\\n                        "Response",\\n                    ],\\n                });\\n                await csvWriter.writeRecords([]);\\n            }\\n\\n            let csvData, records;\\n            try {\\n                csvData = await readFile(tradeCsvFilePath, "utf-8");\\n            } catch (error) {\\n                elizaLogger.error("Error reading CSV file:", error);\\n                return [];\\n            }\\n\\n            try {\\n                records = parse(csvData, {\\n                    columns: true,\\n                    skip_empty_lines: true,\\n                });\\n            } catch (error) {\\n                elizaLogger.error("Error parsing CSV data:", error);\\n                return [];\\n            }\\n\\n            return {\\n                accounts: accounts.accounts,\\n                products: products.products,\\n                trades: records,\\n            };\\n        } catch (error) {\\n            elizaLogger.error("Error in tradeProvider:", error);\\n            return [];\\n        }\\n    },\\n};\\n\\nexport async function appendTradeToCsv(tradeResult: any) {\\n    elizaLogger.debug("Starting appendTradeToCsv function");\\n    try {\\n        const csvWriter = createArrayCsvWriter({\\n            path: tradeCsvFilePath,\\n            header: ["Order ID", "Success", "Order Configuration", "Response"],\\n            append: true,\\n        });\\n        elizaLogger.info("Trade result:", tradeResult);\\n\\n        // Format trade data based on success/failure\\n        const formattedTrade = [\\n            tradeResult.success_response?.order_id ||\\n                tradeResult.failure_response?.order_id ||\\n                "",\\n            tradeResult.success,\\n            // JSON.stringify(tradeResult.order_configuration || {}),\\n            // JSON.stringify(tradeResult.success_response || tradeResult.failure_response || {})\\n        ];\\n\\n        elizaLogger.info("Formatted trade for CSV:", formattedTrade);\\n        await csvWriter.writeRecords([formattedTrade]);\\n        elizaLogger.info("Trade written to CSV successfully");\\n    } catch (error) {\\n        elizaLogger.error("Error writing trade to CSV:", error);\\n        // Log the actual error for debugging\\n        if (error instanceof Error) {\\n            elizaLogger.error("Error details:", error.message);\\n        }\\n    }\\n}\\n\\nasync function hasEnoughBalance(\\n    client: RESTClient,\\n    currency: string,\\n    amount: number,\\n    side: string\\n): Promise<boolean> {\\n    elizaLogger.debug("Starting hasEnoughBalance function");\\n    try {\\n        const response = await client.listAccounts({});\\n        const accounts = JSON.parse(response);\\n        elizaLogger.info("Accounts:", accounts);\\n        const checkCurrency = side === "BUY" ? "USD" : currency;\\n        elizaLogger.info(\\n            `Checking balance for ${side} order of ${amount} ${checkCurrency}`\\n        );\\n\\n        // Find account with exact currency match\\n        const account = accounts?.accounts.find(\\n            (acc) =>\\n                acc.currency === checkCurrency &&\\n                (checkCurrency === "USD"\\n                    ? acc.type === "ACCOUNT_TYPE_FIAT"\\n                    : acc.type === "ACCOUNT_TYPE_CRYPTO")\\n        );\\n\\n        if (!account) {\\n            elizaLogger.error(`No ${checkCurrency} account found`);\\n            return false;\\n        }\\n\\n        const available = parseFloat(account.available_balance.value);\\n        // Add buffer for fees only on USD purchases\\n        const requiredAmount = side === "BUY" ? amount * 1.01 : amount;\\n        elizaLogger.info(\\n            `Required amount (including buffer): ${requiredAmount} ${checkCurrency}`\\n        );\\n\\n        const hasBalance = available >= requiredAmount;\\n        elizaLogger.info(`Has sufficient balance: ${hasBalance}`);\\n\\n        return hasBalance;\\n    } catch (error) {\\n        elizaLogger.error("Balance check failed with error:", {\\n            error: error instanceof Error ? error.message : "Unknown error",\\n            currency,\\n            amount,\\n            side,\\n        });\\n        return false;\\n    }\\n}\\n\\nexport const executeAdvancedTradeAction: Action = {\\n    name: "EXECUTE_ADVANCED_TRADE",\\n    description: "Execute a trade using Coinbase Advanced Trading API",\\n    validate: async (runtime: IAgentRuntime) => {\\n        return (\\n            !!(\\n                runtime.getSetting("COINBASE_API_KEY") ||\\n                process.env.COINBASE_API_KEY\\n            ) &&\\n            !!(\\n                runtime.getSetting("COINBASE_PRIVATE_KEY") ||\\n                process.env.COINBASE_PRIVATE_KEY\\n            )\\n        );\\n    },\\n    similes: [\\n        "EXECUTE_ADVANCED_TRADE",\\n        "ADVANCED_MARKET_ORDER",\\n        "ADVANCED_LIMIT_ORDER",\\n        "COINBASE_PRO_TRADE",\\n        "PROFESSIONAL_TRADE",\\n    ],\\n    handler: async (\\n        runtime: IAgentRuntime,\\n        _message: Memory,\\n        state: State,\\n        _options: any,\\n        callback: HandlerCallback\\n    ) => {\\n        let client: RESTClient;\\n\\n        // Initialize client\\n        elizaLogger.debug("Starting advanced trade client initialization");\\n        try {\\n            client = new RESTClient(\\n                runtime.getSetting("COINBASE_API_KEY") ??\\n                    process.env.COINBASE_API_KEY,\\n                runtime.getSetting("COINBASE_PRIVATE_KEY") ??\\n                    process.env.COINBASE_PRIVATE_KEY\\n            );\\n            elizaLogger.info("Advanced trade client initialized");\\n        } catch (error) {\\n            elizaLogger.error("Client initialization failed:", error);\\n            callback(\\n                {\\n                    text: "Failed to initialize trading client. Please check your API credentials.",\\n                },\\n                []\\n            );\\n            return;\\n        }\\n\\n        // Generate trade details\\n        let tradeDetails;\\n        elizaLogger.debug("Starting trade details generation");\\n        try {\\n            tradeDetails = await generateObject({\\n                runtime,\\n                context: composeContext({\\n                    state,\\n                    template: advancedTradeTemplate,\\n                }),\\n                modelClass: ModelClass.SMALL,\\n                schema: AdvancedTradeSchema,\\n            });\\n            elizaLogger.info("Trade details generated:", tradeDetails.object);\\n        } catch (error) {\\n            elizaLogger.error("Trade details generation failed:", error);\\n            callback(\\n                {\\n                    text: "Failed to generate trade details. Please provide valid trading parameters.",\\n                },\\n                []\\n            );\\n            return;\\n        }\\n\\n        // Validate trade content\\n        if (!isAdvancedTradeContent(tradeDetails.object)) {\\n            elizaLogger.error("Invalid trade content:", tradeDetails.object);\\n            callback(\\n                {\\n                    text: "Invalid trade details. Please check your input parameters.",\\n                },\\n                []\\n            );\\n            return;\\n        }\\n\\n        const { productId, amount, side, orderType, limitPrice } =\\n            tradeDetails.object;\\n\\n        // Configure order\\n        let orderConfiguration: OrderConfiguration;\\n        elizaLogger.debug("Starting order configuration");\\n        try {\\n            if (orderType === "MARKET") {\\n                orderConfiguration =\\n                    side === "BUY"\\n                        ? {\\n                              market_market_ioc: {\\n                                  quote_size: amount.toString(),\\n                              },\\n                          }\\n                        : {\\n                              market_market_ioc: {\\n                                  base_size: amount.toString(),\\n                              },\\n                          };\\n            } else {\\n                if (!limitPrice) {\\n                    throw new Error("Limit price is required for limit orders");\\n                }\\n                orderConfiguration = {\\n                    limit_limit_gtc: {\\n                        baseSize: amount.toString(),\\n                        limitPrice: limitPrice.toString(),\\n                        postOnly: false,\\n                    },\\n                };\\n            }\\n            elizaLogger.info(\\n                "Order configuration created:",\\n                orderConfiguration\\n            );\\n        } catch (error) {\\n            elizaLogger.error("Order configuration failed:", error);\\n            callback(\\n                {\\n                    text:\\n                        error instanceof Error\\n                            ? error.message\\n                            : "Failed to configure order parameters.",\\n                },\\n                []\\n            );\\n            return;\\n        }\\n\\n        // Execute trade\\n        let order: CreateOrderResponse;\\n        try {\\n            elizaLogger.debug("Executing the trade");\\n            if (\\n                !(await hasEnoughBalance(\\n                    client,\\n                    productId.split("-")[0],\\n                    amount,\\n                    side\\n                ))\\n            ) {\\n                callback(\\n                    {\\n                        text: `Insufficient ${side === "BUY" ? "USD" : productId.split("-")[0]} balance to execute this trade`,\\n                    },\\n                    []\\n                );\\n                return;\\n            }\\n\\n            order = await client.createOrder({\\n                clientOrderId: crypto.randomUUID(),\\n                productId,\\n                side: side === "BUY" ? OrderSide.BUY : OrderSide.SELL,\\n                orderConfiguration,\\n            });\\n\\n            elizaLogger.info("Trade executed successfully:", order);\\n        } catch (error) {\\n            elizaLogger.error("Trade execution failed:", error?.message);\\n            callback(\\n                {\\n                    text: `Failed to execute trade: ${error instanceof Error ? error.message : "Unknown error occurred"}`,\\n                },\\n                []\\n            );\\n            return;\\n        }\\n        // Log trade to CSV\\n        try {\\n            // await appendTradeToCsv(order);\\n            elizaLogger.info("Trade logged to CSV");\\n        } catch (csvError) {\\n            elizaLogger.warn("Failed to log trade to CSV:", csvError);\\n            // Continue execution as this is non-critical\\n        }\\n\\n        callback(\\n            {\\n                text: `Advanced Trade executed successfully:\\n- Product: ${productId}\\n- Type: ${orderType} Order\\n- Side: ${side}\\n- Amount: ${amount}\\n- ${orderType === "LIMIT" ? `- Limit Price: ${limitPrice}\\n` : ""}- Order ID: ${order.order_id}\\n- Status: ${order.success}\\n- Order Id:  ${order.order_id}\\n- Response: ${JSON.stringify(order.response)}\\n- Order Configuration: ${JSON.stringify(order.order_configuration)}`,\\n            },\\n            []\\n        );\\n    },\\n    examples: [\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: {\\n                    text: "Place an advanced market order to buy $1 worth of BTC",\\n                },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Advanced Trade executed successfully:\\n- Product: BTC-USD\\n- Type: Market Order\\n- Side: BUY\\n- Amount: 1000\\n- Order ID: CB-ADV-12345\\n- Success: true\\n- Response: {"success_response":{}}\\n- Order Configuration: {"market_market_ioc":{"quote_size":"1000"}}`,\\n                },\\n            },\\n        ],\\n        [\\n            {\\n                user: "{{user1}}",\\n                content: { text: "Set a limit order to sell 0.5 ETH at $2000" },\\n            },\\n            {\\n                user: "{{agentName}}",\\n                content: {\\n                    text: `Advanced Trade executed successfully:\\n- Product: ETH-USD\\n- Type: Limit Order\\n- Side: SELL\\n- Amount: 0.5\\n- Limit Price: 2000\\n- Order ID: CB-ADV-67890\\n- Success: true\\n- Response: {"success_response":{}}\\n- Order Configuration: {"limit_limit_gtc":{"baseSize":"0.5","limitPrice":"2000","postOnly":false}}`,\\n                },\\n            },\\n        ],\\n    ],\\n};\\n\\nexport const advancedTradePlugin: Plugin = {\\n    name: "advancedTradePlugin",\\n    description: "Enables advanced trading using Coinbase Advanced Trading API",\\n    actions: [executeAdvancedTradeAction],\\n    providers: [tradeProvider],\\n};\\n',
    //             hash: "51759f75126084feb9bbbfa60083aa13ca32a9cb39e3e44d099c758dde332d75",
    //             source: "github",
    //             attachments: [],
    //             metadata: {
    //                 path: "packages/plugin-coinbase/src/plugins/advancedTrade.ts",
    //                 repo: "eliza",
    //                 owner: "elizaOS",
    //             },
    //         },
    //     },
    // ];
    // elizaLogger.info("Memories:", memories);
    const memories = allMemories.filter(
        (memory) => (memory.content.metadata as any)?.path
    );
    return memories.map(
        (memory) => `File: ${(memory.content.metadata as any)?.path}
        Content: ${memory.content.text.replace(/\n/g, "\\n")}
        `
    );
};

export async function getIssuesFromMemories(
    runtime: IAgentRuntime,
    owner: string,
    repo: string,
    branch: string
): Promise<Memory[]> {
    const roomId = stringToUuid(`github-${owner}-${repo}-${branch}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
        count: 1000,
    });
    // elizaLogger.log("Memories:", memories);
    await fs.writeFile(
        "/tmp/getIssuesFromMemories.txt",
        JSON.stringify(memories, null, 2)
    );
    // Filter memories to only include those that are issues
    const issueMemories = memories.filter(
        (memory) => (memory.content.metadata as any)?.type === "issue"
    );
    return issueMemories;
}

export const getIssueFromMemories = async (
    runtime: IAgentRuntime,
    message: Memory,
    issueNumber: number
): Promise<Memory | null> => {
    const roomId = message.roomId;
    const memories = await runtime.messageManager.getMemories({
        roomId,
        count: 1000,
    });
    const issueId = stringToUuid(
        `${roomId}-${runtime.agentId}-issue-${issueNumber}`
    );
    return memories.find((memory) => memory.id === issueId) ?? null;
};

export const getPullRequestFromMemories = async (
    runtime: IAgentRuntime,
    message: Memory,
    pullRequestNumber: number
): Promise<Memory | null> => {
    const roomId = message.roomId;
    const memories = await runtime.messageManager.getMemories({
        roomId,
        count: 1000,
    });
    const prId = stringToUuid(
        `${roomId}-${runtime.agentId}-pr-${pullRequestNumber}`
    );
    return memories.find((memory) => memory.id === prId) ?? null;
};

export async function saveIssueToMemory(
    runtime: IAgentRuntime,
    issue: RestEndpointMethodTypes["issues"]["create"]["response"]["data"],
    owner: string,
    repo: string,
    branch: string
): Promise<Memory> {
    const roomId = stringToUuid(`github-${owner}-${repo}-${branch}`);
    const issueId = stringToUuid(
        `${roomId}-${runtime.agentId}-issue-${issue.number}`
    );
    const issueMemory: Memory = {
        id: issueId,
        userId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: roomId,
        content: {
            text: `Issue Created: ${issue.title}`,
            action: "CREATE_ISSUE",
            source: "github",
            metadata: {
                type: "issue",
                url: issue.html_url,
                number: issue.number,
                state: issue.state,
                created_at: issue.created_at,
                updated_at: issue.updated_at,
                comments: issue.comments,
                labels: issue.labels.map((label: any) =>
                    typeof label === "string" ? label : label?.name
                ),
                body: issue.body,
            },
        },
    };

    // elizaLogger.log("Issue memory:", issueMemory);
    await fs.writeFile(
        `/tmp/saveIssueToMemory-issueMemory-${issue.number}.txt`,
        JSON.stringify(issueMemory, null, 2)
    );

    await runtime.messageManager.createMemory(issueMemory);

    return issueMemory;
}

export const saveIssuesToMemory = async (
    runtime: IAgentRuntime,
    owner: string,
    repository: string,
    branch: string,
    apiToken: string,
    limit: number = 999999
): Promise<Memory[]> => {
    const roomId = stringToUuid(`github-${owner}-${repository}-${branch}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
    });
    const githubService = new GitHubService({
        owner: owner,
        repo: repository,
        branch: branch,
        auth: apiToken,
    });
    const issues = await githubService.getIssues(limit);
    elizaLogger.log(`Total issues found: ${issues.length}`);
    // await fs.writeFile("/tmp/issues.txt", JSON.stringify(issues, null, 2));
    const issuesMemories: Memory[] = [];
    // create memories for each issue if they are not already in the memories
    for (const issue of issues) {
        // check if the issue is already in the memories by checking id in the memories

        // const issueMemory = memories.find(
        //     (memory) =>
        //         memory.id ===
        //         stringToUuid(
        //             `${roomId}-${runtime.agentId}-issue-${issue.number}`
        //         )
        // );
        // if (!issueMemory) {
        const newIssueMemory = await saveIssueToMemory(
            runtime,
            issue,
            owner,
            repository,
            branch
        );

        issuesMemories.push(newIssueMemory);
        // } else {
        //     elizaLogger.log("Issue already in memories:", issueMemory);
        //     // update the issue memory
        // }
    }
    // await fs.writeFile("/tmp/issuesMemories.txt", JSON.stringify(issuesMemories, null, 2));
    return issuesMemories;
};

export async function incorporateRepositoryState(
    owner: string,
    repository: string,
    branch: string,
    state: State,
    runtime: IAgentRuntime,
    message: Memory,
    relevantMemories: Memory[],
    isIssuesFlow: boolean,
    isPullRequestsFlow: boolean
) {
    const files = await getFilesFromMemories(runtime, message);
    await fs.writeFile("/tmp/files.txt", JSON.stringify(files, null, 2));
    state.files = files;
    state.messageExamples = JSON.stringify(
        runtime.character?.messageExamples,
        null,
        2
    );
    state.system = runtime.character?.system;
    state.topics = JSON.stringify(runtime.character?.topics, null, 2);
    state.style = JSON.stringify(runtime.character?.style, null, 2);
    state.adjectives = JSON.stringify(runtime.character?.adjectives, null, 2);
    const sanitizedMemories = sanitizeMemories(relevantMemories);
    state.relevantMemories = JSON.stringify(sanitizedMemories, null, 2);
    // Doesn't exist in character or state but we want it in state
    // state.facts = JSON.stringify(
    //     sanitizeMemories(
    //         (await runtime.messageManager.getMemories({
    //             roomId: message.roomId,
    //         })).filter(
    //             (memory) =>
    //                 !["issue", "pull_request"].includes((memory.content.metadata as any)?.type)
    //         )
    //     ),
    //     null,
    //     2
    // );
    // TODO:
    // We need to actually save goals, knowledge,facts, we only save memories for now
    // We need to dynamically update the goals, knoweldge, facts, bio, lore, we should add actions to update these and chain them to the OODA cycle
    state.owner = owner;
    state.repository = repository;
    state.branch = branch;
    state.message = message.content.text;

    if (isIssuesFlow) {
        const previousIssues = await getIssuesFromMemories(
            runtime,
            owner,
            repository,
            branch
        );
        await fs.writeFile(
            "/tmp/plugin-github-previousIssues.txt",
            JSON.stringify(previousIssues, null, 2)
        );
        state.previousIssues = JSON.stringify(
            previousIssues.map((issue) => ({
                title: issue.content.text,
                body: (issue.content.metadata as any).body,
                url: (issue.content.metadata as any).url,
                number: (issue.content.metadata as any).number,
                state: (issue.content.metadata as any).state,
            })),
            null,
            2
        );
    }

    if (isPullRequestsFlow) {
        const previousPRs = await getPullRequestsFromMemories(
            runtime,
            owner,
            repository,
            branch
        );
        // await fs.writeFile("/tmp/previousPRs.txt", JSON.stringify(previousPRs, null, 2));
        state.previousPRs = JSON.stringify(
            previousPRs.map((pr) => ({
                title: pr.content.text,
                body: (pr.content.metadata as any).body,
                url: (pr.content.metadata as any).url,
                number: (pr.content.metadata as any).number,
                state: (pr.content.metadata as any).state,
                diff: (pr.content.metadata as any).diff,
                comments: (pr.content.metadata as any).comments,
            })),
            null,
            2
        );
    }
    return state;
}

export async function getPullRequestsFromMemories(
    runtime: IAgentRuntime,
    owner: string,
    repo: string,
    branch: string
): Promise<Memory[]> {
    const roomId = stringToUuid(`github-${owner}-${repo}-${branch}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
        count: 1000,
    });
    // Filter memories to only include those that are pull requests
    const prMemories = memories.filter(
        (memory) => (memory.content.metadata as any)?.type === "pull_request"
    );
    return prMemories;
}

function sanitizeMemories(memories: Memory[]): Partial<Memory>[] {
    return memories.map((memory) => ({
        content: memory.content,
        roomId: memory.roomId,
        createdAt: memory.createdAt,
        // we could remove these for if hitting token limit
        userId: memory.userId,
        agentId: memory.agentId,
        similarity: memory.similarity,
    }));
}

export const createTemplate = (
    prompt: string,
    output: string,
    examples: string
) => {
    return `
${prompt}

${contextTemplate}

${output}

${examples}
`;
};

export async function savePullRequestToMemory(
    runtime: IAgentRuntime,
    pullRequest: RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][number],
    owner: string,
    repository: string,
    branch: string,
    apiToken: string
): Promise<Memory> {
    const roomId = stringToUuid(`github-${owner}-${repository}-${branch}`);
    const githubService = new GitHubService({
        owner: owner,
        repo: repository,
        auth: apiToken,
    });
    const prId = stringToUuid(
        `${roomId}-${runtime.agentId}-pr-${pullRequest.number}`
    );
    const prMemory: Memory = {
        id: prId,
        userId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: roomId,
        content: {
            text: `Pull Request Created: ${pullRequest.title}`,
            metadata: await getPullRequestMetadata(pullRequest, githubService),
        },
    };

    await runtime.messageManager.createMemory(prMemory);
    return prMemory;
}

export async function saveCreatedPullRequestToMemory(
    runtime: IAgentRuntime,
    pullRequest: RestEndpointMethodTypes["pulls"]["create"]["response"]["data"],
    owner: string,
    repository: string,
    branch: string,
    apiToken: string
): Promise<Memory> {
    const roomId = stringToUuid(`github-${owner}-${repository}-${branch}`);
    const githubService = new GitHubService({
        owner: owner,
        repo: repository,
        auth: apiToken,
    });
    const prId = stringToUuid(
        `${roomId}-${runtime.agentId}-pr-${pullRequest.number}`
    );
    const prMemory: Memory = {
        id: prId,
        userId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: roomId,
        content: {
            text: `Pull Request Created: ${pullRequest.title}`,
            metadata: await getCreatedPullRequestMetadata(
                pullRequest,
                githubService
            ),
        },
    };

    await runtime.messageManager.createMemory(prMemory);
    return prMemory;
}

export const savePullRequestsToMemory = async (
    runtime: IAgentRuntime,
    owner: string,
    repository: string,
    branch: string,
    apiToken: string,
    limit: number = 999999
): Promise<Memory[]> => {
    const roomId = stringToUuid(`github-${owner}-${repository}-${branch}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
    });
    const githubService = new GitHubService({
        owner: owner,
        repo: repository,
        auth: apiToken,
    });
    const pullRequests = await githubService.getPullRequests(limit);
    const pullRequestsMemories: Memory[] = [];
    // create memories for each pull request if they are not already in the memories
    for (const pr of pullRequests) {
        // check if the pull request is already in the memories by checking id in the memories

        const prMemory =
            memories.find(
                (memory) =>
                    memory.id ===
                    stringToUuid(`${roomId}-${runtime.agentId}-pr-${pr.number}`)
            ) ?? null;
        if (!prMemory) {
            const newPrMemory = await savePullRequestToMemory(
                runtime,
                pr,
                owner,
                repository,
                branch,
                apiToken
            );
            pullRequestsMemories.push(newPrMemory);
        } else {
            elizaLogger.log("Pull request already in memories:", prMemory);
            // update the pull request memory
        }
    }
    // elizaLogger.log("Pull requests memories:", pullRequestsMemories);
    await fs.writeFile(
        "/tmp/savePullRequestsToMemory-pullRequestsMemories.txt",
        JSON.stringify(pullRequestsMemories, null, 2)
    );
    return pullRequestsMemories;
};

export async function getPullRequestMetadata(
    pullRequest: RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][number],
    githubService: GitHubService
): Promise<any> {
    return {
        type: "pull_request",
        url: pullRequest.html_url,
        number: pullRequest.number,
        state: pullRequest.state,
        created_at: pullRequest.created_at,
        updated_at: pullRequest.updated_at,
        comments: await githubService.getPRCommentsText(
            pullRequest.comments_url
        ),
        labels: pullRequest.labels.map((label: any) =>
            typeof label === "string" ? label : label?.name
        ),
        body: pullRequest.body,
        diff:
            pullRequest.number !== 158 // TODO: ignore WIP PRs that contains big diffs
                ? await githubService.getPRDiffText(pullRequest.url)
                : "<diff truncated>",
    };
}

export async function getCreatedPullRequestMetadata(
    pullRequest: RestEndpointMethodTypes["pulls"]["create"]["response"]["data"],
    githubService: GitHubService
): Promise<any> {
    return {
        type: "pull_request",
        url: pullRequest.html_url,
        number: pullRequest.number,
        state: pullRequest.state,
        created_at: pullRequest.created_at,
        updated_at: pullRequest.updated_at,
        comments: await githubService.getPRCommentsText(
            pullRequest.comments_url
        ),
        labels: pullRequest.labels.map((label: any) =>
            typeof label === "string" ? label : label?.name
        ),
        body: pullRequest.body,
        diff: await githubService.getPRDiffText(pullRequest.diff_url),
    };
}
