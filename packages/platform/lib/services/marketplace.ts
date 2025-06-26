/**
 * Marketplace Service
 * 
 * Core service for UGC marketplace functionality:
 * - Asset discovery and browsing
 * - Installation and subscription management
 * - Revenue sharing and creator payouts
 * - Reviews and ratings
 */

import { db } from '../database';
import {
  marketplaceAssets,
  assetVersions,
  assetInstallations,
  assetReviews,
  userFavorites,
  creatorProfiles,
  assetUsageRecords,
  creatorPayouts,
  AssetType,
  AssetStatus,
  VisibilityType,
  PricingModel
} from '../database/marketplace-schema';
import { organizations, users } from '../database/schema';
import { eq, and, desc, asc, gte, lte, like, inArray, sql, count, avg, sum } from 'drizzle-orm';
import { ContainerHostingService } from './container-hosting';

export interface CreateAssetRequest {
  name: string;
  description: string;
  longDescription?: string;
  assetType: AssetType;
  category: string;
  tags: string[];
  configuration: any;
  pricingModel: PricingModel;
  basePrice?: number;
  usagePrice?: number;
  subscriptionPrice?: number;
  repositoryUrl?: string;
  readme?: string;
  icon?: string;
  images?: string[];
}

export interface AssetSearchFilters {
  assetType?: AssetType;
  category?: string;
  tags?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
  searchQuery?: string;
  sortBy?: 'name' | 'rating' | 'installs' | 'created' | 'updated' | 'price';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface MarketplaceAsset {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  assetType: AssetType;
  category: string;
  tags: string[];
  status: AssetStatus;
  visibility: VisibilityType;
  
  // Pricing
  pricingModel: PricingModel;
  basePrice: number;
  usagePrice: number;
  subscriptionPrice: number;
  currency: string;
  
  // Media
  icon?: string;
  images: string[];
  readme?: string;
  
  // Metrics
  installCount: number;
  usageCount: number;
  favoriteCount: number;
  rating: number;
  ratingCount: number;
  
  // Creator Info
  creator: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    isVerified: boolean;
  };
  
  // Version Info
  version: string;
  lastUpdated: Date;
  createdAt: Date;
  
  // User-specific data (if authenticated)
  isInstalled?: boolean;
  isFavorited?: boolean;
  userRating?: number;
}

export interface InstallationResult {
  success: boolean;
  installationId?: string;
  containerId?: string; // For hosted assets
  error?: string;
}

export interface ReviewSubmission {
  rating: number;
  title?: string;
  review?: string;
}

export class MarketplaceService {
  private containerHosting: ContainerHostingService;

  constructor() {
    this.containerHosting = new ContainerHostingService();
  }

  /**
   * Create a new marketplace asset
   */
  async createAsset(
    creatorId: string,
    organizationId: string,
    assetData: CreateAssetRequest
  ): Promise<string> {
    try {
      // Generate slug from name
      const slug = this.generateSlug(assetData.name);
      
      // Check if slug already exists
      const existingAssets = await db.select()
        .from(marketplaceAssets)
        .where(eq(marketplaceAssets.slug, slug))
        .limit(1);
      
      if (existingAssets.length > 0) {
        throw new Error('Asset with this name already exists');
      }

      // Create asset
      const assetResult = await db.insert(marketplaceAssets).values({
        organizationId,
        creatorId,
        name: assetData.name,
        slug,
        description: assetData.description,
        longDescription: assetData.longDescription,
        assetType: assetData.assetType,
        category: assetData.category,
        tags: assetData.tags,
        configuration: assetData.configuration,
        pricingModel: assetData.pricingModel,
        basePrice: assetData.basePrice?.toString() || '0.00',
        usagePrice: assetData.usagePrice?.toString() || '0.000000',
        subscriptionPrice: assetData.subscriptionPrice?.toString() || '0.00',
        repositoryUrl: assetData.repositoryUrl,
        readme: assetData.readme,
        icon: assetData.icon,
        images: assetData.images || [],
        status: 'draft',
        visibility: 'private',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const asset = assetResult[0];

      // Create initial version
      await db.insert(assetVersions).values({
        assetId: asset.id,
        organizationId,
        version: '1.0.0',
        configuration: assetData.configuration,
        isActive: true,
        createdAt: new Date()
      });

      return asset.id;
    } catch (error) {
      console.error('Failed to create asset:', error);
      throw error;
    }
  }

  /**
   * Search and discover assets
   */
  async searchAssets(filters: AssetSearchFilters, userId?: string): Promise<MarketplaceAsset[]> {
    try {
      let query = db.select({
        asset: marketplaceAssets,
        creator: creatorProfiles,
        user: users
      })
      .from(marketplaceAssets)
      .leftJoin(creatorProfiles, eq(marketplaceAssets.creatorId, creatorProfiles.userId))
      .leftJoin(users, eq(marketplaceAssets.creatorId, users.id))
      .where(and(
        eq(marketplaceAssets.status, 'published'),
        eq(marketplaceAssets.visibility, 'public')
      ));

      // Apply filters
      const conditions = [
        eq(marketplaceAssets.status, 'published'),
        eq(marketplaceAssets.visibility, 'public')
      ];

      if (filters.assetType) {
        conditions.push(eq(marketplaceAssets.assetType, filters.assetType));
      }

      if (filters.category) {
        conditions.push(eq(marketplaceAssets.category, filters.category));
      }

      if (filters.searchQuery) {
        conditions.push(
          sql`(${marketplaceAssets.name} ILIKE ${'%' + filters.searchQuery + '%'} OR 
               ${marketplaceAssets.description} ILIKE ${'%' + filters.searchQuery + '%'})`
        );
      }

      if (filters.rating) {
        conditions.push(gte(marketplaceAssets.rating, filters.rating.toString()));
      }

      query = query.where(and(...conditions));

      // Apply sorting
      const sortBy = filters.sortBy || 'created';
      const sortOrder = filters.sortOrder || 'desc';
      
      switch (sortBy) {
        case 'name':
          query = sortOrder === 'asc' ? 
            query.orderBy(asc(marketplaceAssets.name)) : 
            query.orderBy(desc(marketplaceAssets.name));
          break;
        case 'rating':
          query = sortOrder === 'asc' ? 
            query.orderBy(asc(marketplaceAssets.rating)) : 
            query.orderBy(desc(marketplaceAssets.rating));
          break;
        case 'installs':
          query = sortOrder === 'asc' ? 
            query.orderBy(asc(marketplaceAssets.installCount)) : 
            query.orderBy(desc(marketplaceAssets.installCount));
          break;
        case 'updated':
          query = sortOrder === 'asc' ? 
            query.orderBy(asc(marketplaceAssets.updatedAt)) : 
            query.orderBy(desc(marketplaceAssets.updatedAt));
          break;
        default: // created
          query = sortOrder === 'asc' ? 
            query.orderBy(asc(marketplaceAssets.createdAt)) : 
            query.orderBy(desc(marketplaceAssets.createdAt));
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      const results = await query;

      // Get user-specific data if authenticated
      let userInstallations: any[] = [];
      let userFavs: any[] = [];
      let userRatings: any[] = [];

      if (userId && results.length > 0) {
        const assetIds = results.map((r: { asset: { id: string } }) => r.asset.id);
        
        [userInstallations, userFavs, userRatings] = await Promise.all([
          db.select().from(assetInstallations)
            .where(and(
              eq(assetInstallations.userId, userId),
              inArray(assetInstallations.assetId, assetIds),
              eq(assetInstallations.isActive, true)
            )),
          db.select().from(userFavorites)
            .where(and(
              eq(userFavorites.userId, userId),
              inArray(userFavorites.assetId, assetIds)
            )),
          db.select().from(assetReviews)
            .where(and(
              eq(assetReviews.userId, userId),
              inArray(assetReviews.assetId, assetIds)
            ))
        ]);
      }

      // Map results to MarketplaceAsset interface
      return results.map((result: { asset: any; creator: any; user: any }) => {
        const asset = result.asset;
        const creator = result.creator;
        const user = result.user;

        const installation = userInstallations.find(i => i.assetId === asset.id);
        const favorite = userFavs.find(f => f.assetId === asset.id);
        const rating = userRatings.find(r => r.assetId === asset.id);

        return {
          id: asset.id,
          name: asset.name,
          slug: asset.slug,
          description: asset.description,
          longDescription: asset.longDescription,
          assetType: asset.assetType,
          category: asset.category,
          tags: asset.tags,
          status: asset.status,
          visibility: asset.visibility,
          pricingModel: asset.pricingModel,
          basePrice: parseFloat(asset.basePrice || '0'),
          usagePrice: parseFloat(asset.usagePrice || '0'),
          subscriptionPrice: parseFloat(asset.subscriptionPrice || '0'),
          currency: asset.currency,
          icon: asset.icon,
          images: asset.images,
          readme: asset.readme,
          installCount: asset.installCount,
          usageCount: asset.usageCount,
          favoriteCount: asset.favoriteCount,
          rating: parseFloat(asset.rating || '0'),
          ratingCount: asset.ratingCount,
          creator: {
            id: asset.creatorId,
            displayName: creator?.displayName || user?.name || 'Unknown Creator',
            avatarUrl: creator?.avatarUrl,
            isVerified: creator?.isVerified || false
          },
          version: asset.version,
          lastUpdated: asset.updatedAt,
          createdAt: asset.createdAt,
          isInstalled: !!installation,
          isFavorited: !!favorite,
          userRating: rating?.rating
        };
      });
    } catch (error) {
      console.error('Failed to search assets:', error);
      throw error;
    }
  }

  /**
   * Install an asset for a user
   */
  async installAsset(
    assetId: string,
    userId: string,
    organizationId: string,
    purchaseType: 'free' | 'one_time' | 'subscription' = 'free'
  ): Promise<InstallationResult> {
    try {
      // Get asset details
      const assets = await db.select()
        .from(marketplaceAssets)
        .where(eq(marketplaceAssets.id, assetId))
        .limit(1);

      if (!assets[0]) {
        throw new Error('Asset not found');
      }

      const asset = assets[0];

      // Get latest version
      const versions = await db.select()
        .from(assetVersions)
        .where(and(
          eq(assetVersions.assetId, assetId),
          eq(assetVersions.isActive, true)
        ))
        .limit(1);

      if (!versions[0]) {
        throw new Error('No active version found');
      }

      const version = versions[0];

      // Check if already installed
      const existingInstallations = await db.select()
        .from(assetInstallations)
        .where(and(
          eq(assetInstallations.assetId, assetId),
          eq(assetInstallations.userId, userId),
          eq(assetInstallations.isActive, true)
        ))
        .limit(1);

      if (existingInstallations.length > 0) {
        return {
          success: false,
          error: 'Asset already installed'
        };
      }

      // Calculate purchase price
      let purchasePrice = 0;
      if (purchaseType === 'one_time') {
        purchasePrice = parseFloat(asset.basePrice || '0');
      } else if (purchaseType === 'subscription') {
        purchasePrice = parseFloat(asset.subscriptionPrice || '0');
      }

      // Create installation record
      const installationResult = await db.insert(assetInstallations).values({
        organizationId,
        assetId,
        userId,
        versionId: version.id,
        purchaseType,
        purchasePrice: purchasePrice.toString(),
        currency: asset.currency,
        isActive: true,
        installedAt: new Date()
      }).returning();

      const installation = installationResult[0];

      // Update install count
      await db.update(marketplaceAssets)
        .set({
          installCount: sql`${marketplaceAssets.installCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(marketplaceAssets.id, assetId));

      // If asset requires hosting, deploy container
      let containerId: string | undefined;
      if (asset.assetType === 'mcp' || asset.assetType === 'agent') {
        try {
          const containerInstance = await this.containerHosting.deployContainer({
            assetId,
            versionId: version.id,
            userId,
            organizationId,
            memory: asset.configuration?.containerConfig?.memory || 512,
            cpu: asset.configuration?.containerConfig?.cpu || 1000,
            storage: asset.configuration?.containerConfig?.storage || 1
          });
          containerId = containerInstance.id;
        } catch (error) {
          console.error('Failed to deploy container:', error);
          // Continue with installation but mark as failed deployment
        }
      }

      return {
        success: true,
        installationId: installation.id,
        containerId
      };
    } catch (error) {
      console.error('Failed to install asset:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Installation failed'
      };
    }
  }

  /**
   * Submit a review for an asset
   */
  async submitReview(
    assetId: string,
    userId: string,
    organizationId: string,
    reviewData: ReviewSubmission
  ): Promise<void> {
    try {
      // Check if user has purchased/installed the asset
      const installations = await db.select()
        .from(assetInstallations)
        .where(and(
          eq(assetInstallations.assetId, assetId),
          eq(assetInstallations.userId, userId)
        ))
        .limit(1);

      const isVerifiedPurchase = installations.length > 0;

      // Check if user already reviewed this asset
      const existingReviews = await db.select()
        .from(assetReviews)
        .where(and(
          eq(assetReviews.assetId, assetId),
          eq(assetReviews.userId, userId)
        ))
        .limit(1);

      if (existingReviews.length > 0) {
        // Update existing review
        await db.update(assetReviews)
          .set({
            rating: reviewData.rating,
            title: reviewData.title,
            review: reviewData.review,
            updatedAt: new Date()
          })
          .where(and(
            eq(assetReviews.assetId, assetId),
            eq(assetReviews.userId, userId)
          ));
      } else {
        // Create new review
        await db.insert(assetReviews).values({
          organizationId,
          assetId,
          userId,
          rating: reviewData.rating,
          title: reviewData.title,
          review: reviewData.review,
          isVerifiedPurchase,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Update asset rating
      await this.updateAssetRating(assetId);
    } catch (error) {
      console.error('Failed to submit review:', error);
      throw error;
    }
  }

  /**
   * Toggle favorite status for an asset
   */
  async toggleFavorite(assetId: string, userId: string, organizationId: string): Promise<boolean> {
    try {
      // Check if already favorited
      const existingFavorites = await db.select()
        .from(userFavorites)
        .where(and(
          eq(userFavorites.assetId, assetId),
          eq(userFavorites.userId, userId)
        ))
        .limit(1);

      if (existingFavorites.length > 0) {
        // Remove favorite
        await db.delete(userFavorites)
          .where(and(
            eq(userFavorites.assetId, assetId),
            eq(userFavorites.userId, userId)
          ));

        // Update favorite count
        await db.update(marketplaceAssets)
          .set({
            favoriteCount: sql`${marketplaceAssets.favoriteCount} - 1`,
            updatedAt: new Date()
          })
          .where(eq(marketplaceAssets.id, assetId));

        return false;
      } else {
        // Add favorite
        await db.insert(userFavorites).values({
          organizationId,
          assetId,
          userId,
          createdAt: new Date()
        });

        // Update favorite count
        await db.update(marketplaceAssets)
          .set({
            favoriteCount: sql`${marketplaceAssets.favoriteCount} + 1`,
            updatedAt: new Date()
          })
          .where(eq(marketplaceAssets.id, assetId));

        return true;
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      throw error;
    }
  }

  /**
   * Get creator's assets and earnings
   */
  async getCreatorDashboard(creatorId: string, organizationId: string) {
    try {
      // Get creator's assets
      const assets = await db.select()
        .from(marketplaceAssets)
        .where(and(
          eq(marketplaceAssets.creatorId, creatorId),
          eq(marketplaceAssets.organizationId, organizationId)
        ))
        .orderBy(desc(marketplaceAssets.createdAt));

      // Get total earnings
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const earnings = await db.select({
        totalRevenue: sum(assetUsageRecords.creatorRevenue),
        monthlyRevenue: sql<number>`SUM(CASE WHEN ${assetUsageRecords.createdAt} >= ${thirtyDaysAgo} THEN ${assetUsageRecords.creatorRevenue} ELSE 0 END)`,
        totalUsage: sum(assetUsageRecords.quantity)
      })
      .from(assetUsageRecords)
      .leftJoin(marketplaceAssets, eq(assetUsageRecords.assetId, marketplaceAssets.id))
      .where(eq(marketplaceAssets.creatorId, creatorId));

      const stats = earnings[0];

      return {
        assets: assets.map((asset: any) => ({
          id: asset.id,
          name: asset.name,
          assetType: asset.assetType,
          status: asset.status,
          installCount: asset.installCount,
          usageCount: asset.usageCount,
          rating: parseFloat(asset.rating || '0'),
          createdAt: asset.createdAt
        })),
        totalEarnings: parseFloat(stats.totalRevenue || '0'),
        monthlyEarnings: parseFloat(stats.monthlyRevenue || '0'),
        totalUsage: parseFloat(stats.totalUsage || '0'),
        totalAssets: assets.length
      };
    } catch (error) {
      console.error('Failed to get creator dashboard:', error);
      throw error;
    }
  }

  /**
   * Update asset rating based on reviews
   */
  private async updateAssetRating(assetId: string): Promise<void> {
    try {
      const ratingStats = await db.select({
        averageRating: avg(assetReviews.rating),
        totalReviews: count(assetReviews.id)
      })
      .from(assetReviews)
      .where(and(
        eq(assetReviews.assetId, assetId),
        eq(assetReviews.isHidden, false)
      ));

      const stats = ratingStats[0];
      const avgRating = parseFloat(stats.averageRating || '0');
      const reviewCount = Number(stats.totalReviews || 0);

      await db.update(marketplaceAssets)
        .set({
          rating: avgRating.toFixed(2),
          ratingCount: reviewCount,
          updatedAt: new Date()
        })
        .where(eq(marketplaceAssets.id, assetId));
    } catch (error) {
      console.error('Failed to update asset rating:', error);
    }
  }

  /**
   * Generate URL-friendly slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  }
}