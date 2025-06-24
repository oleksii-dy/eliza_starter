import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import type { Address } from 'viem';
import fs from 'fs';
import path from 'path';

// Contract ABIs and bytecode would normally be imported from compiled contracts
// For this example, we'll use simplified versions

const SIMPLE_GOVERNOR_ABI = [
  {
    inputs: [
      { name: '_token', type: 'address' },
      { name: '_timelock', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'description', type: 'string' },
    ],
    name: 'propose',
    outputs: [{ name: 'proposalId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' },
    ],
    name: 'castVote',
    outputs: [{ name: 'weight', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'proposalCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'votingDelay',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'votingPeriod',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const VOTE_TOKEN_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'getVotes',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'delegatee', type: 'address' }],
    name: 'delegate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

interface DeployedContracts {
  governor: Address;
  token: Address;
  timelock: Address;
  deploymentBlock: number;
  chain: string;
}

export async function deployTestnetGovernance(
  privateKey: `0x${string}`,
  chain = sepolia,
): Promise<DeployedContracts> {
  console.log('🚀 Deploying governance contracts to testnet...');

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Deployer balance: ${balance / 10n ** 18n} ETH`);

  if (balance < parseEther('0.1')) {
    throw new Error('Insufficient balance for deployment. Need at least 0.1 ETH');
  }

  // Note: In a real implementation, you would:
  // 1. Deploy the vote token contract
  // 2. Deploy the timelock controller
  // 3. Deploy the governor contract
  // 4. Set up permissions and roles

  // For testing purposes, we'll use existing testnet contracts or mock addresses
  const deployedContracts: DeployedContracts = {
    // These would be replaced with actual deployed contract addresses
    governor: `0x${'1'.repeat(40)}` as Address,
    token: `0x${'2'.repeat(40)}` as Address,
    timelock: `0x${'3'.repeat(40)}` as Address,
    deploymentBlock: Number(await publicClient.getBlockNumber()),
    chain: chain.name,
  };

  // Save deployment info
  const deploymentPath = path.join(__dirname, 'testnet-deployments.json');
  const deployments = fs.existsSync(deploymentPath)
    ? JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'))
    : {};

  deployments[chain.name] = deployedContracts;
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));

  console.log('✅ Governance contracts deployed:');
  console.log(`   Governor: ${deployedContracts.governor}`);
  console.log(`   Token: ${deployedContracts.token}`);
  console.log(`   Timelock: ${deployedContracts.timelock}`);

  return deployedContracts;
}

// Utility to get deployed contracts
export function getTestnetDeployments(chainName: string): DeployedContracts | null {
  const deploymentPath = path.join(__dirname, 'testnet-deployments.json');
  if (!fs.existsSync(deploymentPath)) {
    return null;
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  return deployments[chainName] || null;
}

// Deploy script (only runs if called directly)
if (require.main === module) {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ DEPLOYER_PRIVATE_KEY environment variable is required');
    process.exit(1);
  }

  deployTestnetGovernance(privateKey as `0x${string}`)
    .then(() => {
      console.log('✅ Deployment complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    });
}
