import type { E2BTemplate } from '../types/contracts.ts';

/**
 * E2B templates for contract and dApp development environments
 */

export const evmContractDevTemplate: E2BTemplate = {
  name: 'evm-contract-dev',
  description: 'Complete EVM smart contract development environment',
  blockchain: 'evm',
  type: 'contract-dev',
  baseImage: 'node:18-alpine',
  packages: ['nodejs', 'npm', 'git', 'python3', 'pip', 'curl', 'wget', 'build-essential'],
  env: {
    NODE_VERSION: '18',
    SOLC_VERSION: '0.8.19',
    HARDHAT_VERSION: 'latest',
    FOUNDRY_VERSION: 'latest',
  },
  startupScript: `
#!/bin/bash
set -e

echo "Setting up EVM contract development environment..."

# Install Solidity compiler
npm install -g solc@\${SOLC_VERSION}

# Install Hardhat
npm install -g hardhat

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup

# Install web3 and development dependencies
npm install -g web3 ethers @openzeppelin/contracts

# Install Python dependencies for deployment scripts
pip3 install web3 python-dotenv

# Create workspace directory
mkdir -p /workspace
cd /workspace

echo "EVM development environment ready!"
`,
  ports: [3000, 8545, 8546],
};

export const solanaContractDevTemplate: E2BTemplate = {
  name: 'solana-contract-dev',
  description: 'Complete Solana program development environment with Anchor',
  blockchain: 'solana',
  type: 'contract-dev',
  baseImage: 'rust:1.70-slim',
  packages: [
    'curl',
    'wget',
    'git',
    'build-essential',
    'pkg-config',
    'libudev-dev',
    'nodejs',
    'npm',
    'python3',
    'pip',
  ],
  env: {
    RUST_VERSION: '1.70.0',
    SOLANA_VERSION: '1.16.0',
    ANCHOR_VERSION: '0.29.0',
    NODE_VERSION: '18',
  },
  startupScript: `
#!/bin/bash
set -e

echo "Setting up Solana program development environment..."

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v\${SOLANA_VERSION}/install)"
export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install \${ANCHOR_VERSION}
avm use \${ANCHOR_VERSION}

# Install additional Rust components
rustup component add rustfmt clippy

# Set Solana config
solana config set --url devnet

# Generate a new keypair for development
solana-keygen new --no-bip39-passphrase --silent --outfile ~/.config/solana/id.json

# Install Node.js dependencies for testing
npm install -g typescript ts-node

# Create workspace directory
mkdir -p /workspace
cd /workspace

echo "Solana development environment ready!"
echo "Wallet address: $(solana address)"
`,
  ports: [3000, 8899, 8900],
};

export const evmCompilerTemplate: E2BTemplate = {
  name: 'evm-compiler',
  description: 'Lightweight EVM contract compilation environment',
  blockchain: 'evm',
  type: 'contract-dev',
  baseImage: 'node:18-alpine',
  packages: ['nodejs', 'npm', 'python3', 'pip'],
  env: {
    SOLC_VERSION: '0.8.19',
  },
  startupScript: `
#!/bin/bash
set -e

echo "Setting up EVM compiler environment..."

# Install Solidity compiler
npm install -g solc@\${SOLC_VERSION}

# Install web3 for deployment
pip3 install web3

echo "EVM compiler environment ready!"
`,
  ports: [],
};

export const solanaCompilerTemplate: E2BTemplate = {
  name: 'solana-compiler',
  description: 'Lightweight Solana program compilation environment',
  blockchain: 'solana',
  type: 'contract-dev',
  baseImage: 'rust:1.70-slim',
  packages: ['curl', 'build-essential', 'pkg-config', 'libudev-dev'],
  env: {
    SOLANA_VERSION: '1.16.0',
    ANCHOR_VERSION: '0.29.0',
  },
  startupScript: `
#!/bin/bash
set -e

echo "Setting up Solana compiler environment..."

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v\${SOLANA_VERSION}/install)"
export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install \${ANCHOR_VERSION}
avm use \${ANCHOR_VERSION}

echo "Solana compiler environment ready!"
`,
  ports: [],
};

export const evmDeployerTemplate: E2BTemplate = {
  name: 'evm-deployer',
  description: 'EVM contract deployment environment',
  blockchain: 'evm',
  type: 'contract-dev',
  baseImage: 'node:18-alpine',
  packages: ['nodejs', 'npm', 'python3', 'pip'],
  env: {
    SOLC_VERSION: '0.8.19',
  },
  startupScript: `
#!/bin/bash
set -e

echo "Setting up EVM deployer environment..."

# Install web3 for deployment
pip3 install web3 python-dotenv

echo "EVM deployer environment ready!"
`,
  ports: [],
};

export const solanaDeployerTemplate: E2BTemplate = {
  name: 'solana-deployer',
  description: 'Solana program deployment environment',
  blockchain: 'solana',
  type: 'contract-dev',
  baseImage: 'rust:1.70-slim',
  packages: ['curl', 'build-essential'],
  env: {
    SOLANA_VERSION: '1.16.0',
    ANCHOR_VERSION: '0.29.0',
  },
  startupScript: `
#!/bin/bash
set -e

echo "Setting up Solana deployer environment..."

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v\${SOLANA_VERSION}/install)"
export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install \${ANCHOR_VERSION}
avm use \${ANCHOR_VERSION}

# Set default config
solana config set --url devnet

echo "Solana deployer environment ready!"
`,
  ports: [],
};

export const reactFrontendTemplate: E2BTemplate = {
  name: 'react-frontend',
  description: 'React frontend development environment for dApps',
  blockchain: 'evm',
  type: 'frontend-dev',
  baseImage: 'node:18-alpine',
  packages: ['nodejs', 'npm', 'git'],
  env: {
    NODE_VERSION: '18',
    VITE_VERSION: 'latest',
  },
  startupScript: `
#!/bin/bash
set -e

echo "Setting up React frontend environment..."

# Install global packages
npm install -g vite @vitejs/plugin-react

# Install common dApp dependencies
npm install -g wagmi viem @rainbow-me/rainbowkit

echo "React frontend environment ready!"
`,
  ports: [3000, 5173],
};

export const expressFrontendTemplate: E2BTemplate = {
  name: 'express-backend',
  description: 'Express.js backend development environment',
  blockchain: 'evm',
  type: 'full-stack',
  baseImage: 'node:18-alpine',
  packages: ['nodejs', 'npm', 'git'],
  env: {
    NODE_VERSION: '18',
  },
  startupScript: `
#!/bin/bash
set -e

echo "Setting up Express backend environment..."

# Install global packages
npm install -g typescript ts-node nodemon

echo "Express backend environment ready!"
`,
  ports: [3001, 8080],
};

export const fullStackTemplate: E2BTemplate = {
  name: 'fullstack-dapp',
  description: 'Complete full-stack dApp development environment',
  blockchain: 'evm',
  type: 'full-stack',
  baseImage: 'node:18',
  packages: ['nodejs', 'npm', 'git', 'python3', 'pip', 'postgresql-client', 'redis-tools'],
  env: {
    NODE_VERSION: '18',
    POSTGRES_VERSION: '15',
    REDIS_VERSION: '7',
  },
  startupScript: `
#!/bin/bash
set -e

echo "Setting up full-stack dApp environment..."

# Install Solidity compiler
npm install -g solc@0.8.19

# Install frontend tools
npm install -g vite @vitejs/plugin-react

# Install backend tools
npm install -g typescript ts-node nodemon

# Install web3 tools
npm install -g hardhat

# Install deployment tools
pip3 install web3 python-dotenv

# Create workspace structure
mkdir -p /workspace/{contracts,frontend,backend}

echo "Full-stack dApp environment ready!"
`,
  ports: [3000, 3001, 5173, 8545],
};

/**
 * Template registry for easy access
 */
export const templateRegistry: Record<string, E2BTemplate> = {
  'evm-contract-dev': evmContractDevTemplate,
  'solana-contract-dev': solanaContractDevTemplate,
  'evm-compiler': evmCompilerTemplate,
  'solana-compiler': solanaCompilerTemplate,
  'evm-deployer': evmDeployerTemplate,
  'solana-deployer': solanaDeployerTemplate,
  'react-frontend': reactFrontendTemplate,
  'express-backend': expressFrontendTemplate,
  'fullstack-dapp': fullStackTemplate,
};

/**
 * Get template by name
 */
export function getTemplate(name: string): E2BTemplate | null {
  return templateRegistry[name] || null;
}

/**
 * Get templates by type
 */
export function getTemplatesByType(type: E2BTemplate['type']): E2BTemplate[] {
  return Object.values(templateRegistry).filter((template) => template.type === type);
}

/**
 * Get templates by blockchain
 */
export function getTemplatesByBlockchain(blockchain: string): E2BTemplate[] {
  return Object.values(templateRegistry).filter(
    (template) =>
      template.blockchain === blockchain ||
      (template.blockchain === 'evm' &&
        ['ethereum', 'base', 'arbitrum', 'polygon'].includes(blockchain))
  );
}
