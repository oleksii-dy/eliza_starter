/**
 * Inference Analytics Service
 * Tracks all AI inference calls for analytics and compliance
 */

import { getDatabase } from '@/lib/database';
import {
  inferenceLogs,
  platformConfig,
  organizations,
} from '@/lib/database/schema';
import {
  eq,
  and,
  gte,
  lte,
  desc,
  sql,
  count,
  sum,
  avg,
  isNull,
} from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface InferenceCallData {
  // Request identification
  requestId?: string;
  sessionId?: string;
  conversationId?: string;

  // Organization and user context
  organizationId: string;
  agentId?: string;
  userId?: string;
  apiKeyId?: string;

  // Provider and model details
  provider: string; // 'openai', 'anthropic', 'gemini', etc.
  model: string; // 'gpt-4o-mini', 'claude-3-5-sonnet', etc.
  modelVersion?: string;
  endpoint: string; // '/v1/chat/completions', '/v1/messages', etc.

  // Request data (for legal compliance)
  requestPayload: any;

  // Token usage
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens?: number;

  // Performance metrics
  latency: number; // milliseconds
  timeToFirstToken?: number;
  processingTime?: number;
  queueTime?: number;

  // Request context
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  origin?: string;

  // Content analysis
  contentType?: string;
  language?: string;
  contentLength?: number;
  responseLength?: number;

  // Business context
  feature?: string;
  workflowStep?: string;
  retryAttempt?: number;

  // Compliance
  retentionPolicy?: string;
  isPersonalData?: boolean;
  dataClassification?: string;

  metadata?: Record<string, any>;
}

export interface InferenceCallResult {
  requestId: string;
  responsePayload?: any;
  status: 'success' | 'error' | 'timeout' | 'rate_limited';
  errorCode?: string;
  errorMessage?: string;
  httpStatusCode?: number;
  baseCost: number;
  markupPercentage: number;
  markupAmount: number;
  totalCost: number;
}

export interface AnalyticsQuery {
  organizationId: string;
  startDate: Date;
  endDate: Date;
  provider?: string;
  model?: string;
  status?: string;
  agentId?: string;
  userId?: string;
}

export interface AnalyticsResult {
  totalRequests: number;
  totalCost: number;
  totalBaseCost: number;
  totalMarkup: number;
  totalTokens: number;
  averageLatency: number;
  successRate: number;

  // Breakdowns
  byProvider: Array<{
    provider: string;
    requests: number;
    cost: number;
    tokens: number;
    percentage: number;
  }>;

  byModel: Array<{
    model: string;
    provider: string;
    requests: number;
    cost: number;
    tokens: number;
    averageLatency: number;
  }>;

  byDay: Array<{
    date: string;
    requests: number;
    cost: number;
    tokens: number;
    averageLatency: number;
  }>;

  trends: {
    requestsChange: number;
    costChange: number;
    tokensChange: number;
  };
}

export class InferenceAnalyticsService {
  /**
   * Start tracking an inference call
   */
  async startInferenceCall(data: InferenceCallData): Promise<string> {
    const requestId = data.requestId || uuidv4();

    // Get markup percentage for organization
    const markupPercentage = await this.getMarkupPercentage(
      data.organizationId,
    );

    try {
      const db = await getDatabase();
      await db.insert(inferenceLogs).values({
        requestId,
        organizationId: data.organizationId,
        agentId: data.agentId,
        userId: data.userId,
        apiKeyId: data.apiKeyId,
        sessionId: data.sessionId,
        conversationId: data.conversationId,

        provider: data.provider,
        model: data.model,
        modelVersion: data.modelVersion,
        endpoint: data.endpoint,

        requestPayload: data.requestPayload,

        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        totalTokens: data.totalTokens,
        cachedTokens: data.cachedTokens || 0,

        // Will be updated when call completes
        baseCost: '0',
        markupPercentage: markupPercentage.toString(),
        markupAmount: '0',
        totalCost: '0',

        latency: data.latency,
        timeToFirstToken: data.timeToFirstToken,
        processingTime: data.processingTime,
        queueTime: data.queueTime,

        status: 'pending',

        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        referer: data.referer,
        origin: data.origin,

        contentType: data.contentType,
        language: data.language,
        contentLength: data.contentLength,
        responseLength: data.responseLength,

        feature: data.feature,
        workflowStep: data.workflowStep,
        retryAttempt: data.retryAttempt || 0,

        retentionPolicy: data.retentionPolicy || 'standard',
        isPersonalData: data.isPersonalData || false,
        dataClassification: data.dataClassification || 'public',

        metadata: data.metadata || {},
      });

      return requestId;
    } catch (error) {
      console.error('Failed to log inference call start:', error);
      throw error;
    }
  }

  /**
   * Complete tracking an inference call
   */
  async completeInferenceCall(
    requestId: string,
    result: InferenceCallResult,
  ): Promise<void> {
    try {
      const db = await getDatabase();
      await db
        .update(inferenceLogs)
        .set({
          responsePayload: result.responsePayload,
          status: result.status,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          httpStatusCode: result.httpStatusCode,
          baseCost: result.baseCost.toString(),
          markupPercentage: result.markupPercentage.toString(),
          markupAmount: result.markupAmount.toString(),
          totalCost: result.totalCost.toString(),
          updatedAt: new Date(),
        })
        .where(eq(inferenceLogs.requestId, requestId));
    } catch (error) {
      console.error('Failed to complete inference call log:', error);
      throw error;
    }
  }

  /**
   * Get markup percentage for an organization
   */
  async getMarkupPercentage(organizationId: string): Promise<number> {
    try {
      // Check for organization-specific markup
      const db = await getDatabase();
      const orgConfig = await db
        .select({ numericValue: platformConfig.numericValue })
        .from(platformConfig)
        .where(
          and(
            eq(platformConfig.organizationId, organizationId),
            eq(platformConfig.configKey, 'markup_percentage'),
          ),
        )
        .limit(1);

      if (orgConfig.length > 0 && orgConfig[0].numericValue) {
        return Number(orgConfig[0].numericValue);
      }

      // Fallback to global default
      const globalConfig = await db
        .select({ numericValue: platformConfig.numericValue })
        .from(platformConfig)
        .where(
          and(
            isNull(platformConfig.organizationId),
            eq(platformConfig.configKey, 'markup_percentage'),
          ),
        )
        .limit(1);

      if (globalConfig.length > 0 && globalConfig[0].numericValue) {
        return Number(globalConfig[0].numericValue);
      }

      // Hard-coded fallback
      return 20.0;
    } catch (error) {
      console.error('Failed to get markup percentage:', error);
      return 20.0; // Default fallback
    }
  }

  /**
   * Set markup percentage for an organization
   */
  async setMarkupPercentage(
    organizationId: string,
    percentage: number,
  ): Promise<void> {
    try {
      const db = await getDatabase();
      await db
        .insert(platformConfig)
        .values({
          organizationId,
          configKey: 'markup_percentage',
          configValue: percentage.toString(),
          configType: 'number',
          numericValue: percentage.toString(),
          category: 'pricing',
          description: 'Markup percentage applied to AI inference costs',
        })
        .onConflictDoUpdate({
          target: [platformConfig.organizationId, platformConfig.configKey],
          set: {
            configValue: percentage.toString(),
            numericValue: percentage.toString(),
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error('Failed to set markup percentage:', error);
      throw error;
    }
  }

  /**
   * Calculate cost with markup
   */
  calculateCostWithMarkup(
    baseCost: number,
    markupPercentage: number,
  ): { markupAmount: number; totalCost: number } {
    const markupAmount = baseCost * (markupPercentage / 100);
    const totalCost = baseCost + markupAmount;

    return {
      markupAmount: Math.round(markupAmount * 1000000) / 1000000, // Round to 6 decimal places
      totalCost: Math.round(totalCost * 1000000) / 1000000,
    };
  }

  /**
   * Get analytics data for a time period
   */
  async getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult> {
    try {
      const db = await getDatabase();
      const whereConditions = [
        eq(inferenceLogs.organizationId, query.organizationId),
        gte(inferenceLogs.createdAt, query.startDate),
        lte(inferenceLogs.createdAt, query.endDate),
      ];

      if (query.provider) {
        whereConditions.push(eq(inferenceLogs.provider, query.provider));
      }
      if (query.model) {
        whereConditions.push(eq(inferenceLogs.model, query.model));
      }
      if (query.status) {
        whereConditions.push(eq(inferenceLogs.status, query.status));
      }
      if (query.agentId) {
        whereConditions.push(eq(inferenceLogs.agentId, query.agentId));
      }
      if (query.userId) {
        whereConditions.push(eq(inferenceLogs.userId, query.userId));
      }

      // Get overall stats
      const overallStats = await db
        .select({
          totalRequests: count(),
          totalCost: sum(inferenceLogs.totalCost),
          totalBaseCost: sum(inferenceLogs.baseCost),
          totalMarkup: sum(inferenceLogs.markupAmount),
          totalTokens: sum(inferenceLogs.totalTokens),
          averageLatency: avg(inferenceLogs.latency),
          successCount: sql<number>`COUNT(CASE WHEN ${inferenceLogs.status} = 'success' THEN 1 END)`,
        })
        .from(inferenceLogs)
        .where(and(...whereConditions));

      const stats = overallStats[0];
      const successRate =
        stats.totalRequests > 0
          ? (Number(stats.successCount) / Number(stats.totalRequests)) * 100
          : 0;

      // Get provider breakdown
      const providerBreakdown = await db
        .select({
          provider: inferenceLogs.provider,
          requests: count(),
          cost: sum(inferenceLogs.totalCost),
          tokens: sum(inferenceLogs.totalTokens),
        })
        .from(inferenceLogs)
        .where(and(...whereConditions))
        .groupBy(inferenceLogs.provider)
        .orderBy(desc(count()));

      // Calculate percentages for providers
      const totalRequests = Number(stats.totalRequests);
      const byProvider = providerBreakdown.map(
        (p: {
          provider: string | null;
          requests: number;
          cost: string | null;
          tokens: string | null;
        }) => ({
          provider: p.provider,
          requests: Number(p.requests),
          cost: Number(p.cost || 0),
          tokens: Number(p.tokens || 0),
          percentage:
            totalRequests > 0 ? (Number(p.requests) / totalRequests) * 100 : 0,
        }),
      );

      // Get model breakdown
      const modelBreakdown = await db
        .select({
          model: inferenceLogs.model,
          provider: inferenceLogs.provider,
          requests: count(),
          cost: sum(inferenceLogs.totalCost),
          tokens: sum(inferenceLogs.totalTokens),
          averageLatency: avg(inferenceLogs.latency),
        })
        .from(inferenceLogs)
        .where(and(...whereConditions))
        .groupBy(inferenceLogs.model, inferenceLogs.provider)
        .orderBy(desc(count()));

      const byModel = modelBreakdown.map(
        (m: {
          model: string | null;
          provider: string | null;
          requests: number;
          cost: string | null;
          tokens: string | null;
          averageLatency: string | null;
        }) => ({
          model: m.model,
          provider: m.provider,
          requests: Number(m.requests),
          cost: Number(m.cost || 0),
          tokens: Number(m.tokens || 0),
          averageLatency: Number(m.averageLatency || 0),
        }),
      );

      // Get daily breakdown
      const dailyBreakdown = await db
        .select({
          date: sql<string>`DATE(${inferenceLogs.createdAt})`,
          requests: count(),
          cost: sum(inferenceLogs.totalCost),
          tokens: sum(inferenceLogs.totalTokens),
          averageLatency: avg(inferenceLogs.latency),
        })
        .from(inferenceLogs)
        .where(and(...whereConditions))
        .groupBy(sql`DATE(${inferenceLogs.createdAt})`)
        .orderBy(sql`DATE(${inferenceLogs.createdAt})`);

      const byDay = dailyBreakdown.map(
        (d: {
          date: string;
          requests: number;
          cost: string | null;
          tokens: string | null;
          averageLatency: string | null;
        }) => ({
          date: d.date,
          requests: Number(d.requests),
          cost: Number(d.cost || 0),
          tokens: Number(d.tokens || 0),
          averageLatency: Number(d.averageLatency || 0),
        }),
      );

      // Calculate trends (compare with previous period)
      const periodDuration =
        query.endDate.getTime() - query.startDate.getTime();
      const previousStartDate = new Date(
        query.startDate.getTime() - periodDuration,
      );
      const previousEndDate = new Date(query.startDate);

      const previousStats = await db
        .select({
          totalRequests: count(),
          totalCost: sum(inferenceLogs.totalCost),
          totalTokens: sum(inferenceLogs.totalTokens),
        })
        .from(inferenceLogs)
        .where(
          and(
            eq(inferenceLogs.organizationId, query.organizationId),
            gte(inferenceLogs.createdAt, previousStartDate),
            lte(inferenceLogs.createdAt, previousEndDate),
          ),
        );

      const prevStats = previousStats[0];
      const trends = {
        requestsChange:
          Number(prevStats.totalRequests) > 0
            ? ((Number(stats.totalRequests) - Number(prevStats.totalRequests)) /
                Number(prevStats.totalRequests)) *
              100
            : 0,
        costChange:
          Number(prevStats.totalCost) > 0
            ? ((Number(stats.totalCost || 0) -
                Number(prevStats.totalCost || 0)) /
                Number(prevStats.totalCost || 0)) *
              100
            : 0,
        tokensChange:
          Number(prevStats.totalTokens) > 0
            ? ((Number(stats.totalTokens || 0) -
                Number(prevStats.totalTokens || 0)) /
                Number(prevStats.totalTokens || 0)) *
              100
            : 0,
      };

      return {
        totalRequests: Number(stats.totalRequests),
        totalCost: Number(stats.totalCost || 0),
        totalBaseCost: Number(stats.totalBaseCost || 0),
        totalMarkup: Number(stats.totalMarkup || 0),
        totalTokens: Number(stats.totalTokens || 0),
        averageLatency: Number(stats.averageLatency || 0),
        successRate,
        byProvider,
        byModel,
        byDay,
        trends,
      };
    } catch (error) {
      console.error('Failed to get analytics:', error);
      throw error;
    }
  }

  /**
   * Get detailed inference logs
   */
  async getInferenceLogs(
    organizationId: string,
    page: number = 1,
    limit: number = 50,
    filters?: {
      provider?: string;
      model?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    try {
      const db = await getDatabase();
      const whereConditions = [
        eq(inferenceLogs.organizationId, organizationId),
      ];

      if (filters?.provider) {
        whereConditions.push(eq(inferenceLogs.provider, filters.provider));
      }
      if (filters?.model) {
        whereConditions.push(eq(inferenceLogs.model, filters.model));
      }
      if (filters?.status) {
        whereConditions.push(eq(inferenceLogs.status, filters.status));
      }
      if (filters?.startDate) {
        whereConditions.push(gte(inferenceLogs.createdAt, filters.startDate));
      }
      if (filters?.endDate) {
        whereConditions.push(lte(inferenceLogs.createdAt, filters.endDate));
      }

      const offset = (page - 1) * limit;

      const logs = await db
        .select()
        .from(inferenceLogs)
        .where(and(...whereConditions))
        .orderBy(desc(inferenceLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const totalCount = await db
        .select({ count: count() })
        .from(inferenceLogs)
        .where(and(...whereConditions));

      return {
        logs,
        totalCount: Number(totalCount[0].count),
        page,
        limit,
        totalPages: Math.ceil(Number(totalCount[0].count) / limit),
      };
    } catch (error) {
      console.error('Failed to get inference logs:', error);
      throw error;
    }
  }
}

export const inferenceAnalytics = new InferenceAnalyticsService();
