/**
 * Revenue Sharing Service
 *
 * Handles creator payouts and revenue sharing for the marketplace:
 * - Calculate creator earnings (50% revenue share)
 * - Process payouts via Stripe and crypto
 * - Track payment history and tax reporting
 * - Handle KYC verification for creators
 */

import { getDatabase } from '../database';
import {
  creatorPayouts,
  assetUsageRecords,
  creatorProfiles,
  marketplaceAssets,
} from '../database/marketplace-schema';
import { users } from '../database/schema';
import { eq, and, gte, lte, sum, sql, desc } from 'drizzle-orm';
import Stripe from 'stripe';

export interface PayoutPeriod {
  startDate: Date;
  endDate: Date;
}

export interface CreatorEarnings {
  creatorId: string;
  period: PayoutPeriod;
  totalRevenue: number;
  creatorShare: number;
  platformFee: number;
  assetsRevenue: Array<{
    assetId: string;
    assetName: string;
    revenue: number;
    usageCount: number;
  }>;
}

export interface PayoutRequest {
  creatorId: string;
  organizationId: string;
  period: PayoutPeriod;
  amount: number;
  payoutMethod: 'stripe' | 'crypto' | 'bank';
  payoutAddress: string;
}

export interface PayoutStatus {
  id: string;
  creatorId: string;
  period: PayoutPeriod;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payoutMethod: string;
  processedAt?: Date;
  failureReason?: string;
  transactionId?: string;
}

export class RevenueSharing {
  private stripe: Stripe;
  private readonly CREATOR_SHARE = 0.5; // 50% to creators
  private readonly MINIMUM_PAYOUT = 10; // $10 minimum payout

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  /**
   * Calculate earnings for a creator in a given period
   */
  async calculateCreatorEarnings(
    creatorId: string,
    organizationId: string,
    period: PayoutPeriod,
  ): Promise<CreatorEarnings> {
    try {
      const db = await getDatabase();

      // Get creator's assets
      const creatorAssets = await db
        .select({
          id: marketplaceAssets.id,
          name: marketplaceAssets.name,
        })
        .from(marketplaceAssets)
        .where(
          and(
            eq(marketplaceAssets.creatorId, creatorId),
            eq(marketplaceAssets.organizationId, organizationId),
          ),
        );

      const assetIds = creatorAssets.map((a: any) => a.id);

      if (assetIds.length === 0) {
        return {
          creatorId,
          period,
          totalRevenue: 0,
          creatorShare: 0,
          platformFee: 0,
          assetsRevenue: [],
        };
      }

      // Get usage records for the period
      const usageRecords = await db
        .select({
          assetId: assetUsageRecords.assetId,
          totalRevenue: sum(assetUsageRecords.totalCost),
          creatorRevenue: sum(assetUsageRecords.creatorRevenue),
          platformRevenue: sum(assetUsageRecords.platformRevenue),
          usageCount: sql<number>`COUNT(*)`,
        })
        .from(assetUsageRecords)
        .where(
          and(
            sql`${assetUsageRecords.assetId} = ANY(${assetIds})`,
            gte(assetUsageRecords.createdAt, period.startDate),
            lte(assetUsageRecords.createdAt, period.endDate),
          ),
        )
        .groupBy(assetUsageRecords.assetId);

      // Calculate totals
      const totalRevenue = usageRecords.reduce(
        (sum: number, record: any) =>
          sum + parseFloat(record.totalRevenue || '0'),
        0,
      );
      const creatorShare = usageRecords.reduce(
        (sum: number, record: any) =>
          sum + parseFloat(record.creatorRevenue || '0'),
        0,
      );
      const platformFee = totalRevenue - creatorShare;

      // Map asset revenues
      const assetsRevenue = usageRecords.map((record: any) => {
        const asset = creatorAssets.find((a: any) => a.id === record.assetId);
        return {
          assetId: record.assetId,
          assetName: asset?.name || 'Unknown Asset',
          revenue: parseFloat(record.creatorRevenue || '0'),
          usageCount: Number(record.usageCount),
        };
      });

      return {
        creatorId,
        period,
        totalRevenue,
        creatorShare,
        platformFee,
        assetsRevenue,
      };
    } catch (error) {
      console.error('Failed to calculate creator earnings:', error);
      throw error;
    }
  }

  /**
   * Process payout for a creator
   */
  async processPayout(request: PayoutRequest): Promise<PayoutStatus> {
    try {
      const db = await getDatabase();

      // Verify creator profile and payout settings
      const creatorProfile = await this.getCreatorProfile(request.creatorId);
      if (!creatorProfile) {
        throw new Error('Creator profile not found');
      }

      if (!creatorProfile.isVerified) {
        throw new Error(
          'Creator must complete KYC verification before receiving payouts',
        );
      }

      // Calculate earnings for the period
      const earnings = await this.calculateCreatorEarnings(
        request.creatorId,
        request.organizationId,
        request.period,
      );

      if (earnings.creatorShare < this.MINIMUM_PAYOUT) {
        throw new Error(`Minimum payout amount is $${this.MINIMUM_PAYOUT}`);
      }

      if (Math.abs(earnings.creatorShare - request.amount) > 0.01) {
        throw new Error('Payout amount does not match calculated earnings');
      }

      // Create payout record
      const payoutData = {
        organizationId: request.organizationId,
        creatorId: request.creatorId,
        periodStart: request.period.startDate,
        periodEnd: request.period.endDate,
        totalRevenue: earnings.totalRevenue.toString(),
        creatorShare: earnings.creatorShare.toString(),
        platformFee: earnings.platformFee.toString(),
        payoutMethod: request.payoutMethod,
        payoutAddress: request.payoutAddress,
        status: 'processing' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const payoutResult = await db
        .insert(creatorPayouts)
        .values(payoutData)
        .returning();
      const payout = payoutResult[0];

      // Process payment based on method
      let transactionResult;
      try {
        switch (request.payoutMethod) {
          case 'stripe':
            transactionResult = await this.processStripeTransfer(
              payout.id,
              creatorProfile,
              request.amount,
            );
            break;
          case 'crypto':
            transactionResult = await this.processCryptoTransfer(
              payout.id,
              request.payoutAddress,
              request.amount,
            );
            break;
          case 'bank':
            transactionResult = await this.processBankTransfer(
              payout.id,
              creatorProfile,
              request.amount,
            );
            break;
          default:
            throw new Error('Unsupported payout method');
        }

        // Update payout record with success
        await db
          .update(creatorPayouts)
          .set({
            status: 'completed',
            processedAt: new Date(),
            stripeTransferId: transactionResult.stripeTransferId,
            cryptoTransactionId: transactionResult.cryptoTransactionId,
            updatedAt: new Date(),
          })
          .where(eq(creatorPayouts.id, payout.id));

        return {
          id: payout.id,
          creatorId: request.creatorId,
          period: request.period,
          amount: request.amount,
          status: 'completed',
          payoutMethod: request.payoutMethod,
          processedAt: new Date(),
          transactionId:
            transactionResult.stripeTransferId ||
            transactionResult.cryptoTransactionId,
        };
      } catch (paymentError) {
        // Update payout record with failure
        await db
          .update(creatorPayouts)
          .set({
            status: 'failed',
            failureReason:
              paymentError instanceof Error
                ? paymentError.message
                : 'Payment failed',
            updatedAt: new Date(),
          })
          .where(eq(creatorPayouts.id, payout.id));

        throw paymentError;
      }
    } catch (error) {
      console.error('Failed to process payout:', error);
      throw error;
    }
  }

  /**
   * Get payout history for a creator
   */
  async getPayoutHistory(
    creatorId: string,
    organizationId: string,
  ): Promise<PayoutStatus[]> {
    try {
      const db = await getDatabase();

      const payouts = await db
        .select()
        .from(creatorPayouts)
        .where(
          and(
            eq(creatorPayouts.creatorId, creatorId),
            eq(creatorPayouts.organizationId, organizationId),
          ),
        )
        .orderBy(desc(creatorPayouts.createdAt));

      return payouts.map((payout: any) => ({
        id: payout.id,
        creatorId: payout.creatorId,
        period: {
          startDate: payout.periodStart,
          endDate: payout.periodEnd,
        },
        amount: parseFloat(payout.creatorShare),
        status: payout.status as
          | 'pending'
          | 'processing'
          | 'completed'
          | 'failed',
        payoutMethod: payout.payoutMethod,
        processedAt: payout.processedAt,
        failureReason: payout.failureReason,
        transactionId: payout.stripeTransferId || payout.cryptoTransactionId,
      }));
    } catch (error) {
      console.error('Failed to get payout history:', error);
      throw error;
    }
  }

  /**
   * Setup creator profile for payouts
   */
  async setupCreatorProfile(
    userId: string,
    organizationId: string,
    profileData: {
      displayName: string;
      bio?: string;
      website?: string;
      githubUsername?: string;
      twitterUsername?: string;
      payoutMethod: 'stripe' | 'crypto' | 'bank';
      stripeAccountId?: string;
      cryptoWalletAddress?: string;
      cryptoWalletType?: string;
    },
  ): Promise<void> {
    try {
      const db = await getDatabase();

      // Check if profile already exists
      const existingProfiles = await db
        .select()
        .from(creatorProfiles)
        .where(eq(creatorProfiles.userId, userId))
        .limit(1);

      if (existingProfiles.length > 0) {
        // Update existing profile
        await db
          .update(creatorProfiles)
          .set({
            displayName: profileData.displayName,
            bio: profileData.bio,
            website: profileData.website,
            githubUsername: profileData.githubUsername,
            twitterUsername: profileData.twitterUsername,
            payoutMethod: profileData.payoutMethod,
            stripeAccountId: profileData.stripeAccountId,
            cryptoWalletAddress: profileData.cryptoWalletAddress,
            cryptoWalletType: profileData.cryptoWalletType,
            updatedAt: new Date(),
          })
          .where(eq(creatorProfiles.userId, userId));
      } else {
        // Create new profile
        await db.insert(creatorProfiles).values({
          organizationId,
          userId,
          displayName: profileData.displayName,
          bio: profileData.bio,
          website: profileData.website,
          githubUsername: profileData.githubUsername,
          twitterUsername: profileData.twitterUsername,
          payoutMethod: profileData.payoutMethod,
          stripeAccountId: profileData.stripeAccountId,
          cryptoWalletAddress: profileData.cryptoWalletAddress,
          cryptoWalletType: profileData.cryptoWalletType,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to setup creator profile:', error);
      throw error;
    }
  }

  /**
   * Process Stripe transfer to creator's connected account
   */
  private async processStripeTransfer(
    payoutId: string,
    creatorProfile: any,
    amount: number,
  ): Promise<{ stripeTransferId?: string; cryptoTransactionId?: string }> {
    try {
      if (!creatorProfile.stripeAccountId) {
        throw new Error('Creator must connect a Stripe account for payouts');
      }

      // Create transfer to connected account
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        destination: creatorProfile.stripeAccountId,
        metadata: {
          payoutId,
          creatorId: creatorProfile.userId,
        },
      });

      return { stripeTransferId: transfer.id };
    } catch (error) {
      console.error('Stripe transfer failed:', error);
      throw new Error(
        `Stripe transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Process crypto transfer (placeholder - would integrate with actual crypto payment service)
   */
  private async processCryptoTransfer(
    payoutId: string,
    walletAddress: string,
    amount: number,
  ): Promise<{ stripeTransferId?: string; cryptoTransactionId?: string }> {
    // Placeholder implementation
    // In production, this would integrate with a crypto payment processor
    try {
      // Validate wallet address format
      if (!this.isValidWalletAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      // Simulate crypto transaction
      const transactionId = `crypto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // In production, this would:
      // 1. Connect to blockchain or crypto payment service
      // 2. Create and broadcast transaction
      // 3. Wait for confirmation
      // 4. Return actual transaction hash

      console.log(
        `Crypto payout of $${amount} to ${walletAddress} - Transaction: ${transactionId}`,
      );

      return { cryptoTransactionId: transactionId };
    } catch (error) {
      console.error('Crypto transfer failed:', error);
      throw new Error(
        `Crypto transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Process bank transfer (placeholder)
   */
  private async processBankTransfer(
    payoutId: string,
    creatorProfile: any,
    amount: number,
  ): Promise<{ stripeTransferId?: string; cryptoTransactionId?: string }> {
    // Placeholder - would integrate with ACH or wire transfer service
    throw new Error('Bank transfers not yet implemented');
  }

  /**
   * Get creator profile
   */
  private async getCreatorProfile(creatorId: string): Promise<any> {
    const db = await getDatabase();

    const profiles = await db
      .select()
      .from(creatorProfiles)
      .where(eq(creatorProfiles.userId, creatorId))
      .limit(1);

    return profiles[0] || null;
  }

  /**
   * Validate wallet address (basic validation)
   */
  private isValidWalletAddress(address: string): boolean {
    // Basic validation - in production would use proper crypto address validation
    return address.length > 10 && /^[a-zA-Z0-9]+$/.test(address);
  }

  /**
   * Generate tax reporting data for a creator
   */
  async generateTaxReport(
    creatorId: string,
    organizationId: string,
    year: number,
  ): Promise<{
    totalEarnings: number;
    totalPayouts: number;
    unpaidEarnings: number;
    payoutsByMonth: Array<{ month: number; amount: number }>;
  }> {
    try {
      const db = await getDatabase();

      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year + 1, 0, 1);

      // Get total earnings for the year
      const earnings = await this.calculateCreatorEarnings(
        creatorId,
        organizationId,
        {
          startDate: yearStart,
          endDate: yearEnd,
        },
      );

      // Get payouts for the year
      const payouts = await db
        .select()
        .from(creatorPayouts)
        .where(
          and(
            eq(creatorPayouts.creatorId, creatorId),
            eq(creatorPayouts.organizationId, organizationId),
            gte(creatorPayouts.processedAt, yearStart),
            lte(creatorPayouts.processedAt, yearEnd),
            eq(creatorPayouts.status, 'completed'),
          ),
        );

      const totalPayouts = payouts.reduce(
        (sum: number, payout: any) => sum + parseFloat(payout.creatorShare),
        0,
      );

      // Group payouts by month
      const payoutsByMonth = Array(12)
        .fill(0)
        .map((_, index) => ({
          month: index + 1,
          amount: 0,
        }));

      payouts.forEach((payout: any) => {
        if (payout.processedAt) {
          const month = payout.processedAt.getMonth();
          payoutsByMonth[month].amount += parseFloat(payout.creatorShare);
        }
      });

      return {
        totalEarnings: earnings.creatorShare,
        totalPayouts,
        unpaidEarnings: earnings.creatorShare - totalPayouts,
        payoutsByMonth,
      };
    } catch (error) {
      console.error('Failed to generate tax report:', error);
      throw error;
    }
  }
}
