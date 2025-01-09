import { InjectiveGrpcClient, getAddressFromPrivateKey } from '../modules';
import * as ethUtil from "ethereumjs-util";

// Mock dependencies
jest.mock("ethereumjs-util");
jest.mock("@injectivelabs/networks");

describe('InjectiveGrpcClient Tests', () => {
    // Test data
    const mockPrivateKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const mockAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

    describe('getAddressFromPrivateKey', () => {
        beforeEach(() => {
            // Reset all mocks before each test
            jest.clearAllMocks();

            // Setup ethUtil mocks
            (ethUtil.privateToPublic as jest.Mock).mockReturnValue(Buffer.from('mockPublicKey'));
            (ethUtil.publicToAddress as jest.Mock).mockReturnValue(Buffer.from('mockAddress'));
            (ethUtil.toChecksumAddress as jest.Mock).mockReturnValue(mockAddress);
        });

        it('should successfully generate address from private key without 0x prefix', () => {
            const address = getAddressFromPrivateKey(mockPrivateKey);

            expect(address).toBe(mockAddress);
            expect(ethUtil.privateToPublic).toHaveBeenCalled();
            expect(ethUtil.publicToAddress).toHaveBeenCalled();
            expect(ethUtil.toChecksumAddress).toHaveBeenCalled();
        });

        it('should successfully generate address from private key with 0x prefix', () => {
            const address = getAddressFromPrivateKey(`0x${mockPrivateKey}`);

            expect(address).toBe(mockAddress);
        });

        it('should throw error for undefined private key', () => {
            expect(() => getAddressFromPrivateKey(undefined)).toThrow('Private key is required');
        });

        it('should throw error for invalid private key length', () => {
            const invalidKey = '123456'; // Too short
            expect(() => getAddressFromPrivateKey(invalidKey)).toThrow('Invalid private key length');
        });
    });

    describe('InjectiveGrpcClient Construction', () => {
        it('should successfully create client instance with default network', () => {
            const client = new InjectiveGrpcClient('Mainnet', mockPrivateKey);

            expect(client).toBeInstanceOf(InjectiveGrpcClient);
            // Test instance creation without accessing protected properties
            expect(() => client.getAccountDetails()).not.toThrow();
        });

        it('should successfully create client instance with testnet', () => {
            const client = new InjectiveGrpcClient('Testnet', mockPrivateKey);

            expect(client).toBeInstanceOf(InjectiveGrpcClient);
            // Test instance creation without accessing protected properties
            expect(() => client.getAccountDetails()).not.toThrow();
        });
    });

    describe('InjectiveGrpcClient Method Bindings', () => {
        let client: InjectiveGrpcClient;

        beforeEach(() => {
            client = new InjectiveGrpcClient('Mainnet', mockPrivateKey);
        });

        it('should have auction methods bound', () => {
            expect(typeof client.getAuctionModuleParams).toBe('function');
            expect(typeof client.getAuctionModuleState).toBe('function');
            expect(typeof client.getCurrentBasket).toBe('function');
            expect(typeof client.getAuctionRound).toBe('function');
            expect(typeof client.getAuctions).toBe('function');
            expect(typeof client.msgBid).toBe('function');
        });

        it('should have auth methods bound', () => {
            expect(typeof client.getAuthModuleParams).toBe('function');
            expect(typeof client.getAccountDetails).toBe('function');
            expect(typeof client.getAccounts).toBe('function');
        });

        it('should have bank methods bound', () => {
            expect(typeof client.getBankModuleParams).toBe('function');
            expect(typeof client.getBankBalance).toBe('function');
            expect(typeof client.getTotalSupply).toBe('function');
            expect(typeof client.getAllTotalSupply).toBe('function');
            expect(typeof client.getSupplyOf).toBe('function');
            expect(typeof client.getDenomsMetadata).toBe('function');
            expect(typeof client.getDenomMetadata).toBe('function');
            expect(typeof client.getDenomOwners).toBe('function');
        });

        it('should have exchange methods bound', () => {
            expect(typeof client.getModuleParams).toBe('function');
            expect(typeof client.getModuleState).toBe('function');
            expect(typeof client.getFeeDiscountSchedule).toBe('function');
            expect(typeof client.getFeeDiscountAccountInfo).toBe('function');
            expect(typeof client.getDerivativeMarkets).toBe('function');
            expect(typeof client.getSpotMarkets).toBe('function');
        });
    });

    describe('Method Execution', () => {
        let client: InjectiveGrpcClient;

        beforeEach(() => {
            client = new InjectiveGrpcClient('Mainnet', mockPrivateKey);
        });

        it('should execute auction methods with correct context', async () => {
            // Create a mock implementation that returns a promise
            const mockRequest = jest.fn().mockResolvedValue({ data: 'test' });
            // Use type assertion to set the protected property
            (client as any).request = mockRequest;

            await client.getAuctionModuleParams();

            expect(mockRequest).toHaveBeenCalled();
        });

        it('should execute bank methods with correct context', async () => {
            const mockRequest = jest.fn().mockResolvedValue({ data: 'test' });
            (client as any).request = mockRequest;

            await client.getBankModuleParams();

            expect(mockRequest).toHaveBeenCalled();
        });

        it('should properly handle errors in method execution', async () => {
            const mockRequest = jest.fn().mockRejectedValue(new Error('Test error'));
            (client as any).request = mockRequest;

            await expect(client.getBankModuleParams()).resolves.toEqual(
                expect.objectContaining({
                    success: false,
                    error: expect.any(Object)
                })
            );
        });
    });
});