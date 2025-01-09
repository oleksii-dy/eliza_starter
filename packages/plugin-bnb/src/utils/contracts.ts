import { elizaLogger } from "@elizaos/core";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename)

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, "../../plugin-bnb/src/contracts");

function getOpenZeppelinContract(contractPath: string): string {
    try {
        // 找到 @openzeppelin/contracts 包的根目录
        const packageJsonPath = require.resolve(
            "@openzeppelin/contracts/package.json"
        );
        const packageRoot = path.dirname(packageJsonPath);

        // 构建完整的合约文件路径
        const fullPath = path.join(packageRoot, contractPath);

        console.log("Reading contract from:", fullPath);

        // 读取合约文件
        return fs.readFileSync(fullPath, "utf8");
    } catch (error) {
        console.error("Error reading OpenZeppelin contract:", error);
        throw error;
    }
}

function getContractSource(contractPath: string) {
    return fs.readFileSync(contractPath, "utf8");
}

function findImports(importPath: string) {
    elizaLogger.log("importPath", importPath);
    try {
        if (importPath.startsWith("@openzeppelin/")) {
            elizaLogger.log("in modPath");
            const modPath = require.resolve(importPath);
            elizaLogger.log("modPath", modPath);
            return { contents: fs.readFileSync(modPath, "utf8") };
        }

        const localPath = path.resolve("./contracts", importPath);
        if (fs.existsSync(localPath)) {
            return { contents: fs.readFileSync(localPath, "utf8") };
        }
        return { error: "File not found" };
    } catch (e) {
        return { error: `File not found: ${importPath}` };
    }
}

export async function compileSolidity(contractFileName: string) {
    // const contractPath = path.resolve("./contracts", contractFileName);
    const contractPath = path.join(baseDir, contractFileName + ".sol");
    elizaLogger.log("baseDir", __dirname, baseDir, contractPath);

    // const xx = getOpenZeppelinContract(contractPath);
    // elizaLogger.log("xx", xx);

    const source = getContractSource(contractPath);
    // elizaLogger.log("source", source);

    const input = {
        language: "Solidity",
        sources: {
            [contractFileName]: {
                content: source,
            },
        },
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            outputSelection: {
                "*": {
                    "*": ["*"],
                },
            },
        },
    };

    elizaLogger.log("Compiling contract...");

    try {
        const output = JSON.parse(
            solc.compile(JSON.stringify(input), { import: findImports })
        );

        if (output.errors) {
            const hasError = output.errors.some(
                (error) => error.type === "Error"
            );
            if (hasError) {
                throw new Error(
                    `Compilation errors: ${JSON.stringify(output.errors, null, 2)}`
                );
            }
            console.warn("Compilation warnings:", output.errors);
        }

        const contractName = path.basename(contractFileName, ".sol");
        elizaLogger.log("contractFileName", contractFileName);
        elizaLogger.log("contractName", contractName);
        const contract = output.contracts[contractFileName][contractName];

        if (!contract) {
            throw new Error("Contract compilation result is empty");
        }

        elizaLogger.log("Contract compiled successfully");
        return {
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object,
        };
    } catch (error) {
        console.error("Compilation failed:", error);
        throw error;
    }
}
