import { promises as fs } from 'fs';
import path from 'path';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type { TrainingDataPoint, CustomModelType } from '../interfaces/CustomReasoningService.js';

export interface RecordingFile {
  filename: string;
  path: string;
  size: number;
  created: Date;
  modelType: CustomModelType;
}

export interface RecordingSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  modelType: CustomModelType;
  recordingCount: number;
  totalSize: number;
  directory: string;
}

/**
 * Manages training recording files for visual debugging and analysis
 */
export class TrainingRecordingManager {
  private baseDir: string;
  private currentSession?: RecordingSession;

  constructor(private runtime: IAgentRuntime, baseDir?: string) {
    // Use provided baseDir or default to project root
    this.baseDir = baseDir || 
      runtime.getSetting('TRAINING_RECORDINGS_DIR') || 
      path.join(process.cwd(), 'training_recordings');
  }

  /**
   * Initialize recording directory structure
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      
      // Create subdirectories for each model type
      const modelTypes: CustomModelType[] = ['should_respond', 'planning', 'coding'];
      
      for (const modelType of modelTypes) {
        const modelDir = path.join(this.baseDir, modelType);
        await fs.mkdir(modelDir, { recursive: true });
        
        // Create daily subdirectories
        const today = new Date().toISOString().split('T')[0];
        const todayDir = path.join(modelDir, today);
        await fs.mkdir(todayDir, { recursive: true });
      }

      // Create sessions directory
      const sessionsDir = path.join(this.baseDir, 'sessions');
      await fs.mkdir(sessionsDir, { recursive: true });

      elizaLogger.info(`Training recordings directory initialized: ${this.baseDir}`);
    } catch (error) {
      elizaLogger.error('Failed to initialize recording directory:', error);
      throw error;
    }
  }

  /**
   * Start a new recording session
   */
  async startSession(modelType: CustomModelType, sessionName?: string): Promise<string> {
    const sessionId = sessionName || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionDir = path.join(this.baseDir, 'sessions', sessionId);
    
    await fs.mkdir(sessionDir, { recursive: true });
    
    this.currentSession = {
      sessionId,
      startTime: new Date(),
      modelType,
      recordingCount: 0,
      totalSize: 0,
      directory: sessionDir,
    };

    // Write session metadata
    const sessionMetadata = {
      sessionId,
      startTime: this.currentSession.startTime.toISOString(),
      modelType,
      agentId: this.runtime.agentId,
      agentName: this.runtime.character.name,
    };

    await fs.writeFile(
      path.join(sessionDir, 'session.json'),
      JSON.stringify(sessionMetadata, null, 2)
    );

    elizaLogger.info(`Started recording session: ${sessionId}`);
    return sessionId;
  }

  /**
   * End current recording session
   */
  async endSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    this.currentSession.endTime = new Date();
    
    // Update session metadata
    const sessionMetadata = {
      sessionId: this.currentSession.sessionId,
      startTime: this.currentSession.startTime.toISOString(),
      endTime: this.currentSession.endTime.toISOString(),
      modelType: this.currentSession.modelType,
      recordingCount: this.currentSession.recordingCount,
      totalSize: this.currentSession.totalSize,
      agentId: this.runtime.agentId,
      agentName: this.runtime.character.name,
    };

    await fs.writeFile(
      path.join(this.currentSession.directory, 'session.json'),
      JSON.stringify(sessionMetadata, null, 2)
    );

    elizaLogger.info(`Ended recording session: ${this.currentSession.sessionId}`);
    this.currentSession = undefined;
  }

  /**
   * Record a training data point to filesystem for visual debugging
   */
  async recordTrainingData(dataPoint: TrainingDataPoint): Promise<string> {
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];
    const timeStr = timestamp.replace(/[:.]/g, '-');
    
    // Determine recording directory
    let recordingDir: string;
    
    if (this.currentSession) {
      recordingDir = this.currentSession.directory;
    } else {
      recordingDir = path.join(this.baseDir, dataPoint.modelType, date);
      await fs.mkdir(recordingDir, { recursive: true });
    }

    // Create filename with timestamp and model type
    const filename = `${timeStr}_${dataPoint.modelType}_${dataPoint.id.substr(0, 8)}.json`;
    const filePath = path.join(recordingDir, filename);

    // Prepare readable training record
    const record = {
      // Basic info
      id: dataPoint.id,
      timestamp: timestamp,
      modelType: dataPoint.modelType,
      agentId: this.runtime.agentId,
      agentName: this.runtime.character.name,
      
      // Context
      roomId: dataPoint.metadata?.roomId,
      messageId: dataPoint.metadata?.messageId,
      
      // Input data (formatted for readability)
      input: this.formatInputForReading(dataPoint),
      
      // Output data (formatted for readability)
      output: this.formatOutputForReading(dataPoint),
      
      // Performance metrics
      performance: {
        responseTimeMs: dataPoint.metadata?.responseTimeMs,
        tokensUsed: dataPoint.metadata?.tokensUsed,
        costUsd: dataPoint.metadata?.costUsd,
        confidence: dataPoint.output.confidence,
      },
      
      // Raw data for complete debugging
      raw: {
        input: dataPoint.input,
        output: dataPoint.output,
        metadata: dataPoint.metadata,
      },
    };

    // Write the recording file
    await fs.writeFile(filePath, JSON.stringify(record, null, 2));
    
    // Update session statistics
    if (this.currentSession) {
      this.currentSession.recordingCount++;
      const stats = await fs.stat(filePath);
      this.currentSession.totalSize += stats.size;
    }

    elizaLogger.debug(`Recorded training data: ${filename}`);
    return filePath;
  }

  /**
   * Format input data for human readability
   */
  private formatInputForReading(dataPoint: TrainingDataPoint): any {
    switch (dataPoint.modelType) {
      case 'should_respond':
        return {
          messageText: dataPoint.input.messageText,
          conversationContext: dataPoint.input.conversationContext?.slice(-3).map((msg: any) => ({
            role: msg.entityId === this.runtime.agentId ? 'Agent' : 'User',
            text: msg.content.text,
          })),
          prompt: dataPoint.input.prompt?.substring(0, 500) + '...',
        };
        
      case 'planning':
        return {
          messageText: dataPoint.input.messageText,
          availableActions: dataPoint.input.availableActions,
          stateValues: Object.keys(dataPoint.input.state?.values || {}),
          stateProviders: Object.keys(dataPoint.input.state?.data?.providers || {}),
          prompt: dataPoint.input.prompt?.substring(0, 500) + '...',
        };
        
      case 'coding':
        return {
          prompt: dataPoint.input.prompt,
          language: dataPoint.input.language,
          context: dataPoint.input.context?.substring(0, 300) + '...',
        };
        
      default:
        return dataPoint.input;
    }
  }

  /**
   * Format output data for human readability
   */
  private formatOutputForReading(dataPoint: TrainingDataPoint): any {
    switch (dataPoint.modelType) {
      case 'should_respond':
        return {
          decision: dataPoint.output.decision,
          reasoning: dataPoint.output.reasoning,
          confidence: dataPoint.output.confidence,
        };
        
      case 'planning':
        return {
          thought: dataPoint.output.thought,
          actions: dataPoint.output.actions,
          providers: dataPoint.output.providers,
          responseText: dataPoint.output.text?.substring(0, 200) + '...',
        };
        
      case 'coding':
        return {
          codeLines: dataPoint.output.code?.split('\n').length,
          codePreview: dataPoint.output.code?.substring(0, 300) + '...',
          hasExplanation: !!dataPoint.output.explanation,
          explanationPreview: dataPoint.output.explanation?.substring(0, 200) + '...',
        };
        
      default:
        return dataPoint.output;
    }
  }

  /**
   * Get list of recording files
   */
  async getRecordingFiles(modelType?: CustomModelType, date?: string): Promise<RecordingFile[]> {
    const files: RecordingFile[] = [];
    
    try {
      let searchDirs: string[] = [];
      
      if (modelType && date) {
        searchDirs = [path.join(this.baseDir, modelType, date)];
      } else if (modelType) {
        const modelDir = path.join(this.baseDir, modelType);
        const dates = await fs.readdir(modelDir);
        searchDirs = dates.map(date => path.join(modelDir, date));
      } else {
        const modelTypes = await fs.readdir(this.baseDir);
        for (const mt of modelTypes) {
          if (mt === 'sessions') continue;
          const modelDir = path.join(this.baseDir, mt);
          const dates = await fs.readdir(modelDir);
          searchDirs.push(...dates.map(date => path.join(modelDir, date)));
        }
      }

      for (const dir of searchDirs) {
        try {
          const entries = await fs.readdir(dir);
          const jsonFiles = entries.filter(entry => entry.endsWith('.json'));
          
          for (const filename of jsonFiles) {
            const filePath = path.join(dir, filename);
            const stats = await fs.stat(filePath);
            const extractedModelType = filename.split('_')[2] as CustomModelType;
            
            files.push({
              filename,
              path: filePath,
              size: stats.size,
              created: stats.birthtime,
              modelType: extractedModelType,
            });
          }
        } catch (error) {
          // Directory might not exist, continue
        }
      }

      return files.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      elizaLogger.error('Failed to get recording files:', error);
      return [];
    }
  }

  /**
   * Get recording sessions
   */
  async getRecordingSessions(): Promise<RecordingSession[]> {
    const sessions: RecordingSession[] = [];
    
    try {
      const sessionsDir = path.join(this.baseDir, 'sessions');
      const sessionDirs = await fs.readdir(sessionsDir);
      
      for (const sessionDir of sessionDirs) {
        try {
          const sessionPath = path.join(sessionsDir, sessionDir);
          const metadataPath = path.join(sessionPath, 'session.json');
          
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
          const files = await fs.readdir(sessionPath);
          const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'session.json');
          
          // Calculate total size
          let totalSize = 0;
          for (const file of jsonFiles) {
            const stats = await fs.stat(path.join(sessionPath, file));
            totalSize += stats.size;
          }
          
          sessions.push({
            sessionId: metadata.sessionId,
            startTime: new Date(metadata.startTime),
            endTime: metadata.endTime ? new Date(metadata.endTime) : undefined,
            modelType: metadata.modelType,
            recordingCount: jsonFiles.length,
            totalSize,
            directory: sessionPath,
          });
        } catch (error) {
          elizaLogger.warn(`Failed to read session ${sessionDir}:`, error);
        }
      }

      return sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    } catch (error) {
      elizaLogger.error('Failed to get recording sessions:', error);
      return [];
    }
  }

  /**
   * Read a specific recording file
   */
  async readRecording(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      elizaLogger.error(`Failed to read recording file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old recording files
   */
  async cleanupOldRecordings(retentionDays: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    try {
      const allFiles = await this.getRecordingFiles();
      
      for (const file of allFiles) {
        if (file.created < cutoffDate) {
          await fs.unlink(file.path);
          deletedCount++;
        }
      }

      elizaLogger.info(`Cleaned up ${deletedCount} old recording files`);
      return deletedCount;
    } catch (error) {
      elizaLogger.error('Failed to cleanup old recordings:', error);
      throw error;
    }
  }

  /**
   * Export recordings to JSONL for training
   */
  async exportRecordingsToJSONL(
    outputPath: string, 
    options: {
      modelType?: CustomModelType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<number> {
    const files = await this.getRecordingFiles(options.modelType);
    let processedCount = 0;
    const lines: string[] = [];

    try {
      for (const file of files) {
        if (options.startDate && file.created < options.startDate) continue;
        if (options.endDate && file.created > options.endDate) continue;
        if (options.limit && processedCount >= options.limit) break;

        const recording = await this.readRecording(file.path);
        
        // Convert to training format
        const trainingSample = {
          messages: [
            { role: 'system', content: this.getSystemPrompt(recording.modelType) },
            { role: 'user', content: this.formatUserPrompt(recording) },
            { role: 'assistant', content: this.formatAssistantResponse(recording) },
          ],
          metadata: {
            modelType: recording.modelType,
            timestamp: recording.timestamp,
            confidence: recording.output.confidence,
            responseTime: recording.performance.responseTimeMs,
          },
        };

        lines.push(JSON.stringify(trainingSample));
        processedCount++;
      }

      await fs.writeFile(outputPath, lines.join('\n'));
      elizaLogger.info(`Exported ${processedCount} recordings to ${outputPath}`);
      return processedCount;
    } catch (error) {
      elizaLogger.error('Failed to export recordings to JSONL:', error);
      throw error;
    }
  }

  private getSystemPrompt(modelType: CustomModelType): string {
    switch (modelType) {
      case 'should_respond':
        return 'You are an AI agent deciding whether to respond to a message. Consider the conversation context and determine if the agent should RESPOND, IGNORE, or STOP.';
      case 'planning':
        return 'You are an AI agent planning how to respond to a message. Generate a thought process, select appropriate actions, choose relevant providers for context, and create a response.';
      case 'coding':
        return 'You are an expert programmer. Generate clean, efficient code based on the given requirements.';
      default:
        return 'You are a helpful AI assistant.';
    }
  }

  private formatUserPrompt(recording: any): string {
    switch (recording.modelType) {
      case 'should_respond':
        const context = recording.input.conversationContext?.map((msg: any) => 
          `${msg.role}: ${msg.text}`
        ).join('\n') || '';
        return `Recent conversation:\n${context}\n\nCurrent message: ${recording.input.messageText}\n\nShould the agent respond to this message?`;
        
      case 'planning':
        return `Message: ${recording.input.messageText}\n\nAvailable actions: ${recording.input.availableActions?.join(', ') || 'None'}\n\nPlan your response:`;
        
      case 'coding':
        return recording.input.prompt;
        
      default:
        return recording.input.prompt || recording.input.messageText || '';
    }
  }

  private formatAssistantResponse(recording: any): string {
    switch (recording.modelType) {
      case 'should_respond':
        return `<response>\n<reasoning>${recording.output.reasoning}</reasoning>\n<action>${recording.output.decision}</action>\n</response>`;
        
      case 'planning':
        return `<response>\n<thought>${recording.output.thought}</thought>\n<actions>${recording.output.actions?.join(',') || ''}</actions>\n<text>${recording.output.responseText || ''}</text>\n</response>`;
        
      case 'coding':
        return recording.output.hasExplanation 
          ? `${recording.output.explanationPreview}\n\n\`\`\`${recording.input.language || 'javascript'}\n${recording.raw.output.code}\n\`\`\``
          : `\`\`\`${recording.input.language || 'javascript'}\n${recording.raw.output.code}\n\`\`\``;
        
      default:
        return JSON.stringify(recording.output);
    }
  }

  /**
   * Get recording statistics
   */
  async getRecordingStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byModelType: Record<string, number>;
    byDate: Record<string, number>;
    oldestRecording?: Date;
    newestRecording?: Date;
  }> {
    try {
      const files = await this.getRecordingFiles();
      let totalSize = 0;
      const byModelType: Record<string, number> = {};
      const byDate: Record<string, number> = {};
      let oldestRecording: Date | undefined;
      let newestRecording: Date | undefined;

      for (const file of files) {
        totalSize += file.size;
        byModelType[file.modelType] = (byModelType[file.modelType] || 0) + 1;
        
        const dateStr = file.created.toISOString().split('T')[0];
        byDate[dateStr] = (byDate[dateStr] || 0) + 1;
        
        if (!oldestRecording || file.created < oldestRecording) {
          oldestRecording = file.created;
        }
        if (!newestRecording || file.created > newestRecording) {
          newestRecording = file.created;
        }
      }

      return {
        totalFiles: files.length,
        totalSize,
        byModelType,
        byDate,
        oldestRecording,
        newestRecording,
      };
    } catch (error) {
      elizaLogger.error('Failed to get recording stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        byModelType: {},
        byDate: {},
      };
    }
  }
}