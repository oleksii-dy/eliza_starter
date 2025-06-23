import { IAgentRuntime, logger, asUUID, UUID } from '@elizaos/core';
import type { Address, Hash, Hex } from 'viem';
import { encodeFunctionData, keccak256, encodePacked, toHex, pad } from 'viem';
import { getChainConfig } from '../core/chains/config';
import { WalletDatabaseService } from '../core/database/service';
import type { 
    SafeTransaction, 
    SafeTransactionData, 
    SafeSignature, 
    MultisigTransactionProposal 
} from './types';

export interface SafeIntegrationConfig {
    runtime: IAgentRuntime;
    chainId: number;
    safeAddress?: Address;
    owners?: Address[];
    threshold?: number;
}

export interface SafeDeploymentParams {
    owners: Address[];
    threshold: number;
    saltNonce?: bigint;
    setupModules?: Address[];
    fallbackHandler?: Address;
}

export interface SafeTransactionParams {
    to: Address;
    value?: bigint;
    data?: Hex;
    operation?: number; // 0 = Call, 1 = DelegateCall
    safeTxGas?: bigint;
    baseGas?: bigint;
    gasPrice?: bigint;
    gasToken?: Address;
    refundReceiver?: Address;
}

// Safe contract addresses by chain
const SAFE_CONTRACTS: Record<number, {
    singleton: Address;
    proxyFactory: Address;
    multiSend: Address;
    fallbackHandler: Address;
    createCall: Address;
}> = {
    1: { // Mainnet
        singleton: '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552',
        proxyFactory: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
        multiSend: '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761',
        fallbackHandler: '0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4',
        createCall: '0x7cbB62EaA69F79e6873cD1ecB2392971036cFAa4',
    },
    137: { // Polygon
        singleton: '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552',
        proxyFactory: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
        multiSend: '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761',
        fallbackHandler: '0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4',
        createCall: '0x7cbB62EaA69F79e6873cD1ecB2392971036cFAa4',
    },
    // Add more chains as needed
};

export class SafeIntegration {
    private runtime: IAgentRuntime;
    private chainId: number;
    private safeAddress?: Address;
    private owners: Address[];
    private threshold: number;
    private dbService: WalletDatabaseService;
    private proposals: Map<string, MultisigTransactionProposal> = new Map();

    constructor(config: SafeIntegrationConfig) {
        this.runtime = config.runtime;
        this.chainId = config.chainId;
        this.safeAddress = config.safeAddress;
        this.owners = config.owners || [];
        this.threshold = config.threshold || 1;
        this.dbService = new WalletDatabaseService(this.runtime);
    }

    /**
     * Calculate Safe deployment address
     */
    async calculateSafeAddress(params: SafeDeploymentParams): Promise<Address> {
        const contracts = this.getSafeContracts();
        
        // Encode the Safe setup call
        const setupData = this.encodeSetupCall(
            params.owners,
            params.threshold,
            params.setupModules,
            params.fallbackHandler || contracts.fallbackHandler
        );

        // Calculate salt
        const salt = this.calculateSalt(setupData, params.saltNonce || 0n);

        // Calculate CREATE2 address
        const initCodeHash = this.calculateInitCodeHash(contracts.singleton);
        
        const deploymentAddress = this.calculateCreate2Address(
            contracts.proxyFactory,
            salt,
            initCodeHash
        );

        return deploymentAddress;
    }

    /**
     * Deploy a new Safe wallet
     */
    async deploySafe(params: SafeDeploymentParams): Promise<{
        address: Address;
        deploymentTx: Hash;
    }> {
        try {
            const contracts = this.getSafeContracts();
            
            // Calculate expected address
            const expectedAddress = await this.calculateSafeAddress(params);

            // Check if already deployed
            const isDeployed = await this.isContractDeployed(expectedAddress);
            if (isDeployed) {
                logger.info(`Safe already deployed at ${expectedAddress}`);
                return {
                    address: expectedAddress,
                    deploymentTx: '0x0' as Hash, // No deployment tx
                };
            }

            // Build deployment transaction
            const deploymentData = this.buildDeploymentData(params);

            // This would need to be signed and sent by an owner
            // In production, this would use a wallet client
            throw new Error('Safe deployment execution not implemented - requires wallet integration');
        } catch (error) {
            logger.error('Error deploying Safe:', error);
            throw new Error(`Failed to deploy Safe: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Create a new transaction proposal
     */
    async proposeTransaction(params: SafeTransactionParams): Promise<MultisigTransactionProposal> {
        if (!this.safeAddress) {
            throw new Error('Safe address not set');
        }

        try {
            // Get current nonce
            const nonce = await this.getSafeNonce();

            // Build transaction data
            const txData: SafeTransactionData = {
                to: params.to,
                value: params.value || 0n,
                data: params.data || '0x',
                operation: params.operation || 0,
                safeTxGas: params.safeTxGas || 0n,
                baseGas: params.baseGas || 0n,
                gasPrice: params.gasPrice || 0n,
                gasToken: params.gasToken || '0x0000000000000000000000000000000000000000',
                refundReceiver: params.refundReceiver || '0x0000000000000000000000000000000000000000',
                nonce,
            };

            // Create proposal
            const proposalId = this.generateProposalId(txData);
            const proposal: MultisigTransactionProposal = {
                id: proposalId,
                safe: this.safeAddress,
                transaction: txData,
                confirmations: []
                rejections: []
                executed: false,
                createdAt: Date.now(),
                threshold: this.threshold,
            };

            // Store proposal
            this.proposals.set(proposalId, proposal);
            
            logger.info(`Transaction proposal created: ${proposalId}`);
            
            return proposal;
        } catch (error) {
            logger.error('Error creating transaction proposal:', error);
            throw new Error(`Failed to create proposal: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Sign a transaction proposal
     */
    async signProposal(
        proposalId: string,
        signerAddress: Address,
        signature: Hex
    ): Promise<void> {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error('Proposal not found');
        }

        if (proposal.executed) {
            throw new Error('Proposal already executed');
        }

        // Verify signer is an owner
        if (!this.owners.includes(signerAddress)) {
            throw new Error('Signer is not an owner');
        }

        // Add confirmation
        if (!proposal.confirmations.includes(signerAddress)) {
            proposal.confirmations.push(signerAddress);
        }

        logger.info(`Proposal ${proposalId} signed by ${signerAddress}`);

        // Check if threshold is met
        if (proposal.confirmations.length >= proposal.threshold) {
            logger.info(`Proposal ${proposalId} has reached threshold`);
        }
    }

    /**
     * Execute a transaction proposal
     */
    async executeProposal(proposalId: string): Promise<Hash> {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error('Proposal not found');
        }

        if (proposal.executed) {
            throw new Error('Proposal already executed');
        }

        if (proposal.confirmations.length < proposal.threshold) {
            throw new Error('Threshold not met');
        }

        try {
            // Build Safe transaction
            const safeTx = this.buildSafeTransaction(proposal.transaction);

            // Get signatures
            const signatures = await this.collectSignatures(proposal);

            // Execute transaction
            // This would need wallet integration to actually send
            throw new Error('Safe execution not implemented - requires wallet integration');
        } catch (error) {
            logger.error('Error executing proposal:', error);
            throw new Error(`Failed to execute proposal: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get Safe transaction hash
     */
    getSafeTransactionHash(txData: SafeTransactionData): Hash {
        const safeTxHash = keccak256(encodePacked(
            ['address', 'uint256', 'bytes32', 'uint8', 'uint256', 'uint256', 'uint256', 'address', 'address', 'uint256'],
            [
                txData.to,
                txData.value,
                keccak256(txData.data),
                txData.operation,
                txData.safeTxGas,
                txData.baseGas,
                txData.gasPrice,
                txData.gasToken,
                txData.refundReceiver,
                txData.nonce
            ]
        ));

        const encoded = encodePacked(
            ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
            [
                '0x19' as Hex,
                '0x01' as Hex,
                this.getDomainSeparator(),
                safeTxHash
            ]
        );

        return keccak256(encoded);
    }

    /**
     * Get list of pending proposals
     */
    getPendingProposals(): MultisigTransactionProposal[] {
        return Array.from(this.proposals.values()).filter(
            p => !p.executed && p.confirmations.length < p.threshold
        );
    }

    /**
     * Get list of ready proposals
     */
    getReadyProposals(): MultisigTransactionProposal[] {
        return Array.from(this.proposals.values()).filter(
            p => !p.executed && p.confirmations.length >= p.threshold
        );
    }

    /**
     * Private helper methods
     */
    private getSafeContracts() {
        const contracts = SAFE_CONTRACTS[this.chainId];
        if (!contracts) {
            throw new Error(`Safe contracts not available for chain ${this.chainId}`);
        }
        return contracts;
    }

    private encodeSetupCall(
        owners: Address[]
        threshold: number,
        modules?: Address[]
        fallbackHandler?: Address
    ): Hex {
        return encodeFunctionData({
            abi: [{
                inputs: [
                    { name: '_owners', type: 'address[]' },
                    { name: '_threshold', type: 'uint256' },
                    { name: 'to', type: 'address' },
                    { name: 'data', type: 'bytes' },
                    { name: 'fallbackHandler', type: 'address' },
                    { name: 'paymentToken', type: 'address' },
                    { name: 'payment', type: 'uint256' },
                    { name: 'paymentReceiver', type: 'address' }
                ],
                name: 'setup',
                outputs: []
                stateMutability: 'nonpayable',
                type: 'function'
            }],
            functionName: 'setup',
            args: [
                owners,
                BigInt(threshold),
                '0x0000000000000000000000000000000000000000',
                '0x',
                fallbackHandler || '0x0000000000000000000000000000000000000000',
                '0x0000000000000000000000000000000000000000',
                0n,
                '0x0000000000000000000000000000000000000000'
            ]
        });
    }

    private calculateSalt(setupData: Hex, saltNonce: bigint): Hex {
        return keccak256(encodePacked(
            ['bytes32', 'uint256'],
            [keccak256(setupData), saltNonce]
        ));
    }

    private calculateInitCodeHash(singleton: Address): Hex {
        // This is a simplified version - actual implementation would need the proxy bytecode
        const proxyBytecode = '0x608060405234801561001057600080fd5b5060405161012e38038061012e8339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101426022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050603f8061010f6000396000f3fe6080604052600a600c565b005b6012601e565b601c6020565b565b005b3660008037600080366000845af43d6000803e8060008114603f573d6000f35b3d6000fdfea264697066735822122003d1488ee65e08fa41e58e';
        return keccak256(`0x${proxyBytecode}${singleton.slice(2)}` as `0x${string}`);
    }

    private calculateCreate2Address(
        factory: Address,
        salt: Hex,
        initCodeHash: Hex
    ): Address {
        const encoded = encodePacked(
            ['bytes1', 'address', 'bytes32', 'bytes32'],
            ['0xff', factory, salt, initCodeHash]
        );
        
        const hash = keccak256(encoded);
        return ('0x' + hash.slice(26)) as Address;
    }

    private async isContractDeployed(address: Address): Promise<boolean> {
        // This would need chain provider integration
        // For now, return false
        return false;
    }

    private async getSafeNonce(): Promise<bigint> {
        // This would query the Safe contract for current nonce
        // For now, return 0
        return 0n;
    }

    private generateProposalId(txData: SafeTransactionData): string {
        const hash = keccak256(encodePacked(
            ['address', 'uint256', 'bytes32', 'uint256'],
            [txData.to, txData.value, keccak256(txData.data), txData.nonce]
        ));
        return hash;
    }

    private buildSafeTransaction(txData: SafeTransactionData): SafeTransaction {
        return {
            ...txData,
            signatures: new Map()
        };
    }

    private async collectSignatures(proposal: MultisigTransactionProposal): Promise<Hex> {
        // This would collect and encode signatures from confirmations
        // For now, return empty signatures
        return '0x';
    }

    private getDomainSeparator(): Hex {
        // This would calculate the EIP-712 domain separator
        // For now, return a placeholder
        return keccak256(encodePacked(
            ['bytes32', 'uint256', 'address'],
            [
                keccak256(toHex('Safe Transaction', { size: 32 })),
                BigInt(this.chainId),
                this.safeAddress || '0x0000000000000000000000000000000000000000'
            ]
        ));
    }

    private buildDeploymentData(params: SafeDeploymentParams): Hex {
        const contracts = this.getSafeContracts();
        const setupData = this.encodeSetupCall(
            params.owners,
            params.threshold,
            params.setupModules,
            params.fallbackHandler || contracts.fallbackHandler
        );

        return encodeFunctionData({
            abi: [{
                inputs: [
                    { name: '_singleton', type: 'address' },
                    { name: 'initializer', type: 'bytes' },
                    { name: 'saltNonce', type: 'uint256' }
                ],
                name: 'createProxyWithNonce',
                outputs: [{ name: 'proxy', type: 'address' }],
                stateMutability: 'nonpayable',
                type: 'function'
            }],
            functionName: 'createProxyWithNonce',
            args: [
                contracts.singleton,
                setupData,
                params.saltNonce || 0n
            ]
        });
    }
}

// Export factory function
export function createSafeIntegration(config: SafeIntegrationConfig): SafeIntegration {
    return new SafeIntegration(config);
}
