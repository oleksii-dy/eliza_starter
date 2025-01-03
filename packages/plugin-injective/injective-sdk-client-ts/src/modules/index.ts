import * as ethUtil from 'ethereumjs-util';
import { InjectiveGrpcBase } from '../grpc/grpc-base';
import { Network } from "@injectivelabs/networks";

export * as AuctionModule from './auction-module';
export * as AuthModule from './auth-module';
export * as AuthZModule from './authz-module';
export * as BankModule from './bank-module';
export * as DistributionModule from './distribution-module';
export * as ExchangeModule from './excahnge-module';
export * as GovernanceModule from './Gov';
export * as IbcModule from './Ibc';
export * as InsuranceFundModule from './InsuranceFund';
export * as MintModule from './Mint';
export * as OracleModule from './Oracle';
export * as PeggyModule from './Peggy';
export * as PermissionsModule from './Permissions';
export * as StakingModule from './Staking';
export * as TendermintModule from './Tendermint';
export * as TokenFactoryModule from './TokenFactory';
export * as WasmModule from './Wasm';
export * as WasmXModule from './WasmX';

/**
 * Generates an Ethereum address from a private key
 * @param privateKey - Private key as a hex string (with or without '0x' prefix)
 * @returns Checksum Ethereum address
 */

export function getAddressFromPrivateKey(privateKey?: string): string {
    // Check if privateKey is undefined or empty
    if (!privateKey) {
        throw new Error('Private key is required');
    }

    // Ensure the private key has the '0x' prefix
    const formattedPrivateKey = privateKey.startsWith('0x') 
        ? privateKey 
        : `0x${privateKey}`;

    try {
        // Remove '0x' prefix and convert to buffer
        const privateKeyBuffer = Buffer.from(formattedPrivateKey.slice(2), 'hex');
        
        // Validate private key length
        if (privateKeyBuffer.length !== 32) {
            throw new Error('Invalid private key length. Must be 32 bytes.');
        }

        // Derive public key
        const publicKey = ethUtil.privateToPublic(privateKeyBuffer);

        // Generate address from public key
        const address = ethUtil.publicToAddress(publicKey);

        // Convert to checksum address
        return ethUtil.toChecksumAddress(address.toString('hex'));
    } catch (error) {
        console.error('Error generating address:', error);
        throw error;
    }
}
export class GrpcClient extends InjectiveGrpcBase{
    constructor(networkType: keyof typeof Network = "Mainnet", privateKey?: string){
        const ethAddress = getAddressFromPrivateKey(privateKey);
        super(networkType, ethAddress);
    }
}