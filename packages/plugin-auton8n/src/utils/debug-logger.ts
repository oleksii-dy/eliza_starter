import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PluginSpecification, PluginCreationJob } from '../services/plugin-creation-service';

export interface DebugSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  specification: PluginSpecification;
  jobId: string;
  outputPath: string;
  success: boolean;
  error?: string;
  phases: DebugPhase[];
  apiCalls: APICall[];
  generatedFiles: GeneratedFile[];
  buildLogs: BuildLog[];
  testResults: TestResult[];
  prompts: Prompt[];
}

export interface DebugPhase {
  name: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  details?: any;
  error?: string;
}

export interface APICall {
  timestamp: Date;
  model: string;
  prompt: string;
  response: string;
  tokens?: {
    input: number;
    output: number;
  };
  duration?: number;
  error?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  timestamp: Date;
  phase: string;
}

export interface BuildLog {
  timestamp: Date;
  command: string;
  output: string;
  exitCode: number;
  duration: number;
}

export interface TestResult {
  timestamp: Date;
  testFile: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failures?: Array<{
    test: string;
    error: string;
  }>;
}

export interface Prompt {
  timestamp: Date;
  phase: string;
  template: string;
  variables: Record<string, any>;
  fullPrompt: string;
}

export class DebugLogger {
  private static instance: DebugLogger;
  private sessions: Map<string, DebugSession> = new Map();
  private outputDir: string;
  private enabled: boolean;

  private constructor() {
    this.outputDir = path.join(process.cwd(), 'outputs');
    this.enabled = process.env.SAVE_OUTPUTS === 'true';
  }

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  async createSession(jobId: string, specification: PluginSpecification): Promise<string> {
    if (!this.enabled) return '';

    const sessionId = uuidv4();
    const sessionPath = path.join(this.outputDir, sessionId);
    await fs.ensureDir(sessionPath);

    const session: DebugSession = {
      id: sessionId,
      startTime: new Date(),
      specification,
      jobId,
      outputPath: sessionPath,
      success: false,
      phases: [],
      apiCalls: [],
      generatedFiles: [],
      buildLogs: [],
      testResults: [],
      prompts: [],
    };

    this.sessions.set(sessionId, session);

    // Save initial session data
    await this.saveSessionData(sessionId);

    return sessionId;
  }

  async logPhaseStart(sessionId: string, phaseName: string, details?: any): Promise<void> {
    if (!this.enabled || !sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const phase: DebugPhase = {
      name: phaseName,
      startTime: new Date(),
      status: 'running',
      details,
    };

    session.phases.push(phase);
    await this.saveSessionData(sessionId);
  }

  async logPhaseEnd(sessionId: string, phaseName: string, success: boolean, error?: string): Promise<void> {
    if (!this.enabled || !sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const phase = session.phases.find(p => p.name === phaseName && p.status === 'running');
    if (phase) {
      phase.endTime = new Date();
      phase.status = success ? 'completed' : 'failed';
      if (error) phase.error = error;
    }

    await this.saveSessionData(sessionId);
  }

  async logAPICall(
    sessionId: string,
    model: string,
    prompt: string,
    response: string,
    duration?: number,
    tokens?: { input: number; output: number },
    error?: string
  ): Promise<void> {
    if (!this.enabled || !sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const apiCall: APICall = {
      timestamp: new Date(),
      model,
      prompt,
      response,
      duration,
      tokens,
      error,
    };

    session.apiCalls.push(apiCall);

    // Save API call to separate file for easier review
    const apiCallPath = path.join(session.outputPath, 'api-calls', `${apiCall.timestamp.getTime()}.json`);
    await fs.ensureDir(path.dirname(apiCallPath));
    await fs.writeJson(apiCallPath, apiCall, { spaces: 2 });

    await this.saveSessionData(sessionId);
  }

  async logPrompt(
    sessionId: string,
    phase: string,
    template: string,
    variables: Record<string, any>,
    fullPrompt: string
  ): Promise<void> {
    if (!this.enabled || !sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const prompt: Prompt = {
      timestamp: new Date(),
      phase,
      template,
      variables,
      fullPrompt,
    };

    session.prompts.push(prompt);

    // Save prompt to separate file
    const promptPath = path.join(session.outputPath, 'prompts', `${phase}-${prompt.timestamp.getTime()}.txt`);
    await fs.ensureDir(path.dirname(promptPath));
    await fs.writeFile(promptPath, fullPrompt);

    await this.saveSessionData(sessionId);
  }

  async logGeneratedFile(
    sessionId: string,
    filePath: string,
    content: string,
    phase: string
  ): Promise<void> {
    if (!this.enabled || !sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const generatedFile: GeneratedFile = {
      path: filePath,
      content,
      timestamp: new Date(),
      phase,
    };

    session.generatedFiles.push(generatedFile);

    // Save generated file
    const genFilePath = path.join(session.outputPath, 'generated-files', phase, filePath);
    await fs.ensureDir(path.dirname(genFilePath));
    await fs.writeFile(genFilePath, content);

    await this.saveSessionData(sessionId);
  }

  async logBuildCommand(
    sessionId: string,
    command: string,
    output: string,
    exitCode: number,
    duration: number
  ): Promise<void> {
    if (!this.enabled || !sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const buildLog: BuildLog = {
      timestamp: new Date(),
      command,
      output,
      exitCode,
      duration,
    };

    session.buildLogs.push(buildLog);

    // Save build log
    const buildLogPath = path.join(session.outputPath, 'build-logs', `${buildLog.timestamp.getTime()}.log`);
    await fs.ensureDir(path.dirname(buildLogPath));
    await fs.writeFile(buildLogPath, `Command: ${command}\nExit Code: ${exitCode}\nDuration: ${duration}ms\n\nOutput:\n${output}`);

    await this.saveSessionData(sessionId);
  }

  async logTestResults(
    sessionId: string,
    testFile: string,
    results: {
      passed: number;
      failed: number;
      skipped: number;
      duration: number;
      failures?: Array<{ test: string; error: string }>;
    }
  ): Promise<void> {
    if (!this.enabled || !sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const testResult: TestResult = {
      timestamp: new Date(),
      testFile,
      ...results,
    };

    session.testResults.push(testResult);

    await this.saveSessionData(sessionId);
  }

  async endSession(sessionId: string, success: boolean, error?: string): Promise<void> {
    if (!this.enabled || !sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.endTime = new Date();
    session.success = success;
    if (error) session.error = error;

    // Generate summary report
    await this.generateSummaryReport(sessionId);

    // Save final session data
    await this.saveSessionData(sessionId);

    // Clean up session from memory
    this.sessions.delete(sessionId);
  }

  async logJob(sessionId: string, job: PluginCreationJob): Promise<void> {
    if (!this.enabled || !sessionId) return;

    const jobPath = path.join(this.sessions.get(sessionId)!.outputPath, 'job-snapshots', `${Date.now()}.json`);
    await fs.ensureDir(path.dirname(jobPath));
    await fs.writeJson(jobPath, {
      timestamp: new Date(),
      job: {
        id: job.id,
        status: job.status,
        currentPhase: job.currentPhase,
        progress: job.progress,
        error: job.error,
        logs: job.logs.slice(-50), // Last 50 log entries
      },
    }, { spaces: 2 });
  }

  private async saveSessionData(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const sessionDataPath = path.join(session.outputPath, 'session.json');
    await fs.writeJson(sessionDataPath, session, { spaces: 2 });
  }

  private async generateSummaryReport(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const duration = session.endTime ? 
      (session.endTime.getTime() - session.startTime.getTime()) / 1000 : 0;

    const summary = `
# Plugin Creation Debug Report

## Session Information
- **Session ID**: ${session.id}
- **Job ID**: ${session.jobId}
- **Start Time**: ${session.startTime.toISOString()}
- **End Time**: ${session.endTime?.toISOString() || 'N/A'}
- **Duration**: ${duration} seconds
- **Success**: ${session.success}
${session.error ? `- **Error**: ${session.error}` : ''}

## Plugin Specification
- **Name**: ${session.specification.name}
- **Description**: ${session.specification.description}
- **Version**: ${session.specification.version || '1.0.0'}
- **Actions**: ${session.specification.actions?.length || 0}
- **Providers**: ${session.specification.providers?.length || 0}
- **Services**: ${session.specification.services?.length || 0}
- **Evaluators**: ${session.specification.evaluators?.length || 0}

## Phases
${session.phases.map(phase => {
  const phaseDuration = phase.endTime ? 
    ((phase.endTime.getTime() - phase.startTime.getTime()) / 1000).toFixed(2) : 'N/A';
  return `
### ${phase.name}
- **Status**: ${phase.status}
- **Duration**: ${phaseDuration}s
${phase.error ? `- **Error**: ${phase.error}` : ''}
${phase.details ? `- **Details**: ${JSON.stringify(phase.details, null, 2)}` : ''}`;
}).join('\n')}

## API Calls
- **Total Calls**: ${session.apiCalls.length}
- **Total Tokens**: ${session.apiCalls.reduce((sum, call) => sum + (call.tokens?.input || 0) + (call.tokens?.output || 0), 0)}
- **Models Used**: ${[...new Set(session.apiCalls.map(c => c.model))].join(', ')}

## Generated Files
- **Total Files**: ${session.generatedFiles.length}
- **By Phase**:
${Object.entries(
  session.generatedFiles.reduce((acc, file) => {
    acc[file.phase] = (acc[file.phase] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)
).map(([phase, count]) => `  - ${phase}: ${count} files`).join('\n')}

## Build Results
- **Total Commands**: ${session.buildLogs.length}
- **Successful**: ${session.buildLogs.filter(b => b.exitCode === 0).length}
- **Failed**: ${session.buildLogs.filter(b => b.exitCode !== 0).length}

## Test Results
- **Total Test Runs**: ${session.testResults.length}
- **Total Passed**: ${session.testResults.reduce((sum, r) => sum + r.passed, 0)}
- **Total Failed**: ${session.testResults.reduce((sum, r) => sum + r.failed, 0)}
- **Total Skipped**: ${session.testResults.reduce((sum, r) => sum + r.skipped, 0)}

## File Structure
\`\`\`
${session.outputPath}/
├── session.json
├── summary.md
├── api-calls/
├── prompts/
├── generated-files/
├── build-logs/
├── job-snapshots/
└── test-results/
\`\`\`
`;

    const summaryPath = path.join(session.outputPath, 'summary.md');
    await fs.writeFile(summaryPath, summary.trim());
  }

  getSessionPath(sessionId: string): string | undefined {
    return this.sessions.get(sessionId)?.outputPath;
  }
} 