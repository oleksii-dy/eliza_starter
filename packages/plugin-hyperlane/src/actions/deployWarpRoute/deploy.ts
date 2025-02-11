 import { ChainName ,
    ChainMap,
    ChainMetadata,
    MultiProvider,
    HypERC20Factories , HypERC721Factories , HypERC20Deployer, HypERC721Deployer,
    ContractVerifier,
    HyperlaneContractsMap,
    WarpRouteDeployConfig,
    HyperlaneProxyFactoryDeployer,
    ExplorerLicenseType,
 } from "@hyperlane-xyz/sdk";
 import { ProtocolType } from '@hyperlane-xyz/utils';

 import { buildArtifact as coreBuildArtifact } from '@hyperlane-xyz/core/buildArtifact.js';
 import { Address } from "@hyperlane-xyz/utils";
 import { DeployParams } from "./types";
 import { ethers , BigNumber } from 'ethers';
 import { resolveWarpIsmAndHook } from './ism';
 import { WriteCommandContext } from "../core/context";
 import { IRegistry } from "@hyperlane-xyz/registry";


 export async function requestAndSaveApiKeys(
    chains: ChainName[],
    chainMetadata: ChainMap<ChainMetadata>,
    registry: IRegistry,
  ): Promise<ChainMap<string>> {
    const apiKeys: ChainMap<string> = {};

    for (const chain of chains) {
      if (chainMetadata[chain]?.blockExplorers?.[0]?.apiKey) {
        apiKeys[chain] = chainMetadata[chain]!.blockExplorers![0]!.apiKey!;
        continue;
      }

        chainMetadata[chain].blockExplorers![0].apiKey = apiKeys[chain];

      }

    return apiKeys;
  }


  export async function prepareDeploy(
    context: WriteCommandContext,
    userAddress: Address | null,
    chains: ChainName[],
  ): Promise<Record<string, BigNumber>> {
    const { multiProvider, isDryRun } = context;
    const initialBalances: Record<string, BigNumber> = {};
    await Promise.all(
      chains.map(async (chain: ChainName) => {
        const provider = multiProvider.getProvider(chain);
        const address =
          userAddress ?? (await context.signer.getAddress());
        const currentBalance = await provider.getBalance(address);
        initialBalances[chain] = currentBalance;
      }),
    );
    return initialBalances;
  }


  export async function executeDeploy(
    params: DeployParams,
    apiKeys: ChainMap<string>,
  ): Promise<HyperlaneContractsMap<HypERC20Factories | HypERC721Factories>> {
    console.log('🚀 All systems ready, captain! Beginning deployment...');

    const {
      warpDeployConfig,
      context: { multiProvider, isDryRun, dryRunChain },
    } = params;

    const deployer = warpDeployConfig.isNft
      ? new HypERC721Deployer(multiProvider)
      : new HypERC20Deployer(multiProvider); // TODO: replace with EvmERC20WarpModule

    const config: WarpRouteDeployConfig =
      isDryRun && dryRunChain
        ? { [dryRunChain]: warpDeployConfig[dryRunChain] }
        : warpDeployConfig;

    const contractVerifier = new ContractVerifier(
      multiProvider,
      apiKeys,
      coreBuildArtifact,
      ExplorerLicenseType.MIT,
    );

    const ismFactoryDeployer = new HyperlaneProxyFactoryDeployer(
      multiProvider,
      contractVerifier,
    );

    // For each chain in WarpRouteConfig, deploy each Ism Factory, if it's not in the registry
    // Then return a modified config with the ism and/or hook address as a string
    const modifiedConfig = await resolveWarpIsmAndHook(
      config,
      params.context,
      ismFactoryDeployer,
      contractVerifier,
    );

    const deployedContracts = await deployer.deploy(modifiedConfig);

    console.log('✅ Warp contract deployments complete');
    return deployedContracts;
  }


  export async function nativeBalancesAreSufficient(
    context : WriteCommandContext,
    multiProvider: MultiProvider,
    chains: ChainName[],
    minGas: string,
  ) {
    const sufficientBalances: boolean[] = [];
    for (const chain of chains) {
      // Only Ethereum chains are supported
      if (multiProvider.getProtocol(chain) !== ProtocolType.Ethereum) {
        console.log(`Skipping balance check for non-EVM chain: ${chain}`);
        continue;
      }
      const address = context.signer.getAddress();

      const provider = multiProvider.getProvider(chain);
      const gasPrice = await provider.getGasPrice();
      const minBalanceWei = gasPrice.mul(minGas).toString();
      const minBalance = ethers.utils.formatEther(minBalanceWei.toString());

      const balanceWei = await multiProvider
        .getProvider(chain)
        .getBalance(address);
      const balance = ethers.utils.formatEther(balanceWei.toString());
      if (balanceWei.lt(minBalanceWei)) {
        const symbol =
          multiProvider.getChainMetadata(chain).nativeToken?.symbol ?? 'ETH';
        console.log(
          `WARNING: ${address} has low balance on ${chain}. At least ${minBalance} ${symbol} recommended but found ${balance} ${symbol}`,
        );
        sufficientBalances.push(false);
      }
    }
    const allSufficient = sufficientBalances.every((sufficient) => sufficient);

    if (allSufficient) {
      console.log('✅ Balances are sufficient');
    } else {
      console.log(`Deployment may fail due to insufficient balance(s)`);

    }
  }
