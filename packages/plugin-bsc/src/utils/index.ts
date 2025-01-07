import { elizaLogger } from "@elizaos/core";
import * as ethers from "ethers";
import solc from "solc";
import { erc1155Contract, erc20Contract, erc721Contract } from "./contracts";

export interface IDeployBasic {
    privateKey?: string | null;
    rpcUrl?: string | null;
}

export interface IDeployToken {
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: number;
}

export const deployToken = async (
    basicParams: IDeployBasic,
    deployTokenParams: IDeployToken
) => {
    elizaLogger.log("basicParams", basicParams);
    elizaLogger.log("deployTokenParams", deployTokenParams);
    const { privateKey, rpcUrl } = basicParams;
    const { name, symbol, decimals, totalSupply } = deployTokenParams;

    try {
        const { abi, bytecode } = await compileSolidity(
            "CustomERC20",
            erc20Contract
        );

        if (!bytecode) {
            throw new Error("Bytecode is empty after compilation");
        }

        elizaLogger.log("Connecting to rpc node...");
        if (!rpcUrl) {
            elizaLogger.error("rpc url is required");
            return;
        }
        const provider = new ethers.JsonRpcProvider(rpcUrl);

        // checking network connect
        const network = await provider.getNetwork();
        elizaLogger.log(`Connected to network: Chain ID ${network.chainId}`);

        // check private key
        if (!privateKey) {
            elizaLogger.error(
                "Private key is not set in environment variables"
            );
            return;
        }

        const wallet = new ethers.Wallet(privateKey, provider);

        // check wallet balance
        const balance = await provider.getBalance(wallet.address);
        elizaLogger.log(`Wallet balance: ${ethers.formatEther(balance)} BNB`);

        if (balance === 0n) {
            elizaLogger.error("Wallet has no BNB for gas fees");
        }

        elizaLogger.log("Creating contract factory...");
        const factory = new ethers.ContractFactory(abi, bytecode, wallet);

        const totalSupplyWithDecimals = ethers.parseUnits(
            totalSupply.toString(),
            decimals
        );
        const deployedContract = await factory.deploy(
            name,
            symbol,
            decimals,
            totalSupplyWithDecimals
        );
        await deployedContract.waitForDeployment();

        const contractAddress = await deployedContract.getAddress();

        elizaLogger.log("Waiting for deployment transaction...");
        const tokenContract = new ethers.Contract(contractAddress, abi, wallet);

        const token = await tokenContract.waitForDeployment();
        const tokenAddress = await token.getAddress();

        elizaLogger.log("Contract deployed successfully!");
        elizaLogger.log("Contract address:", tokenAddress);

        const tokenName = await tokenContract.name();
        const tokenSymbol = await tokenContract.symbol();
        const tokenDecimals = await tokenContract.decimals();
        const tokenTotalSupply = await tokenContract.totalSupply();
        const ownerBalance = await tokenContract.balanceOf(wallet.address);

        elizaLogger.log("\nToken Information:");
        elizaLogger.log("=================");
        elizaLogger.log(`Name: ${tokenName}`);
        elizaLogger.log(`Symbol: ${tokenSymbol}`);
        elizaLogger.log(`Decimals: ${tokenDecimals}`);
        elizaLogger.log(
            `Total Supply: ${ethers.formatUnits(tokenTotalSupply, tokenDecimals)}`
        );
        elizaLogger.log(
            `Owner Balance: ${ethers.formatUnits(ownerBalance, tokenDecimals)}`
        );
        elizaLogger.log(
            `View on BSCScan: https://testnet.bscscan.com/address/${contractAddress}`
        );

        const code = await provider.getCode(tokenAddress);
        if (code === "0x") {
            elizaLogger.error(
                "Contract deployment failed - no code at address"
            );
        }

        return {
            address: tokenAddress,
        };
    } catch (error) {
        elizaLogger.error("Detailed error:", error);
        throw error;
    }
};

export interface IDeployNFT {
    name: string;
    symbol: string;
    baseURI: string;
}

export const deployNFT = async (
    basicParams: IDeployBasic,
    deployNftParams: IDeployNFT
) => {
    elizaLogger.log("basicParams", basicParams);
    elizaLogger.log("deployNftParams", deployNftParams);

    const { privateKey, rpcUrl } = basicParams;
    const { baseURI, name, symbol } = deployNftParams;

    try {
        const { abi, bytecode } = await compileSolidity(
            "CustomERC721",
            erc721Contract
        );
        if (!bytecode) {
            throw new Error("Bytecode is empty after compilation");
        }

        elizaLogger.log("Connecting to rpc node...");
        if (!rpcUrl) {
            elizaLogger.error("rpc url is required");
            return;
        }
        const provider = new ethers.JsonRpcProvider(rpcUrl);

        // checking network connect
        const network = await provider.getNetwork();
        elizaLogger.log(`Connected to network: Chain ID ${network.chainId}`);

        // check private key
        if (!privateKey) {
            elizaLogger.error(
                "Private key is not set in environment variables"
            );
            return;
        }

        const wallet = new ethers.Wallet(privateKey, provider);

        // check wallet balance
        const balance = await provider.getBalance(wallet.address);
        elizaLogger.log(`Wallet balance: ${ethers.formatEther(balance)} BNB`);

        if (balance === 0n) {
            elizaLogger.error("Wallet has no BNB for gas fees");
        }

        elizaLogger.log("Creating contract factory...");
        const factory = new ethers.ContractFactory(abi, bytecode, wallet);

        elizaLogger.log("Deploying contract...");
        const deployedContract = await factory.deploy(name, symbol, baseURI);

        elizaLogger.log("Waiting for deployment...");
        await deployedContract.waitForDeployment();

        const contractAddress = await deployedContract.getAddress();
        elizaLogger.log("Contract deployed successfully!");
        elizaLogger.log("Contract address:", contractAddress);

        const nftContract = new ethers.Contract(contractAddress, abi, wallet);

        const tokenName = await nftContract.name();
        const tokenSymbol = await nftContract.symbol();
        const tokenMaxSupply = await nftContract.maxSupply();
        const currentSupply = await nftContract.totalSupply();

        elizaLogger.log("\nNFT Information:");
        elizaLogger.log("===============");
        elizaLogger.log(`Name: ${tokenName}`);
        elizaLogger.log(`Symbol: ${tokenSymbol}`);
        elizaLogger.log(`Max Supply: ${tokenMaxSupply}`);
        elizaLogger.log(`Current Supply: ${currentSupply}`);
        elizaLogger.log(`Base URI: ${await nftContract.baseURI()}`);

        return {
            address: contractAddress,
            tokenName,
            tokenSymbol,
        };
    } catch (error) {
        elizaLogger.error("Deployment failed:", error);
        throw error;
    }
};

interface IDeploy1155 {
    name: string;
    baseURI: string;
}

export const deploy1155 = async (
    basicParams: IDeployBasic,
    deploy1155Params: IDeploy1155
) => {
    const { privateKey, rpcUrl } = basicParams;
    const { baseURI, name } = deploy1155Params;

    try {
        const { bytecode, abi } = await compileSolidity(
            "CustomERC1155",
            erc1155Contract
        );

        if (!bytecode) {
            throw new Error("Bytecode is empty after compilation");
        }

        elizaLogger.log("Connecting to rpc node...");
        if (!rpcUrl) {
            elizaLogger.error("rpc url is required");
            return;
        }

        const provider = new ethers.JsonRpcProvider(rpcUrl);

        // checking network connect
        const network = await provider.getNetwork();
        elizaLogger.log(`Connected to network: Chain ID ${network.chainId}`);

        // check private key
        if (!privateKey) {
            elizaLogger.error(
                "Private key is not set in environment variables"
            );
            return;
        }

        const wallet = new ethers.Wallet(privateKey, provider);
        elizaLogger.log("Connected to network");

        // check wallet balance
        const balance = await provider.getBalance(wallet.address);
        elizaLogger.log(`Wallet balance: ${ethers.formatEther(balance)} BNB`);

        if (balance === 0n) {
            elizaLogger.error("Wallet has no BNB for gas fees");
        }

        elizaLogger.log("Creating contract factory...");
        const factory = new ethers.ContractFactory(abi, bytecode, wallet);

        elizaLogger.log("Deploying contract...");
        const deployedContract = await factory.deploy(name, baseURI);

        elizaLogger.log("Waiting for deployment...");
        await deployedContract.waitForDeployment();

        const contractAddress = await deployedContract.getAddress();
        elizaLogger.log("Contract deployed successfully!");
        elizaLogger.log("Contract address:", contractAddress);

        const erc1155 = new ethers.Contract(contractAddress, abi, wallet);

        elizaLogger.log("\nSetting max supply for token #1...");
        const setMaxSupplyTx = await erc1155.setMaxSupply(1, 1000);
        await setMaxSupplyTx.wait();

        elizaLogger.log("Minting test tokens...");
        const mintTx = await erc1155.mint(wallet.address, 1, 10);
        await mintTx.wait();

        // get contract info
        const tokenName = await erc1155.name();
        const balance1 = await erc1155.balanceOf(wallet.address, 1);
        const maxSupply1 = await erc1155.maxSupply(1);
        const totalSupply1 = await erc1155.totalSupply(1);

        elizaLogger.log("\nContract Information:");
        elizaLogger.log("====================");
        elizaLogger.log(`Name: ${tokenName}`);
        elizaLogger.log(`Base URI: ${baseURI}`);
        elizaLogger.log(`Token #1 Balance: ${balance1}`);
        elizaLogger.log(`Token #1 Max Supply: ${maxSupply1}`);
        elizaLogger.log(`Token #1 Total Supply: ${totalSupply1}`);
        elizaLogger.log(
            `\nView on BSCScan: https://testnet.bscscan.com/address/${contractAddress}`
        );

        return {
            address: contractAddress,
            name: tokenName,
            baseURI: baseURI,
        };
    } catch (error) {
        elizaLogger.error("Deployment failed:", error);
        throw error;
    }
};

const compileSolidity = async (contractName: string, source: string) => {
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
        const hasError = output.errors.some((error) => error.type === "Error");
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
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object,
    };
};
