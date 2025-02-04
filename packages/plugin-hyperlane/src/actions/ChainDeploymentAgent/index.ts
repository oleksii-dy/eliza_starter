import {
    Action,
    ActionExample,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";
import { CommandContext } from "../core/context";
import { evmWalletProvider, initWalletProvider } from "@elizaos/plugin-evm";
import { ethers } from "ethers";
import {  ProtocolType } from "@hyperlane-xyz/utils";
import { ChainMetadata , ChainMetadataSchema, HookConfig, IsmConfig, IsmType, OwnableConfig } from "@hyperlane-xyz/sdk";
import { completeDeploy, createMerkleTreeConfig, createMultisignConfig, filterAddresses, handleMissingInterchainGasPaymaster, prepareDeploy , requestAndSaveApiKeys, runDeployPlanStep, runPreflightChecksForChains, validateAgentConfig  } from "../core/utils";
import type {DeployParams} from "../deployWarpRoute/types"
import { chainAddresses, chainMetadata  , GithubRegistry} from "@hyperlane-xyz/registry";
import { buildAgentConfig, ChainMap, ContractVerifier, EvmCoreModule, ExplorerLicenseType, HyperlaneCore, HyperlaneDeploymentArtifacts, MultiProvider  } from "@hyperlane-xyz/sdk";
import {getStartBlocks} from "../core/utils";
import { MINIMUM_CORE_DEPLOY_GAS } from "../../utils/consts";
import { buildArtifact as coreBuildArtifact } from '@hyperlane-xyz/core/buildArtifact.js';
import { writeYamlOrJson } from "../../utils/configOps";
import { stringify as yamlStringify } from 'yaml';
import { CoreConfigSchema } from "@hyperlane-xyz/sdk";

const registry = new GithubRegistry();


//Initialize the chain congig
export async function createChainConfig({
    rpcUrl,
    chainName,
    chainId,
    isTestnet,
} :  {
    rpcUrl : string,
    chainName : string,
    chainId : number,
    isTestnet : boolean
}) {
    elizaLogger.log("Creating chain config...")
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const metadata: ChainMetadata = {
        name : chainName,
        displayName: chainName,
        chainId ,
        domainId : chainId,
        protocol : ProtocolType.Ethereum ,
        rpcUrls : [{ http : rpcUrl }] ,
        isTestnet
    }

    const parseResult = ChainMetadataSchema.safeParse(metadata);

    if (parseResult.success){
        const metadataYaml = yamlStringify(metadata, {
            indent: 2,
            sortMapEntries: true,
          });

          await registry.updateChain({chainName : metadata.name , metadata})
    }
}


//initialize the chain
async function InitializeDeployment(
    {
        owner,
        context ,
        configFilePath,
    } : {
        owner : string,
        context : CommandContext,
        configFilePath : string
    }
) {
    elizaLogger.log("Initializing deployment...")

    const defaultIsm = createMultisignConfig(IsmType.MERKLE_ROOT_MULTISIG);
    const defaultHook = await createMerkleTreeConfig();
    const requiredHook = await createMerkleTreeConfig();

    const proxyAdmin: OwnableConfig = {
        owner
    };

    try{
        const coreConfig = CoreConfigSchema.parse({
            owner,
            defaultIsm,
            defaultHook,
            requiredHook,
            proxyAdmin
        })

        writeYamlOrJson(configFilePath, coreConfig)
        console.log('Core config created')
    }catch(e) {
        console.log(e)
        throw new Error('Error in creating core config')
    }


}



//deploy the contracts for the chain
async function  runCoreDeploy ( params : DeployParams ) {
    const {context , config} = params;

    let chain = params.chain ;
    let apiKeys = await requestAndSaveApiKeys([chain] , chainMetadata , registry)
    const multiProvider = new MultiProvider(chainMetadata) ;
    const signer = multiProvider.getSigner(chain)
    const deploymentParams : DeployParams = {
        context : {...context , signer} ,
        chain,
        config
    }

    const userAddress = await signer.getAddress();
    const initialBalances = await prepareDeploy(context , userAddress , [chain]);

    await runDeployPlanStep(deploymentParams)

    await runPreflightChecksForChains({
        ...deploymentParams ,
        chains : [chain],
        minGas : MINIMUM_CORE_DEPLOY_GAS
    })

    const contractVerifier = new ContractVerifier(
        multiProvider,
        apiKeys ,
        coreBuildArtifact ,
        ExplorerLicenseType.MIT
    )


    elizaLogger.log("Deploying Core...")

    const evmCoreModule = await EvmCoreModule.create({
        chain ,
        config ,
        multiProvider ,
        contractVerifier
    })

    await completeDeploy(context , initialBalances , userAddress , [chain])

    const deployedAddreses = evmCoreModule.serialize()

    await registry.updateChain({
        chainName : chain,
        addresses : deployedAddreses
    })

    elizaLogger.log("Deployed Core! at " + deployedAddreses)


}

//create Agent Configs
async function createAgentConfigs( {
    context ,
    chains ,
    out
} : {
    context :CommandContext ,
    chains ?: string[] ,
    out : string
}) {
    const {multiProvider, registry , chainMetadata , skipConfirmation} = context;
    const addresses = await registry.getAddresses();

    const chainAddresses = filterAddresses(addresses , chains)
    if (!chainAddresses) {
        elizaLogger.error("No chain addresses found")
        throw new Error('No chain addresses found');
    }

    const core = HyperlaneCore.fromAddressesMap(chainAddresses , multiProvider);

    const startBlocks =  await getStartBlocks(chainAddresses , core , chainMetadata)

    await handleMissingInterchainGasPaymaster(chainAddresses)

    const agentConfig = buildAgentConfig(
        Object.keys(chainAddresses) ,
        multiProvider,
        chainAddresses as ChainMap<HyperlaneDeploymentArtifacts>,
        startBlocks
    )


    await validateAgentConfig(agentConfig)

    elizaLogger.log(`\nWriting agent config to file ${out}`)

    writeYamlOrJson(out , agentConfig , "json")

    elizaLogger.log(`Agent config written to ${out}`)
}


export const setUpAgentOnHyperlane: Action = {
    name : "DEPLOY_CHAIN",
    similes : ["DEPLOY_CHAIN_ON_HYPERLANE" , "SETUP_AGENT_ON_HYPERLANE" , "SETUP_AGENT"],

    description : "This action is used to deploy a chain on Hyperlane",


    handler : async () => {

    },

    examples : []   as ActionExample[]


}