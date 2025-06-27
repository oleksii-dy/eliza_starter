import { TextEncoder } from 'util';

// Fallback type definitions for missing SDK exports
export interface ProofInput {
  circuitWasm: Uint8Array;
  provingKey: Uint8Array;
  witnessData: any;
}

export interface ProofOutput {
  proof: any;
  publicSignals?: any[];
  verificationKey?: any;
}

export interface WitnessData {
  [key: string]: any;
}

// Fallback functions - would use real SDK when available
async function midnightGenerateProof(_input: ProofInput): Promise<ProofOutput> {
  throw new Error(
    'Proof generation requires Midnight SDK setup. Please configure the Midnight development environment.'
  );
}

async function midnightVerifyProof(_params: {
  proof: any;
  publicSignals: any[];
  verificationKey: any;
}): Promise<boolean> {
  throw new Error(
    'Proof verification requires Midnight SDK setup. Please configure the Midnight development environment.'
  );
}
import { circuitCompiler } from './circuitCompiler';
import { type ZKProof, type CircuitWitness, ProofGenerationError } from '../types/index';
import pino from 'pino';

/**
 * Real Zero-Knowledge Proof Generator for Midnight Network
 * Generates and verifies proofs using compiled Compact circuits
 */
export class ProofGenerator {
  private logger: pino.Logger;
  private proofCache = new Map<string, ZKProof>();

  constructor() {
    this.logger = pino({ name: 'ProofGenerator' });
  }

  /**
   * Generate a zero-knowledge proof for a specific circuit
   */
  async generateProof(
    contractName: string,
    circuitName: string,
    witnesses: CircuitWitness
  ): Promise<ZKProof> {
    try {
      this.logger.info(
        `Generating ZK proof for circuit ${circuitName} in contract ${contractName}`
      );

      // Ensure contract is compiled
      if (!circuitCompiler.isContractCompiled(contractName)) {
        this.logger.info(`Contract ${contractName} not compiled, compiling now...`);
        await circuitCompiler.compileContract(contractName);
      }

      // Get circuit artifacts
      const circuitWasm = circuitCompiler.getCircuitWasm(contractName, circuitName);
      const circuitZkey = circuitCompiler.getCircuitZkey(contractName, circuitName);

      if (!circuitWasm || !circuitZkey) {
        throw new Error(`Circuit artifacts not found for ${contractName}:${circuitName}`);
      }

      // Prepare witness data for the circuit
      const witnessData = this.prepareWitnessData(circuitName, witnesses);

      // Generate the proof using Midnight SDK
      const proofInput: ProofInput = {
        circuitWasm,
        provingKey: circuitZkey,
        witnessData,
      };

      const proofOutput = await midnightGenerateProof(proofInput);

      // Create ZKProof object
      const zkProof: ZKProof = {
        circuitId: `${contractName}:${circuitName}`,
        proof: this.serializeProof(proofOutput.proof),
        publicSignals: proofOutput.publicSignals || [],
        witnesses,
        timestamp: new Date(),
        verificationKey: proofOutput.verificationKey,
      };

      // Cache the proof
      const proofKey = this.createProofKey(contractName, circuitName, witnesses);
      this.proofCache.set(proofKey, zkProof);

      this.logger.info(`Successfully generated ZK proof for ${contractName}:${circuitName}`, {
        proofSize: zkProof.proof.length,
        publicSignalsCount: zkProof.publicSignals.length,
      });

      return zkProof;
    } catch (error) {
      this.logger.error(`Failed to generate ZK proof for ${contractName}:${circuitName}:`, error);
      throw new ProofGenerationError(`Proof generation failed: ${(error as Error).message}`, error);
    }
  }

  /**
   * Verify a zero-knowledge proof
   */
  async verifyProof(proof: ZKProof): Promise<boolean> {
    try {
      this.logger.info(`Verifying ZK proof for circuit ${proof.circuitId}`);

      // Parse circuit ID
      const [contractName, circuitName] = proof.circuitId.split(':');
      if (!contractName || !circuitName) {
        throw new Error(`Invalid circuit ID format: ${proof.circuitId}`);
      }

      // Get verification key
      let verificationKey = proof.verificationKey;
      if (!verificationKey) {
        // Try to get from compiled contract
        const compiled = circuitCompiler.getCompiledContract(contractName);
        verificationKey = compiled?.circuits?.[circuitName]?.vkey;
      }

      if (!verificationKey) {
        throw new Error(`Verification key not found for ${proof.circuitId}`);
      }

      // Verify the proof using Midnight SDK
      const isValid = await midnightVerifyProof({
        proof: this.deserializeProof(proof.proof),
        publicSignals: proof.publicSignals,
        verificationKey,
      });

      this.logger.info(`ZK proof verification result for ${proof.circuitId}: ${isValid}`);
      return isValid;
    } catch (error) {
      this.logger.error(`Failed to verify ZK proof for ${proof.circuitId}:`, error);
      return false;
    }
  }

  /**
   * Generate proof for secure message sending
   */
  async generateMessageProof(
    fromAgent: string,
    toAgent: string,
    messageContent: string,
    encryptionKey: Uint8Array,
    nonce: Uint8Array
  ): Promise<ZKProof> {
    const witnesses: CircuitWitness = {
      fromAgent: this.stringToBytes32(fromAgent),
      toAgent: this.stringToBytes32(toAgent),
      messageContent: this.stringToBytes256(messageContent),
      encryptionKey: Array.from(encryptionKey),
      nonce: Array.from(nonce),
    };

    return this.generateProof('messaging', 'sendSecureMessage', witnesses);
  }

  /**
   * Generate proof for reading messages
   */
  async generateReadProof(
    agentId: string,
    decryptionKey: Uint8Array,
    messageId: string
  ): Promise<ZKProof> {
    const witnesses: CircuitWitness = {
      agentId: this.stringToBytes32(agentId),
      decryptionKey: Array.from(decryptionKey),
      messageId: this.stringToBytes32(messageId),
    };

    return this.generateProof('messaging', 'readMessageWitness', witnesses);
  }

  /**
   * Generate proof for payment authorization
   */
  async generatePaymentProof(
    fromAgent: string,
    toAgent: string,
    amount: bigint,
    currency: string,
    nonce: Uint8Array
  ): Promise<ZKProof> {
    const witnesses: CircuitWitness = {
      fromAgent: this.stringToBytes32(fromAgent),
      toAgent: this.stringToBytes32(toAgent),
      amount: this.bigintToBytes32(amount),
      currency: this.stringToBytes32(currency),
      nonce: Array.from(nonce),
    };

    return this.generateProof('payment', 'authorizePayment', witnesses);
  }

  /**
   * Get cached proof if available
   */
  getCachedProof(
    contractName: string,
    circuitName: string,
    witnesses: CircuitWitness
  ): ZKProof | undefined {
    const proofKey = this.createProofKey(contractName, circuitName, witnesses);
    return this.proofCache.get(proofKey);
  }

  /**
   * Clear proof cache
   */
  clearCache(): void {
    this.proofCache.clear();
    this.logger.info('Proof cache cleared');
  }

  /**
   * Prepare witness data for circuit input
   */
  private prepareWitnessData(circuitName: string, witnesses: CircuitWitness): WitnessData {
    const witnessData: WitnessData = {};

    // Convert witnesses to circuit-compatible format
    for (const [key, value] of Object.entries(witnesses)) {
      if (Array.isArray(value)) {
        witnessData[key] = value;
      } else if (typeof value === 'string') {
        witnessData[key] = this.stringToBytes32(value);
      } else if (typeof value === 'bigint') {
        witnessData[key] = this.bigintToBytes32(value);
      } else if (typeof value === 'number') {
        witnessData[key] = [value];
      } else {
        witnessData[key] = value;
      }
    }

    return witnessData;
  }

  /**
   * Serialize proof for storage/transmission
   */
  private serializeProof(proof: any): string {
    return JSON.stringify(proof);
  }

  /**
   * Deserialize proof from string
   */
  private deserializeProof(proofString: string): any {
    return JSON.parse(proofString);
  }

  /**
   * Create a unique key for proof caching
   */
  private createProofKey(
    contractName: string,
    circuitName: string,
    witnesses: CircuitWitness
  ): string {
    const witnessHash = this.hashWitnesses(witnesses);
    return `${contractName}:${circuitName}:${witnessHash}`;
  }

  /**
   * Hash witnesses for caching key
   */
  private hashWitnesses(witnesses: CircuitWitness): string {
    const witnessString = JSON.stringify(witnesses, Object.keys(witnesses).sort());
    return Buffer.from(witnessString).toString('base64').slice(0, 16);
  }

  /**
   * Convert string to 32-byte array
   */
  private stringToBytes32(str: string): number[] {
    const bytes = new TextEncoder().encode(str);
    const result = new Array(32).fill(0);
    for (let i = 0; i < Math.min(bytes.length, 32); i++) {
      result[i] = bytes[i];
    }
    return result;
  }

  /**
   * Convert string to 256-byte array
   */
  private stringToBytes256(str: string): number[] {
    const bytes = new TextEncoder().encode(str);
    const result = new Array(256).fill(0);
    for (let i = 0; i < Math.min(bytes.length, 256); i++) {
      result[i] = bytes[i];
    }
    return result;
  }

  /**
   * Convert bigint to 32-byte array
   */
  private bigintToBytes32(value: bigint): number[] {
    const hex = value.toString(16).padStart(64, '0');
    const result = new Array(32).fill(0);
    for (let i = 0; i < 32; i++) {
      result[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return result;
  }
}

// Export a singleton instance
export const proofGenerator = new ProofGenerator();
