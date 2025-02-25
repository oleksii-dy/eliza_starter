import fs from 'fs';
import path from 'path';

/**
 * Logger utility for Darssi Plugin
 */

// Use process.cwd() to get absolute path to the root directory
const logFilePath = path.join(process.cwd(), 'agent_logs.txt');

export const logger = {
  log: (message: string) => writeToFile("INFO", message),
  error: (message: string) => writeToFile("ERROR", message),
  debug: (message: string) => writeToFile("DEBUG", message),
  warn: (message: string) => writeToFile("WARN", message)
};

function writeToFile(level: string, message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level}: ${message}\n`;

  // Console log for verification
  console.log(`Logger wrote: ${logMessage}`);

  try {
    fs.appendFileSync(logFilePath, logMessage, 'utf8');
  } catch (writeError) {
    console.error("Failed to write to log file:", writeError);
  }
}
