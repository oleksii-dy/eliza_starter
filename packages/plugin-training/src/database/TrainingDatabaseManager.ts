import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type { TrainingDataPoint, CustomModelType } from '../types.js';

export interface TrainingDataRecord {
  id: UUID;
  created_at: string;
  agent_id: UUID;
  room_id?: UUID;
  world_id?: UUID;
  message_id?: UUID;
  model_type: CustomModelType;
  interaction_type: string;
  input_data: any;
  output_data: any;
  conversation_context?: any;
  state_data?: any;
  metadata?: any;
  response_time_ms?: number;
  tokens_used?: number;
  cost_usd?: number;
  confidence_score?: number;
  success: boolean;
  error_message?: string;
  is_training_sample: boolean;
  quality_rating?: number;
  tags?: string[];
}

export interface TrainingSession {
  id: UUID;
  agent_id: UUID;
  model_type: CustomModelType;
  session_name: string;
  base_model: string;
  training_config: any;
  training_samples_count: number;
  validation_samples_count: number;
  data_start_date?: string;
  data_end_date?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress_percent: number;
  final_model_name?: string;
  deployment_id?: string;
  validation_metrics?: any;
  training_cost_usd?: number;
  training_logs?: string;
  error_details?: string;
}

export interface ModelDeployment {
  id: UUID;
  agent_id: UUID;
  model_type: CustomModelType;
  model_name: string;
  deployment_id: string;
  provider: string;
  endpoint_url?: string;
  status: 'deploying' | 'active' | 'inactive' | 'failed';
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  last_used_at?: string;
  auto_shutdown_minutes: number;
  max_cost_per_hour?: number;
}

export class TrainingDatabaseManager {
  private db: any; // Use any for now since IDatabaseAdapter interface is incomplete

  constructor(private runtime?: IAgentRuntime) {
    // Access database through proper channels if runtime is available
    if (runtime) {
      this.db =
        (runtime as any).adapter?.db || (runtime as any).databaseAdapter?.db || (runtime as any).db;
    }
  }

  /**
   * Initialize training database schema
   */
  async initializeSchema(): Promise<void> {
    try {
      // Try multiple possible schema locations for better compatibility
      const possiblePaths = [
        path.join(__dirname, 'training-schema.sql'),
        path.join(process.cwd(), 'src', 'database', 'training-schema.sql'),
        path.join(process.cwd(), 'database', 'training-schema.sql'),
      ];

      let schema: string | undefined;

      for (const possiblePath of possiblePaths) {
        try {
          schema = await fs.readFile(possiblePath, 'utf-8');
          break;
        } catch (error) {
          // Continue to next path
        }
      }

      if (!schema) {
        throw new Error('Could not find training-schema.sql in any expected location');
      }

      // Execute schema in chunks for better compatibility
      const statements = schema
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0);

      for (const statement of statements) {
        try {
          await this.db.exec(statement);
        } catch (error) {
          // Some statements may fail if tables already exist, that's okay
          elizaLogger.debug('Schema statement execution note:', error);
        }
      }

      elizaLogger.info('Training database schema initialized');
    } catch (error) {
      elizaLogger.error('Failed to initialize training database schema:', error);
      throw error;
    }
  }

  /**
   * Store training data point
   */
  async storeTrainingData(dataPoint: TrainingDataPoint): Promise<void> {
    const record: Partial<TrainingDataRecord> = {
      id: dataPoint.id,
      agent_id: (this.runtime?.agentId || 'default-agent') as any,
      room_id: dataPoint.metadata?.roomId,
      world_id: dataPoint.metadata?.worldId,
      message_id: dataPoint.metadata?.messageId,
      model_type: dataPoint.modelType,
      interaction_type: 'inference',
      input_data: dataPoint.input,
      output_data: dataPoint.output,
      conversation_context: dataPoint.input.conversationContext,
      state_data: dataPoint.input.state,
      metadata: dataPoint.metadata,
      response_time_ms: dataPoint.metadata?.responseTimeMs,
      tokens_used: dataPoint.metadata?.tokensUsed,
      cost_usd: dataPoint.metadata?.costUsd,
      confidence_score: dataPoint.output.confidence,
      success: true,
      is_training_sample: true,
      tags: [`model:${dataPoint.modelType}`, 'auto-collected'],
    };

    try {
      await this.db.run(
        `INSERT INTO training_data (
          id, agent_id, room_id, world_id, message_id, model_type, interaction_type,
          input_data, output_data, conversation_context, state_data, metadata,
          response_time_ms, tokens_used, cost_usd, confidence_score, success,
          is_training_sample, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.agent_id,
          record.room_id,
          record.world_id,
          record.message_id,
          record.model_type,
          record.interaction_type,
          JSON.stringify(record.input_data),
          JSON.stringify(record.output_data),
          JSON.stringify(record.conversation_context),
          JSON.stringify(record.state_data),
          JSON.stringify(record.metadata),
          record.response_time_ms,
          record.tokens_used,
          record.cost_usd,
          record.confidence_score,
          record.success,
          record.is_training_sample,
          JSON.stringify(record.tags),
        ]
      );

      elizaLogger.debug(`Stored training data for ${dataPoint.modelType}`, {
        id: dataPoint.id,
        modelType: dataPoint.modelType,
      });
    } catch (error) {
      elizaLogger.error('Failed to store training data:', error);
      throw error;
    }
  }

  /**
   * Get training data for export
   */
  async getTrainingData(
    options: {
      modelType?: CustomModelType;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      isTrainingSample?: boolean;
    } = {}
  ): Promise<TrainingDataRecord[]> {
    const {
      modelType,
      limit = 1000,
      offset = 0,
      startDate,
      endDate,
      isTrainingSample = true,
    } = options;

    let query = `
      SELECT * FROM training_data 
      WHERE agent_id = ? AND is_training_sample = ?
    `;
    const params: any[] = [this.runtime?.agentId || 'default-agent', isTrainingSample];

    if (modelType) {
      query += ' AND model_type = ?';
      params.push(modelType);
    }

    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate.toISOString());
    }

    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate.toISOString());
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    try {
      const rows = await this.db.all(query, params);
      return rows.map((row: any) => ({
        ...row,
        input_data: JSON.parse(row.input_data),
        output_data: JSON.parse(row.output_data),
        conversation_context: row.conversation_context
          ? JSON.parse(row.conversation_context)
          : null,
        state_data: row.state_data ? JSON.parse(row.state_data) : null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        tags: row.tags ? JSON.parse(row.tags) : [],
      }));
    } catch (error) {
      elizaLogger.error('Failed to get training data:', error);
      throw error;
    }
  }

  /**
   * Get training data statistics
   */
  async getTrainingDataStats(): Promise<{
    total: number;
    byModelType: Record<string, number>;
    byDate: Record<string, number>;
    recentSamples: number;
    avgConfidence: number;
    avgResponseTime: number;
    totalCost: number;
  }> {
    try {
      const stats = await this.db.get(
        `
        SELECT 
          COUNT(*) as total,
          AVG(confidence_score) as avg_confidence,
          AVG(response_time_ms) as avg_response_time,
          SUM(cost_usd) as total_cost
        FROM training_data 
        WHERE agent_id = ? AND is_training_sample = true
      `,
        [this.runtime?.agentId || 'default-agent']
      );

      const byModelType = await this.db.all(
        `
        SELECT model_type, COUNT(*) as count
        FROM training_data 
        WHERE agent_id = ? AND is_training_sample = true
        GROUP BY model_type
      `,
        [this.runtime?.agentId || 'default-agent']
      );

      const byDate = await this.db.all(
        `
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM training_data 
        WHERE agent_id = ? AND is_training_sample = true
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `,
        [this.runtime?.agentId || 'default-agent']
      );

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentStats = await this.db.get(
        `
        SELECT COUNT(*) as recent_samples
        FROM training_data 
        WHERE agent_id = ? AND is_training_sample = true AND created_at > ?
      `,
        [this.runtime?.agentId || 'default-agent', oneDayAgo]
      );

      return {
        total: stats.total || 0,
        byModelType: Object.fromEntries(byModelType.map((row: any) => [row.model_type, row.count])),
        byDate: Object.fromEntries(byDate.map((row: any) => [row.date, row.count])),
        recentSamples: recentStats.recent_samples || 0,
        avgConfidence: stats.avg_confidence || 0,
        avgResponseTime: stats.avg_response_time || 0,
        totalCost: stats.total_cost || 0,
      };
    } catch (error) {
      elizaLogger.error('Failed to get training data stats:', error);
      throw error;
    }
  }

  /**
   * Create training session
   */
  async createTrainingSession(
    session: Omit<TrainingSession, 'id' | 'created_at' | 'updated_at'>
  ): Promise<UUID> {
    const id = crypto.randomUUID() as UUID;

    try {
      await this.db.run(
        `
        INSERT INTO training_sessions (
          id, agent_id, model_type, session_name, base_model, training_config,
          training_samples_count, validation_samples_count, data_start_date, data_end_date,
          status, progress_percent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          id,
          session.agent_id,
          session.model_type,
          session.session_name,
          session.base_model,
          JSON.stringify(session.training_config),
          session.training_samples_count,
          session.validation_samples_count,
          session.data_start_date,
          session.data_end_date,
          session.status,
          session.progress_percent,
        ]
      );

      return id;
    } catch (error) {
      elizaLogger.error('Failed to create training session:', error);
      throw error;
    }
  }

  /**
   * Update training session
   */
  async updateTrainingSession(id: UUID, updates: Partial<TrainingSession>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(', ');

    const values = Object.values(updates).map((value) =>
      typeof value === 'object' ? JSON.stringify(value) : value
    );

    try {
      await this.db.run(`UPDATE training_sessions SET ${setClause} WHERE id = ?`, [...values, id]);
    } catch (error) {
      elizaLogger.error('Failed to update training session:', error);
      throw error;
    }
  }

  /**
   * Get training sessions
   */
  async getTrainingSessions(modelType?: CustomModelType): Promise<TrainingSession[]> {
    let query = 'SELECT * FROM training_sessions WHERE agent_id = ?';
    const params: any[] = [this.runtime?.agentId || 'default-agent'];

    if (modelType) {
      query += ' AND model_type = ?';
      params.push(modelType);
    }

    query += ' ORDER BY created_at DESC';

    try {
      const rows = await this.db.all(query, params);
      return rows.map((row: any) => ({
        ...row,
        training_config: JSON.parse(row.training_config),
        validation_metrics: row.validation_metrics ? JSON.parse(row.validation_metrics) : null,
      }));
    } catch (error) {
      elizaLogger.error('Failed to get training sessions:', error);
      throw error;
    }
  }

  /**
   * Clean up old training data based on retention policy
   */
  async cleanupOldData(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    try {
      const result = await this.db.run(
        `
        DELETE FROM training_data 
        WHERE agent_id = ? AND created_at < ?
      `,
        [this.runtime?.agentId || 'default-agent', cutoffDate]
      );

      const deletedCount = result.changes || 0;
      elizaLogger.info(`Cleaned up ${deletedCount} old training data records`);
      return deletedCount;
    } catch (error) {
      elizaLogger.error('Failed to cleanup old training data:', error);
      throw error;
    }
  }

  /**
   * Store reasoning decision for audit trail
   */
  async storeReasoningDecision(decision: {
    roomId?: UUID;
    messageId?: UUID;
    decisionType: 'should_respond' | 'planning' | 'coding' | 'fallback';
    modelUsed?: string;
    customReasoningUsed: boolean;
    inputSummary: string;
    outputSummary: string;
    responseTimeMs: number;
    success: boolean;
    errorMessage?: string;
    fullContext?: any;
  }): Promise<void> {
    try {
      await this.db.run(
        `
        INSERT INTO reasoning_decisions (
          agent_id, room_id, message_id, decision_type, model_used, custom_reasoning_used,
          input_summary, output_summary, response_time_ms, success, error_message, full_context
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          this.runtime?.agentId || 'default-agent',
          decision.roomId,
          decision.messageId,
          decision.decisionType,
          decision.modelUsed,
          decision.customReasoningUsed,
          decision.inputSummary,
          decision.outputSummary,
          decision.responseTimeMs,
          decision.success,
          decision.errorMessage,
          JSON.stringify(decision.fullContext),
        ]
      );
    } catch (error) {
      elizaLogger.error('Failed to store reasoning decision:', error);
    }
  }
}
