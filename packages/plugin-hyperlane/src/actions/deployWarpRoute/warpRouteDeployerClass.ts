import type {
    DeployedOwnableConfig,
    IsmConfig,
    WarpRouteDeployConfig,
  } from '@hyperlane-xyz/sdk';
  import { MINIMUM_WARP_DEPLOY_GAS } from './types';
  import {  TokenType } from '@hyperlane-xyz/sdk';
  import { WarpRouteDeployConfigSchema } from '@hyperlane-xyz/sdk';
  import {  writeYamlOrJson } from "../../utils/configOps";
  import { ProtocolType } from '@hyperlane-xyz/utils';
  import type { ChainName } from '@hyperlane-xyz/sdk';
  import { assertSigner } from '../core/utils';
  import { CommandContext , WriteCommandContext } from '../core/context';
  import { DeployParams } from './types';
  import { readWarpRouteDeployConfig , setProxyAdminConfig , createDefaultWarpIsmConfig , writeDeploymentArtifacts , getWarpCoreConfig } from './config';
  import { nativeBalancesAreSufficient , requestAndSaveApiKeys , prepareDeploy ,executeDeploy } from './deploy';




export class WarpDeployerClass{

    private tokenAddress: string;
    private type : TokenType;
    private outPath: string;
    constructor( tokenAddress: string, type : TokenType , outPath: string) {
        this.tokenAddress = tokenAddress;
        this.type = type;
        this.outPath = outPath;

    }

    private async runPreflightChecksForChains({
      chains,
      minGas,
      chainsToGasCheck,
      context
    }: {

      chains: ChainName[];
      minGas: string;
      chainsToGasCheck?: ChainName[];
      context :WriteCommandContext
    }) {
      console.log('Running pre-flight checks for chains...');

      if (!chains?.length) throw new Error('Empty chain selection');

      for (const chain of chains) {
        const metadata = context.multiProvider.tryGetChainMetadata(chain);
        if (!metadata) throw new Error(`No chain config found for ${chain}`);
        if (metadata.protocol !== ProtocolType.Ethereum)
          throw new Error('Only Ethereum chains are supported for now');
        const signer = context.signer
        assertSigner(signer);
        console.log(`✅ ${metadata.displayName ?? chain} signer is valid`);
      }
      console.log('✅ Chains are valid');

      await nativeBalancesAreSufficient(
        context,
        context.multiProvider,
        chainsToGasCheck ?? chains,
        minGas,
      );
    }


    public async createWarpRouteDeployConfig({
        context,
        chains
    }: {
        context: CommandContext ,
        chains : string[]
    }) {

        const result :WarpRouteDeployConfig = {}

        const warpChains = chains


        for (const chain of warpChains) {
            if (!context.signerAddress) {
                throw new Error('Signer address is required');
            }

          const owner = context.signerAddress;

        const chainAddress = await context.registry.getChainAddresses(chain)
        console.log(`Chain address for ${chain} is ${chainAddress}`);

        const mailbox = chainAddress?.mailbox;
         if (!mailbox) {
             throw new Error(`Mailbox address not found for chain ${chain}`);
         }

         const proxyAdmin : DeployedOwnableConfig = await setProxyAdminConfig(
            context,
            chain,
            owner,
            owner
        )


        const  interchainSecurityModule : IsmConfig = createDefaultWarpIsmConfig(owner);

        const isNft = this.type === TokenType.syntheticUri || this.type === TokenType.collateralUri

        switch (this.type) {
            case TokenType.collateral:
                case TokenType.XERC20:
                case TokenType.XERC20Lockbox:
                case TokenType.collateralFiat:
                case TokenType.collateralUri:
                case TokenType.fastCollateral:
                  result[chain] = {
                    mailbox,
                    type : this.type,
                    owner,
                    proxyAdmin,
                    isNft,
                    interchainSecurityModule,
                    token: this.tokenAddress,
                  };
                break;
                case TokenType.syntheticRebase:
                    result[chain] = {
                      mailbox,
                      type :this.type,
                      owner,
                      isNft,
                      proxyAdmin,
                      collateralChainName: '', // This will be derived correctly by zod.parse() below
                      interchainSecurityModule,
                    };
                    break;
                    case TokenType.collateralVaultRebase:
                        result[chain] = {
                          mailbox,
                          type:this.type,
                          owner,
                          proxyAdmin,
                          isNft,
                          interchainSecurityModule,
                          token: this.tokenAddress,
                        };
                        break;
                        case TokenType.collateralVault:
                            result[chain] = {
                              mailbox,
                              type: this.type,
                              owner,
                              proxyAdmin,
                              isNft,
                              interchainSecurityModule,
                              token: this.tokenAddress,
                            };
                            break;
                            default:
                                result[chain] = {
                                  mailbox,
                                  type :this.type,
                                  owner,
                                  proxyAdmin,
                                  isNft,
                                  interchainSecurityModule,
                                };


        }

        try {
            const warpRouteDeployConfig = WarpRouteDeployConfigSchema.parse(result);
            writeYamlOrJson(this.outPath, warpRouteDeployConfig, 'yaml');
          } catch (e) {
            console.log(
              `Warp route deployment config is invalid, please see https://github.com/hyperlane-xyz/hyperlane-monorepo/blob/main/typescript/cli/examples/warp-route-deployment.yaml for an example.`,
            );
            throw e;
          }
         }


    }

    public async runWarpRouteDeploy({
        context ,
        warpRouteDeployConfigPath,
    }:{
        context:WriteCommandContext,
        warpRouteDeployConfigPath: string,
    }) {

        const { chainMetadata , registry} = context ;

        const warpRouteConfig = await readWarpRouteDeployConfig(warpRouteDeployConfigPath , context);

        const chains = Object.keys(warpRouteConfig);

       const apiKeys = await requestAndSaveApiKeys(chains, chainMetadata, registry);



        const deploymentParams:DeployParams = {
            context,
            warpDeployConfig: warpRouteConfig,
        }


        const ethereumChains = chains.filter(
            (chain) => chainMetadata[chain].protocol === ProtocolType.Ethereum,
          );
          await this.runPreflightChecksForChains({
            context,
            chains: ethereumChains,
            minGas: MINIMUM_WARP_DEPLOY_GAS,
          });

          const initialBalances = await prepareDeploy(context, null, ethereumChains);
          const deployedContracts = await executeDeploy(deploymentParams, apiKeys);

          const { warpCoreConfig, addWarpRouteOptions } = await getWarpCoreConfig(
            deploymentParams,
            deployedContracts,
          );

          await writeDeploymentArtifacts(warpCoreConfig, context, addWarpRouteOptions);

    }



}

