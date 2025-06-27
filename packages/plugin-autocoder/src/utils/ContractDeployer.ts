import {
  type IAgentRuntime,
  elizaLogger,
} from '@elizaos/core';
// Local type definition for ImprovedE2BService
interface ImprovedE2BService {
  createSandbox(options: any): Promise<string>;
  runCommandInSandbox(sandboxId: string, command: string): Promise<any>;
  writeFileToSandbox(sandboxId: string, path: string, content: string): Promise<void>;
  readFileFromSandbox(sandboxId: string, path: string): Promise<string>;
  closeSandbox(sandboxId: string): Promise<void>;
}
import type { GeneratedContract, DeploymentConfig, DeploymentInfo } from '../types/contracts.ts';

/**
 * Contract Deployer for EVM and SVM contracts
 */
export class ContractDeployer {
  private e2bService: ImprovedE2BService | null = null;
  private runtime: IAgentRuntime;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async initialize(): Promise<void> {
    this.e2bService = this.runtime.getService('e2b') as ImprovedE2BService;
    if (!this.e2bService) {
      elizaLogger.warn('E2B service not found - deployment will use fallback methods');
    }
  }

  async stop(): Promise<void> {
    // Cleanup resources if needed
  }

  /**
   * Deploy a compiled smart contract
   */
  async deploy(
    contract: GeneratedContract,
    config?: DeploymentConfig
  ): Promise<DeploymentInfo> {
    try {
      elizaLogger.info('Deploying contract', { 
        contractId: contract.id,
        blockchain: contract.blockchain,
        network: config?.network 
      });

      if (!contract.bytecode && !contract.abi) {
        throw new Error('Contract must be compiled before deployment');
      }

      if (contract.blockchain === 'solana') {
        return await this.deploySolanaContract(contract, config);
      } else {
        return await this.deployEVMContract(contract, config);
      }
    } catch (error) {
      elizaLogger.error('Contract deployment failed', error);
      throw error;
    }
  }

  private async deployEVMContract(
    contract: GeneratedContract,
    config?: DeploymentConfig
  ): Promise<DeploymentInfo> {
    if (!this.e2bService) {
      throw new Error('E2B service required for contract deployment');
    }

    // Create deployment sandbox
    const sandboxId = await this.e2bService.createSandbox({
      template: 'evm-deployer',
      timeoutMs: 300000, // 5 minutes
      envs: {
        CONTRACT_NAME: contract.name,
        NETWORK: config?.network || 'base-sepolia',
        PRIVATE_KEY: config?.privateKey || this.runtime.getSetting('EVM_PRIVATE_KEY'),
        RPC_URL: config?.rpcUrl || this.getDefaultRpcUrl(config?.network || 'base-sepolia'),
      },
      metadata: {
        purpose: 'contract-deployment',
        blockchain: 'evm',
        network: config?.network || 'base-sepolia',
      },
    });

    try {
      // Write contract artifacts to sandbox
      await this.e2bService.writeFileToSandbox(
        sandboxId,
        'contract.json',
        JSON.stringify({
          name: contract.name,
          abi: contract.abi,
          bytecode: contract.bytecode,
          constructorArgs: config?.constructorArgs || [],
        }, null, 2)
      );

      // Create deployment script
      const deploymentScript = `
import json
import os
from web3 import Web3
import time

def deploy_contract():
    try:
        # Load contract data
        with open('contract.json', 'r') as f:
            contract_data = json.load(f)
        
        # Connect to network
        rpc_url = os.getenv('RPC_URL')
        private_key = os.getenv('PRIVATE_KEY')
        
        if not rpc_url or not private_key:
            return {'success': False, 'error': 'Missing RPC_URL or PRIVATE_KEY'}
        
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not w3.is_connected():
            return {'success': False, 'error': 'Failed to connect to network'}
        
        # Set up account
        account = w3.eth.account.from_key(private_key)
        w3.eth.default_account = account.address
        
        # Get current gas price
        gas_price = w3.eth.gas_price
        
        # Create contract instance
        contract = w3.eth.contract(
            abi=contract_data['abi'],
            bytecode=contract_data['bytecode']
        )
        
        # Build constructor transaction
        constructor_args = contract_data.get('constructorArgs', [])
        
        # Estimate gas
        try:
            gas_estimate = contract.constructor(*constructor_args).estimate_gas({
                'from': account.address
            })
        except Exception as e:
            gas_estimate = 3000000  # Fallback gas limit
        
        # Build transaction
        transaction = contract.constructor(*constructor_args).build_transaction({
            'from': account.address,
            'gas': gas_estimate,
            'gasPrice': gas_price,
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        # Sign and send transaction
        signed_txn = account.sign_transaction(transaction)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for transaction receipt
        print(f"Waiting for transaction {tx_hash.hex()} to be mined...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
        
        if tx_receipt.status != 1:
            return {'success': False, 'error': 'Transaction failed'}
        
        contract_address = tx_receipt.contractAddress
        
        result = {
            'success': True,
            'address': contract_address,
            'transactionHash': tx_hash.hex(),
            'blockNumber': tx_receipt.blockNumber,
            'gasUsed': tx_receipt.gasUsed,
            'network': os.getenv('NETWORK'),
            'deployer': account.address,
        }
        
        print("SUCCESS:", json.dumps(result))
        return result
        
    except Exception as e:
        print(f"Deployment error: {str(e)}")
        return {'success': False, 'error': str(e)}

# Install web3 if not available
import subprocess
try:
    import web3
except ImportError:
    subprocess.run(['pip', 'install', 'web3'], check=True)
    import web3

deploy_contract()
`;

      // Execute deployment
      const result = await this.e2bService.executeCode(deploymentScript, 'python');
      const deploymentResult = this.parseDeploymentOutput(result.text || '');

      if (!deploymentResult.success) {
        throw new Error(`Deployment failed: ${deploymentResult.error}`);
      }

      elizaLogger.info('EVM contract deployed successfully', { 
        contractId: contract.id,
        address: deploymentResult.address,
        network: deploymentResult.network,
        txHash: deploymentResult.transactionHash 
      });

      return {
        address: deploymentResult.address,
        transactionHash: deploymentResult.transactionHash,
        blockNumber: deploymentResult.blockNumber,
        network: deploymentResult.network,
        deployer: deploymentResult.deployer,
        gasUsed: deploymentResult.gasUsed,
        deployedAt: new Date(),
        verificationStatus: 'pending',
      };

    } finally {
      await this.e2bService.killSandbox(sandboxId);
    }
  }

  private async deploySolanaContract(
    contract: GeneratedContract,
    config?: DeploymentConfig
  ): Promise<DeploymentInfo> {
    if (!this.e2bService) {
      throw new Error('E2B service required for contract deployment');
    }

    // Create Solana deployment sandbox
    const sandboxId = await this.e2bService.createSandbox({
      template: 'solana-deployer',
      timeoutMs: 600000, // 10 minutes
      envs: {
        PROGRAM_NAME: contract.name,
        NETWORK: config?.network || 'devnet',
        KEYPAIR_PATH: config?.keypairPath || '~/.config/solana/id.json',
      },
      metadata: {
        purpose: 'solana-deployment',
        blockchain: 'solana',
        network: config?.network || 'devnet',
      },
    });

    try {
      // Set up deployment environment
      await this.setupSolanaDeployment(sandboxId, contract, config);

      // Deploy with Anchor
      const deploymentScript = `
import subprocess
import json
import os
import re
import time

def deploy_solana_program():
    try:
        # Set Solana config
        network = os.getenv('NETWORK', 'devnet')
        program_name = os.getenv('PROGRAM_NAME', 'program')
        
        # Set cluster
        cluster_result = subprocess.run(['solana', 'config', 'set', '--url', network], 
                                       capture_output=True, text=True)
        if cluster_result.returncode != 0:
            return {'success': False, 'error': f'Failed to set cluster: {cluster_result.stderr}'}
        
        print(f"Set cluster to: {network}")
        
        # Check balance
        balance_result = subprocess.run(['solana', 'balance'], capture_output=True, text=True)
        if balance_result.returncode == 0:
            print(f"Deployer balance: {balance_result.stdout.strip()}")
        
        # Ensure we have anchor project
        if not os.path.exists('Anchor.toml'):
            return {'success': False, 'error': 'Anchor.toml not found - not an Anchor project'}
        
        # Build first to ensure compilation
        print("Building Anchor project...")
        build_result = subprocess.run(['anchor', 'build'], capture_output=True, text=True)
        if build_result.returncode != 0:
            return {'success': False, 'error': f'Build failed: {build_result.stderr}'}
        
        print("Build successful, deploying...")
        
        # Deploy the program with retries
        max_retries = 3
        for attempt in range(max_retries):
            try:
                deploy_result = subprocess.run([
                    'anchor', 'deploy', 
                    '--provider.cluster', network,
                    '--program-name', program_name
                ], capture_output=True, text=True, timeout=300)  # 5 minute timeout
                
                if deploy_result.returncode == 0:
                    break
                    
                if attempt < max_retries - 1:
                    print(f"Deploy attempt {attempt + 1} failed, retrying...")
                    time.sleep(5)
                else:
                    return {'success': False, 'error': deploy_result.stderr}
                    
            except subprocess.TimeoutExpired:
                if attempt < max_retries - 1:
                    print(f"Deploy attempt {attempt + 1} timed out, retrying...")
                    time.sleep(5)
                else:
                    return {'success': False, 'error': 'Deployment timed out after multiple attempts'}
        
        # Parse program ID from output - more robust parsing
        output_lines = deploy_result.stdout.split('\\n')
        program_id = None
        
        # Try multiple patterns for program ID
        for line in output_lines:
            # Standard anchor deploy output
            if 'Program Id:' in line:
                program_id = line.split('Program Id:')[1].strip()
                break
            # Alternative patterns
            elif 'program' in line.lower() and 'id' in line.lower():
                # Extract base58 address pattern (solana addresses are 32-44 chars)
                match = re.search(r'([A-Za-z0-9]{32,44})', line)
                if match:
                    program_id = match.group(1)
                    break
        
        if not program_id:
            # Try to get program ID from target directory
            try:
                import glob
                keypair_files = glob.glob('target/deploy/*.json')
                if keypair_files:
                    # Use the first keypair file name as program name
                    keypair_file = keypair_files[0]
                    program_name_from_file = os.path.basename(keypair_file).replace('.json', '')
                    
                    # Get program ID from keypair
                    show_result = subprocess.run([
                        'solana', 'address', '-k', keypair_file
                    ], capture_output=True, text=True)
                    
                    if show_result.returncode == 0:
                        program_id = show_result.stdout.strip()
            except Exception as e:
                print(f"Failed to extract program ID from keypair: {e}")
        
        if not program_id:
            return {'success': False, 'error': 'Could not determine program ID from deployment output'}
        
        # Get deployment transaction signature
        tx_signature = None
        for line in output_lines:
            if 'Signature:' in line:
                tx_signature = line.split('Signature:')[1].strip()
                break
            elif 'signature' in line.lower():
                # Extract transaction signature pattern
                match = re.search(r'([A-Za-z0-9]{64,88})', line)
                if match:
                    tx_signature = match.group(1)
                    break
        
        # Verify deployment by checking program account
        verify_result = subprocess.run([
            'solana', 'account', program_id
        ], capture_output=True, text=True)
        
        deployment_verified = verify_result.returncode == 0
        
        result = {
            'success': True,
            'programId': program_id,
            'signature': tx_signature,
            'network': network,
            'verified': deployment_verified,
            'deployOutput': deploy_result.stdout,
            'buildOutput': build_result.stdout,
        }
        
        print("SUCCESS:", json.dumps(result))
        return result
        
    except Exception as e:
        print(f"Deployment error: {str(e)}")
        return {'success': False, 'error': str(e)}

deploy_solana_program()
`;

      const result = await this.e2bService.executeCode(deploymentScript, 'python');
      const deploymentResult = this.parseDeploymentOutput(result.text || '');

      if (!deploymentResult.success) {
        throw new Error(`Solana deployment failed: ${deploymentResult.error}`);
      }

      elizaLogger.info('Solana program deployed successfully', { 
        contractId: contract.id,
        programId: deploymentResult.programId,
        network: deploymentResult.network,
        signature: deploymentResult.signature 
      });

      return {
        address: deploymentResult.programId,
        transactionHash: deploymentResult.signature,
        network: deploymentResult.network,
        deployedAt: new Date(),
        verificationStatus: 'verified', // Solana programs are automatically verified
        metadata: {
          programId: deploymentResult.programId,
          deployOutput: deploymentResult.deployOutput,
        },
      };

    } finally {
      await this.e2bService.killSandbox(sandboxId);
    }
  }

  private async setupSolanaDeployment(
    sandboxId: string,
    contract: GeneratedContract,
    config?: DeploymentConfig
  ): Promise<void> {
    if (!this.e2bService) return;

    // Write IDL if available
    if (contract.abi) {
      await this.e2bService.writeFileToSandbox(
        sandboxId,
        `target/idl/${contract.name}.json`,
        JSON.stringify(contract.abi, null, 2)
      );
    }

    // Create Anchor.toml for deployment
    // Note: Program ID will be generated during deployment, not hardcoded
    const anchorToml = `
[features]
seeds = false
skip-lint = false

[programs.${config?.network || 'devnet'}]
# Program ID will be generated during 'anchor deploy'

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "${config?.network || 'devnet'}"
wallet = "${config?.keypairPath || '~/.config/solana/id.json'}"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
`;

    await this.e2bService.writeFileToSandbox(sandboxId, 'Anchor.toml', anchorToml);
  }

  private getDefaultRpcUrl(network: string): string {
    const rpcUrls: Record<string, string> = {
      'mainnet': 'https://eth.llamarpc.com',
      'base': 'https://base.llamarpc.com',
      'base-sepolia': 'https://sepolia.base.org',
      'sepolia': 'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
      'arbitrum': 'https://arb1.arbitrum.io/rpc',
      'polygon': 'https://polygon.llamarpc.com',
    };

    return rpcUrls[network] || rpcUrls['base-sepolia'];
  }

  private parseDeploymentOutput(output: string): any {
    try {
      // Look for SUCCESS: prefix in output
      const lines = output.split('\n');
      const successLine = lines.find(line => line.startsWith('SUCCESS:'));
      
      if (successLine) {
        const jsonStr = successLine.replace('SUCCESS:', '').trim();
        return JSON.parse(jsonStr);
      }

      // If no SUCCESS found, check for error patterns
      if (output.includes('error') || output.includes('failed')) {
        return {
          success: false,
          error: output,
        };
      }

      // Default fallback
      return {
        success: false,
        error: 'Unknown deployment error',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse deployment output: ${error}`,
      };
    }
  }
}