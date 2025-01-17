import {
    MultiProvider,
    HyperlaneCoreDeployer,
    ChainMap,
    ChainMetadata,
    HyperlaneIsmFactory,
    ContractVerifier,
    HyperlaneAddressesMap,
    CoreConfig,
    BuildArtifact,
    ExplorerLicenseType,
    TokenType,
    IsmType,
    HookType,
    HypERC20Deployer,
    WarpRouteDeployConfig,
  } from '@hyperlane-xyz/sdk';
  import { ethers } from 'ethers';
  import { ProtocolType } from '@hyperlane-xyz/utils';

  // Define chain configurations for the networks we want to bridge between
  // This includes RPC endpoints, block explorer details, and chain identifiers
  const chainMetadata: ChainMap<ChainMetadata> = {
    ethereum: {
      name: 'ethereum',
      chainId: 17000,        // Holesky testnet chain ID
      domainId: 17000,       // Domain ID for Hyperlane (usually same as chainId)
      protocol: ProtocolType.Ethereum,
      rpcUrls: [
        {
          http: 'https://ethereum-holesky-rpc.publicnode.com',
          pagination: {
            maxBlockRange: 2000,
            minBlockNumber: 0,
          },
          retry: {
            maxRequests: 5,
            baseRetryMs: 1000,
          },
        },
      ],
      blockExplorers: [
        {
          name: 'Etherscan',
          url: 'https://etherscan.io',
          apiUrl: 'https://api.etherscan.io',
        },
      ],
    },
    polygon: {
      name: 'polygon',
      chainId: 80002,        // Mumbai testnet chain ID
      domainId: 80002,       // Domain ID for Hyperlane
      protocol: ProtocolType.Ethereum,
      rpcUrls: [
        {
          http: 'https://rpc-amoy.polygon.technology/',
          pagination: {
            maxBlockRange: 2000,
            minBlockNumber: 0,
          },
          retry: {
            maxRequests: 5,
            baseRetryMs: 1000,
          },
        },
      ],
      blockExplorers: [
        {
          name: 'Polygonscan',
          url: 'https://polygonscan.com',
          apiUrl: 'https://api.polygonscan.com',
        },
      ],
    },
  };

  // Configuration for Hyperlane Core protocol deployment
  // This sets up the base infrastructure needed for cross-chain communication
  const coreConfig: CoreConfig = {
    owner: ethers.constants.AddressZero,  // Owner of the core contracts
    defaultIsm: {
      type: IsmType.TEST_ISM,           // Default Interchain Security Module type
    },
    requiredHook: {
      type: HookType.MERKLE_TREE,       // Required Hook for message verification
    },
    defaultHook: {
      type: HookType.MERKLE_TREE,       // Default Hook for message processing
    },
    proxyAdmin: {
      owner: ethers.constants.AddressZero,  // Owner of the proxy admin contract
      address: ethers.constants.AddressZero, // Proxy admin contract address
    },
    ownerOverrides: {},                  // Chain-specific owner overrides
    domains: ['ethereum', 'polygon']     // Chains involved in the deployment
  };

  // Configuration for token deployment across chains
  // This defines the token properties and deployment settings for each chain
  const WARP_CONFIG: WarpRouteDeployConfig = {
    ethereum: {
      type: TokenType.native,           // Native token type (newly minted on this chain)
      name: 'My Token',
      symbol: 'MT',
      decimals: 18,
      totalSupply: ethers.utils.parseEther('1000000').toString(), // 1M tokens
      owner: ethers.constants.AddressZero,
      mailbox: ethers.constants.AddressZero,  // Will be set after core deployment
      interchainSecurityModule: {
        type: IsmType.TEST_ISM,        // Security module for cross-chain messages
      },
      hook: {
        type: HookType.MERKLE_TREE,    // Hook for message verification
      }
    },
    polygon: {
      type: TokenType.native,
      name: 'My Token',
      symbol: 'MT',
      decimals: 18,
      totalSupply: ethers.utils.parseEther('1000000').toString(),
      owner: ethers.constants.AddressZero,
      mailbox: ethers.constants.AddressZero,
      interchainSecurityModule: {
        type: IsmType.TEST_ISM,
      },
      hook: {
        type: HookType.MERKLE_TREE,
      }
    }
  };

  // API keys for contract verification on block explorers
  const apiKeys: ChainMap<string> = {
    ethereum: process.env.ETHERSCAN_API_KEY || '',
    polygon: process.env.POLYGONSCAN_API_KEY || '',
  };

  // Set up the wallet and provider
  const PRIVATE_KEY = process.env.PRIVATE_KEY!;
  const multiProvider = new MultiProvider(chainMetadata);

  // Add signer to MultiProvider for each chain
  const wallet = new ethers.Wallet(PRIVATE_KEY);
  multiProvider.setSigner('ethereum', wallet);
  multiProvider.setSigner('polygon', wallet);

  // Initial addresses map for contract deployment
  const baseAddressesMap: HyperlaneAddressesMap<any> = {
    ethereum: {
      mailbox: ethers.constants.AddressZero,
      validatorAnnounce: ethers.constants.AddressZero,
      merkleRootMultisigIsm: ethers.constants.AddressZero,
    },
    polygon: {
      mailbox: ethers.constants.AddressZero,
      validatorAnnounce: ethers.constants.AddressZero,
      merkleRootMultisigIsm: ethers.constants.AddressZero,
    }
  };

  /**
   * Deploys the token bridge infrastructure and tokens
   * Process:
   * 1. Sets up the ISM factory
   * 2. Deploys core Hyperlane contracts
   * 3. Deploys the token contracts on each chain
   */
  async function deployTokenRoute() {
    try {
      // Create ISM factory for managing security modules
      const ismFactory = HyperlaneIsmFactory.fromAddressesMap(
        baseAddressesMap,
        multiProvider
      );

      // Set up contract verifier for block explorer verification
      const contractVerifier = new ContractVerifier(
        multiProvider,
        apiKeys,
        {
          input: {
            language: 'Solidity',
            sources: {},
            settings: {
              optimizer: {
                enabled: true,
                runs: 200
              },
              outputSelection: {
                '*': {
                  '*': ['*']
                }
              }
            }
          },
          solcLongVersion: '0.8.19+commit.7dd6d404'
        } as BuildArtifact,
        ExplorerLicenseType.MIT
      );

      // Deploy core Hyperlane contracts
      const coreDeployer = new HyperlaneCoreDeployer(
        multiProvider,
        ismFactory,
        contractVerifier,
        true,  // Enable concurrent deployment
        300000 // Gas limit
      );

      const coreContracts = await coreDeployer.deployContracts('ethereum', coreConfig);

      // Update mailbox addresses in token config after core deployment
      WARP_CONFIG.ethereum.mailbox = coreContracts.mailbox.address;
      WARP_CONFIG.polygon.mailbox = coreContracts.mailbox.address;

      // Deploy token contracts
      const tokenDeployer = new HypERC20Deployer(
        multiProvider,
        ismFactory,
        contractVerifier,
        true // Enable concurrent deployment
      );

      const tokenContracts = await tokenDeployer.deploy(WARP_CONFIG);

      console.log('Deployed contracts:', {
        core: coreContracts,
        token: tokenContracts
      });

      return {
        core: coreContracts,
        token: tokenContracts
      };
    } catch (error) {
      console.error('Deployment failed:', error);
      throw error;
    }
  }

  /**
   * Transfers tokens between chains
   * Process:
   * 1. Checks balance and allowance
   * 2. Approves token spending if needed
   * 3. Gets gas quote for cross-chain transfer
   * 4. Executes the transfer
   */
  async function transferTokens(
    sourceChain: string,
    destinationChain: string,
    recipient: string,
    amount: ethers.BigNumber,
    contracts: any
  ) {
    try {
      // Get the token contract on the source chain
      const sourceToken = contracts[sourceChain].router;

      // Check if sender has enough tokens
      const signer = await multiProvider.getSignerAddress(sourceChain);
      const balance = await sourceToken.balanceOf(signer);

      if (balance.lt(amount)) {
        throw new Error('Insufficient balance for transfer');
      }

      // Check and approve token spending if needed
      const allowance = await sourceToken.allowance(
        signer,
        sourceToken.address
      );

      if (allowance.lt(amount)) {
        const approveTx = await sourceToken.approve(sourceToken.address, amount);
        await approveTx.wait();
        console.log('Token approval confirmed');
      }

      // Get gas quote for the transfer
      const gasQuote = await sourceToken.quoteGasPayment(destinationChain);

      // Execute the cross-chain transfer
      const tx = await sourceToken.transferRemote(
        destinationChain,
        ethers.utils.hexlify(recipient),
        amount,
        { value: gasQuote }
      );

      const receipt = await tx.wait();
      console.log(`Transfer complete - Transaction hash: ${receipt.transactionHash}`);

      return receipt;
    } catch (error) {
      console.error('Transfer failed:', error);
      throw error;
    }
  }

  /**
   * Validates the configuration
   * Checks:
   * 1. Private key is present
   * 2. Block explorer API keys are available
   */
  function validateConfig() {
    if (!PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY environment variable not set');
    }

    if (!apiKeys.ethereum || !apiKeys.polygon) {
      console.warn('Warning: Missing explorer API keys. Contract verification will be skipped.');
    }
  }

  export {
    deployTokenRoute,
    transferTokens,
    validateConfig,
    WARP_CONFIG,
    chainMetadata,
    coreConfig
  };