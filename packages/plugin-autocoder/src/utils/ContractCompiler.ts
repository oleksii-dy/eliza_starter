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
import type { GeneratedContract, CompilationResult } from '../types/contracts.ts';

/**
 * Contract Compiler for EVM and SVM contracts
 */
export class ContractCompiler {
  private e2bService: ImprovedE2BService | null = null;
  private runtime: IAgentRuntime;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async initialize(): Promise<void> {
    this.e2bService = this.runtime.getService('e2b') as ImprovedE2BService;
    if (!this.e2bService) {
      elizaLogger.warn('E2B service not found - compilation will use fallback methods');
    }
  }

  async stop(): Promise<void> {
    // Cleanup resources if needed
  }

  /**
   * Compile a smart contract
   */
  async compile(contract: GeneratedContract): Promise<CompilationResult> {
    try {
      elizaLogger.info('Compiling contract', { 
        contractId: contract.id,
        blockchain: contract.blockchain 
      });

      if (contract.blockchain === 'solana') {
        return await this.compileSolanaContract(contract);
      } else {
        return await this.compileEVMContract(contract);
      }
    } catch (error) {
      elizaLogger.error('Contract compilation failed', error);
      throw error;
    }
  }

  private async compileEVMContract(contract: GeneratedContract): Promise<CompilationResult> {
    if (!this.e2bService) {
      throw new Error('E2B service required for contract compilation');
    }

    // Create compilation sandbox
    const sandboxId = await this.e2bService.createSandbox({
      template: 'evm-compiler',
      timeoutMs: 300000, // 5 minutes
      envs: {
        CONTRACT_NAME: contract.name,
      },
      metadata: {
        purpose: 'contract-compilation',
        blockchain: 'evm',
      },
    });

    try {
      // Write contract source to sandbox
      await this.e2bService.writeFileToSandbox(
        sandboxId,
        `${contract.name}.sol`,
        contract.sourceCode
      );

      // Create compilation script with enhanced real compilation
      const compilationScript = `
import json
import subprocess
import os
import sys
from pathlib import Path

def compile_contract():
    try:
        print("Starting real Solidity compilation...")
        
        # Install latest solc if not available
        try:
            # Check if solc is installed and get version
            version_result = subprocess.run(['solc', '--version'], capture_output=True, text=True)
            if version_result.returncode == 0:
                print(f"Using existing Solidity compiler: {version_result.stdout.split()[1]}")
            else:
                raise Exception("solc not found")
        except:
            print("Installing latest Solidity compiler...")
            subprocess.run(['npm', 'install', '-g', 'solc@latest'], check=True, capture_output=True)
            
        contract_file = "${contract.name}.sol"
        
        # Enhanced compilation with optimization and metadata
        print(f"Compiling {contract_file}...")
        result = subprocess.run([
            'solc', 
            '--combined-json', 'abi,bin,metadata,userdoc,devdoc',
            '--optimize',
            '--optimize-runs', '200',
            '--evm-version', 'cancun',  # Latest EVM version
            '--via-ir',  # Enable intermediate representation for better optimization
            contract_file
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"Compilation failed with exit code {result.returncode}")
            print(f"STDERR: {result.stderr}")
            print(f"STDOUT: {result.stdout}")
            return {'success': False, 'error': result.stderr}
            
        # Parse compilation output
        try:
            output = json.loads(result.stdout)
        except json.JSONDecodeError as e:
            print(f"Failed to parse compiler output as JSON: {e}")
            print(f"Raw output: {result.stdout}")
            return {'success': False, 'error': f"Invalid compiler output: {e}"}
        
        # Extract ABI and bytecode for the main contract
        contracts = output.get('contracts', {})
        if not contracts:
            print("No contracts found in compilation output")
            return {'success': False, 'error': 'No contracts compiled'}
            
        # Try multiple strategies to find the contract
        contract_key = None
        search_patterns = [
            f"{contract_file}:${contract.name}",
            f":${contract.name}",
            "${contract.name}"
        ]
        
        for pattern in search_patterns:
            if pattern in contracts:
                contract_key = pattern
                break
            # Partial match
            for key in contracts.keys():
                if key.endswith(f":${contract.name}") or key == "${contract.name}":
                    contract_key = key
                    break
            if contract_key:
                break
                
        if not contract_key:
            print(f"Contract '${contract.name}' not found in compilation output")
            print(f"Available contracts: {list(contracts.keys())}")
            # Use the first contract if only one exists
            if len(contracts) == 1:
                contract_key = list(contracts.keys())[0]
                print(f"Using only available contract: {contract_key}")
            else:
                return {'success': False, 'error': f'Contract ${contract.name} not found'}
            
        contract_data = contracts[contract_key]
        
        # Validate contract data
        if 'abi' not in contract_data or 'bin' not in contract_data:
            print(f"Invalid contract data - missing ABI or bytecode")
            return {'success': False, 'error': 'Invalid contract compilation output'}
            
        # Parse and validate ABI
        try:
            abi_data = json.loads(contract_data['abi'])
        except json.JSONDecodeError:
            print("Failed to parse ABI")
            return {'success': False, 'error': 'Invalid ABI format'}
            
        # Parse metadata if available
        metadata = {}
        if 'metadata' in contract_data:
            try:
                metadata = json.loads(contract_data['metadata'])
            except json.JSONDecodeError:
                print("Warning: Failed to parse metadata")
        
        result_data = {
            'success': True,
            'abi': abi_data,
            'bytecode': '0x' + contract_data['bin'] if not contract_data['bin'].startswith('0x') else contract_data['bin'],
            'metadata': metadata,
            'compiler_version': metadata.get('compiler', {}).get('version', 'unknown'),
            'optimization_used': True,
            'optimization_runs': 200,
            'evm_version': 'cancun',
        }
        
        # Add documentation if available
        if 'userdoc' in contract_data:
            result_data['userdoc'] = json.loads(contract_data['userdoc'])
        if 'devdoc' in contract_data:
            result_data['devdoc'] = json.loads(contract_data['devdoc'])
        
        print("✅ Compilation successful!")
        print(f"ABI functions: {len([item for item in abi_data if item.get('type') == 'function'])}")
        print(f"Bytecode size: {len(contract_data['bin']) // 2} bytes")
        print("SUCCESS:", json.dumps(result_data))
        return result_data
        
    except subprocess.CalledProcessError as e:
        error_msg = f"Compiler process failed: {e.stderr if e.stderr else e.stdout}"
        print(f"Compilation error: {error_msg}")
        return {'success': False, 'error': error_msg}
    except Exception as e:
        error_msg = f"Unexpected compilation error: {str(e)}"
        print(error_msg)
        return {'success': False, 'error': error_msg}

# Run compilation
compile_contract()
`;

      // Execute compilation
      const result = await this.e2bService.executeCode(compilationScript, 'python');

      // Parse compilation result
      const compilationResult = this.parseCompilationOutput(result.text || '');

      if (!compilationResult.success) {
        throw new Error(`Compilation failed: ${compilationResult.error}`);
      }

      elizaLogger.info('EVM contract compiled successfully', { 
        contractId: contract.id,
        hasAbi: !!compilationResult.abi,
        hasBytecode: !!compilationResult.bytecode 
      });

      return {
        success: true,
        abi: compilationResult.abi,
        bytecode: compilationResult.bytecode,
        artifacts: {
          metadata: compilationResult.metadata,
          compilerVersion: compilationResult.compiler_version,
          optimizationUsed: true,
          optimizationRuns: 200,
        },
      };

    } finally {
      // Clean up sandbox
      await this.e2bService.killSandbox(sandboxId);
    }
  }

  private async compileSolanaContract(contract: GeneratedContract): Promise<CompilationResult> {
    if (!this.e2bService) {
      throw new Error('E2B service required for contract compilation');
    }

    // Create Solana compilation sandbox
    const sandboxId = await this.e2bService.createSandbox({
      template: 'solana-compiler',
      timeoutMs: 600000, // 10 minutes (Rust compilation can be slow)
      envs: {
        PROGRAM_NAME: contract.name,
      },
      metadata: {
        purpose: 'solana-compilation',
        blockchain: 'solana',
      },
    });

    try {
      // Set up Anchor project structure
      await this.setupAnchorProject(sandboxId, contract);

      // Enhanced Anchor compilation with real toolchain
      const compilationScript = `
import subprocess
import json
import os
import sys
from pathlib import Path

def compile_anchor_program():
    try:
        print("Starting real Anchor/Rust compilation...")
        
        # Verify Anchor and Rust toolchain
        try:
            anchor_version = subprocess.run(['anchor', '--version'], capture_output=True, text=True)
            if anchor_version.returncode == 0:
                print(f"Using Anchor: {anchor_version.stdout.strip()}")
            else:
                raise Exception("Anchor not found")
                
            rust_version = subprocess.run(['rustc', '--version'], capture_output=True, text=True)
            if rust_version.returncode == 0:
                print(f"Using Rust: {rust_version.stdout.strip()}")
            else:
                raise Exception("Rust not found")
        except Exception as e:
            print(f"Toolchain verification failed: {e}")
            return {'success': False, 'error': f'Missing required tools: {e}'}
        
        # Initialize Anchor project if needed
        if not os.path.exists('Anchor.toml'):
            print("Initializing new Anchor project...")
            result = subprocess.run(['anchor', 'init', '${contract.name}', '--no-git'], 
                                  capture_output=True, text=True)
            if result.returncode != 0:
                print(f"Failed to initialize Anchor project: {result.stderr}")
                return {'success': False, 'error': f'Anchor init failed: {result.stderr}'}
            os.chdir('${contract.name}')
        
        # Set up program directory structure
        program_dir = f'programs/${contract.name}/src'
        os.makedirs(program_dir, exist_ok=True)
        
        # Write the contract source code
        lib_path = f'{program_dir}/lib.rs'
        print(f"Writing contract source to {lib_path}")
        with open(lib_path, 'w') as f:
            f.write("""${contract.sourceCode.replace('"""', '\\"\\"\\"')}""")
        
        # Update Cargo.toml with proper dependencies
        cargo_toml_content = '''
[package]
name = "${contract.name}"
version = "0.1.0"
description = "Generated Solana program"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "${contract.name.replace('-', '_')}"

[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"
spl-token = "4.0.0"
spl-associated-token-account = "2.3.0"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []
'''
        with open(f'programs/${contract.name}/Cargo.toml', 'w') as f:
            f.write(cargo_toml_content)
        
        print("Starting Anchor build...")
        
        # Build the program with verbose output
        build_env = os.environ.copy()
        build_env['RUST_LOG'] = 'info'
        
        build_result = subprocess.run([
            'anchor', 'build', 
            '--program-name', '${contract.name}'
        ], capture_output=True, text=True, env=build_env, timeout=600)
        
        if build_result.returncode != 0:
            print(f"Build failed with exit code {build_result.returncode}")
            print(f"STDOUT: {build_result.stdout}")
            print(f"STDERR: {build_result.stderr}")
            return {'success': False, 'error': f'Build failed: {build_result.stderr}'}
        
        print("✅ Build completed successfully!")
        print(f"Build output: {build_result.stdout}")
        
        # Read compilation artifacts
        idl_path = f'target/idl/${contract.name}.json'
        program_path = f'target/deploy/${contract.name}.so'
        types_path = f'target/types/${contract.name}.ts'
        
        # Parse IDL (Interface Definition Language)
        idl_data = None
        if os.path.exists(idl_path):
            print(f"Reading IDL from {idl_path}")
            try:
                with open(idl_path, 'r') as f:
                    idl_data = json.load(f)
                print(f"IDL parsed successfully - {len(idl_data.get('instructions', []))} instructions")
            except Exception as e:
                print(f"Failed to parse IDL: {e}")
        else:
            print(f"Warning: IDL file not found at {idl_path}")
        
        # Get program binary info
        program_size = 0
        program_hash = None
        if os.path.exists(program_path):
            program_size = os.path.getsize(program_path)
            print(f"Program binary size: {program_size} bytes")
            
            # Get program hash for verification
            try:
                hash_result = subprocess.run(['sha256sum', program_path], 
                                           capture_output=True, text=True)
                if hash_result.returncode == 0:
                    program_hash = hash_result.stdout.split()[0]
            except:
                pass
        else:
            print(f"Warning: Program binary not found at {program_path}")
        
        # Read TypeScript types if generated
        types_content = None
        if os.path.exists(types_path):
            try:
                with open(types_path, 'r') as f:
                    types_content = f.read()
                print("TypeScript types generated successfully")
            except Exception as e:
                print(f"Failed to read types: {e}")
        
        # Get Rust compiler and Anchor versions for metadata
        rustc_version = subprocess.run(['rustc', '--version'], capture_output=True, text=True)
        anchor_version = subprocess.run(['anchor', '--version'], capture_output=True, text=True)
        
        result_data = {
            'success': True,
            'idl': idl_data,
            'program_size': program_size,
            'program_hash': program_hash,
            'build_output': build_result.stdout,
            'types': types_content,
            'metadata': {
                'compiler': {
                    'name': 'anchor',
                    'version': anchor_version.stdout.strip() if anchor_version.returncode == 0 else 'unknown'
                },
                'rustc_version': rustc_version.stdout.strip() if rustc_version.returncode == 0 else 'unknown',
                'optimization': True,
                'target': 'solana'
            }
        }
        
        print(f"✅ Anchor compilation successful!")
        if idl_data:
            print(f"Instructions: {len(idl_data.get('instructions', []))}")
            print(f"Accounts: {len(idl_data.get('accounts', []))}")
            print(f"Events: {len(idl_data.get('events', []))}")
        print(f"Binary size: {program_size} bytes")
        
        print("SUCCESS:", json.dumps(result_data))
        return result_data
        
    except subprocess.TimeoutExpired:
        error_msg = "Compilation timed out after 10 minutes"
        print(error_msg)
        return {'success': False, 'error': error_msg}
    except Exception as e:
        error_msg = f"Unexpected compilation error: {str(e)}"
        print(error_msg)
        return {'success': False, 'error': error_msg}

compile_anchor_program()
`;

      const result = await this.e2bService.executeCode(compilationScript, 'python');
      const compilationResult = this.parseCompilationOutput(result.text || '');

      if (!compilationResult.success) {
        throw new Error(`Solana compilation failed: ${compilationResult.error}`);
      }

      elizaLogger.info('Solana contract compiled successfully', { 
        contractId: contract.id,
        hasIdl: !!compilationResult.idl,
        programSize: compilationResult.program_size 
      });

      return {
        success: true,
        abi: compilationResult.idl, // IDL serves as ABI for Solana
        bytecode: null, // Solana uses .so files
        artifacts: {
          idl: compilationResult.idl,
          programSize: compilationResult.program_size,
          buildOutput: compilationResult.build_output,
        },
      };

    } finally {
      await this.e2bService.killSandbox(sandboxId);
    }
  }

  private async setupAnchorProject(sandboxId: string, contract: GeneratedContract): Promise<void> {
    if (!this.e2bService) return;

    // Create Anchor.toml - program ID will be generated during deployment
    const anchorToml = `
[features]
seeds = false
skip-lint = false

[programs.localnet]
# Program ID will be generated during 'anchor deploy'

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
`;

    await this.e2bService.writeFileToSandbox(sandboxId, 'Anchor.toml', anchorToml);

    // Create Cargo.toml for the program
    const cargoToml = `
[package]
name = "${contract.name}"
version = "0.1.0"
description = "Generated Solana program"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "${contract.name}"

[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"
`;

    await this.e2bService.writeFileToSandbox(
      sandboxId, 
      `programs/${contract.name}/Cargo.toml`, 
      cargoToml
    );
  }

  private parseCompilationOutput(output: string): any {
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
        error: 'Unknown compilation error',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse compilation output: ${error}`,
      };
    }
  }
}