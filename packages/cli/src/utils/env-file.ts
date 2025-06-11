import * as fs from 'fs';
import * as path from 'path';

export interface EnvVariable {
  key: string;
  value: string;
  comment?: string;
}

export interface EnvFileOptions {
  createIfMissing?: boolean;
  backup?: boolean;
}

export class EnvFileError extends Error {
  constructor(message: string, public readonly filePath: string) {
    super(message);
    this.name = 'EnvFileError';
  }
}

/**
 * Gets the path to the .env file in the specified directory
 */
export function getEnvFilePath(cwd: string = process.cwd()): string {
  return path.join(cwd, '.env');
}

/**
 * Checks if a .env file exists in the specified directory
 */
export function envFileExists(cwd: string = process.cwd()): boolean {
  const envPath = getEnvFilePath(cwd);
  return fs.existsSync(envPath);
}

/**
 * Reads the .env file content as a string
 */
export function readEnvFileContent(cwd: string = process.cwd()): string {
  const envPath = getEnvFilePath(cwd);
  
  try {
    return fs.readFileSync(envPath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return '';
    }
    throw new EnvFileError(
      `Failed to read .env file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      envPath
    );
  }
}

/**
 * Reads and parses the .env file into a key-value object
 */
export function readEnvFile(cwd: string = process.cwd()): Record<string, string> {
  const content = readEnvFileContent(cwd);
  return parseEnvContent(content);
}

/**
 * Reads and parses the .env file into an array of EnvVariable objects with comments
 */
export function readEnvFileDetailed(cwd: string = process.cwd()): EnvVariable[] {
  const content = readEnvFileContent(cwd);
  return parseEnvContentDetailed(content);
}

/**
 * Parses environment file content into a key-value object
 */
export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex > 0) {
      const key = trimmedLine.substring(0, separatorIndex).trim();
      let value = trimmedLine.substring(separatorIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      result[key] = value;
    }
  }

  return result;
}

/**
 * Parses environment file content into detailed EnvVariable objects
 */
export function parseEnvContentDetailed(content: string): EnvVariable[] {
  const result: EnvVariable[] = [];
  const lines = content.split('\n');
  let currentComment: string | undefined;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Handle comments
    if (trimmedLine.startsWith('#')) {
      currentComment = trimmedLine.substring(1).trim();
      continue;
    }
    
    // Skip empty lines
    if (!trimmedLine) {
      currentComment = undefined;
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex > 0) {
      const key = trimmedLine.substring(0, separatorIndex).trim();
      let value = trimmedLine.substring(separatorIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      result.push({
        key,
        value,
        comment: currentComment
      });
      
      currentComment = undefined;
    }
  }

  return result;
}

/**
 * Writes content to the .env file
 */
export function writeEnvFileContent(
  content: string, 
  cwd: string = process.cwd(), 
  options: EnvFileOptions = {}
): void {
  const envPath = getEnvFilePath(cwd);
  const { backup = false } = options;
  
  try {
    // Create backup if requested and file exists
    if (backup && fs.existsSync(envPath)) {
      const backupPath = `${envPath}.backup.${Date.now()}`;
      fs.copyFileSync(envPath, backupPath);
    }
    
    fs.writeFileSync(envPath, content, 'utf-8');
  } catch (error) {
    throw new EnvFileError(
      `Failed to write .env file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      envPath
    );
  }
}

/**
 * Writes environment variables to the .env file
 */
export function writeEnvFile(
  variables: Record<string, string>, 
  cwd: string = process.cwd(), 
  options: EnvFileOptions = {}
): void {
  const content = Object.entries(variables)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  writeEnvFileContent(content, cwd, options);
}

/**
 * Writes detailed environment variables to the .env file with comments
 */
export function writeEnvFileDetailed(
  variables: EnvVariable[], 
  cwd: string = process.cwd(), 
  options: EnvFileOptions = {}
): void {
  const lines: string[] = [];
  
  for (const variable of variables) {
    if (variable.comment) {
      lines.push(`# ${variable.comment}`);
    }
    lines.push(`${variable.key}=${variable.value}`);
  }
  
  const content = lines.join('\n');
  writeEnvFileContent(content, cwd, options);
}

/**
 * Updates or adds a single environment variable
 */
export function updateEnvVariable(
  key: string, 
  value: string, 
  cwd: string = process.cwd(), 
  options: EnvFileOptions = {}
): void {
  const envPath = getEnvFilePath(cwd);
  const { createIfMissing = true } = options;
  
  if (!fs.existsSync(envPath) && !createIfMissing) {
    throw new EnvFileError('Environment file does not exist and createIfMissing is false', envPath);
  }
  
  const content = readEnvFileContent(cwd);
  const lines = content.split('\n');
  
  // Check if the variable already exists
  const existingLineIndex = lines.findIndex((line) => {
    const trimmedLine = line.trim();
    return trimmedLine.startsWith(`${key}=`);
  });
  
  if (existingLineIndex >= 0) {
    // Update existing line
    lines[existingLineIndex] = `${key}=${value}`;
  } else {
    // Add new line
    if (content && !content.endsWith('\n')) {
      lines.push(''); // Add empty line if file doesn't end with newline
    }
    lines.push(`${key}=${value}`);
  }
  
  writeEnvFileContent(lines.join('\n'), cwd, options);
}

/**
 * Updates multiple environment variables
 */
export function updateEnvVariables(
  variables: Record<string, string>, 
  cwd: string = process.cwd(), 
  options: EnvFileOptions = {}
): void {
  const envPath = getEnvFilePath(cwd);
  const { createIfMissing = true } = options;
  
  if (!fs.existsSync(envPath) && !createIfMissing) {
    throw new EnvFileError('Environment file does not exist and createIfMissing is false', envPath);
  }
  
  const content = readEnvFileContent(cwd);
  let lines = content.split('\n');
  
  for (const [key, value] of Object.entries(variables)) {
    // Check if the variable already exists
    const existingLineIndex = lines.findIndex((line) => {
      const trimmedLine = line.trim();
      return trimmedLine.startsWith(`${key}=`);
    });
    
    if (existingLineIndex >= 0) {
      // Update existing line
      lines[existingLineIndex] = `${key}=${value}`;
    } else {
      // Add new line
      lines.push(`${key}=${value}`);
    }
  }
  
  writeEnvFileContent(lines.join('\n'), cwd, options);
}

/**
 * Removes an environment variable from the .env file
 */
export function removeEnvVariable(
  key: string, 
  cwd: string = process.cwd(), 
  options: EnvFileOptions = {}
): boolean {
  const envPath = getEnvFilePath(cwd);
  
  if (!fs.existsSync(envPath)) {
    return false;
  }
  
  const content = readEnvFileContent(cwd);
  const lines = content.split('\n');
  
  const filteredLines = lines.filter((line) => {
    const trimmedLine = line.trim();
    return !trimmedLine.startsWith(`${key}=`);
  });
  
  if (filteredLines.length !== lines.length) {
    writeEnvFileContent(filteredLines.join('\n'), cwd, options);
    return true;
  }
  
  return false;
}

/**
 * Checks if an environment variable exists in the .env file
 */
export function hasEnvVariable(key: string, cwd: string = process.cwd()): boolean {
  const variables = readEnvFile(cwd);
  return key in variables;
}

/**
 * Gets the value of an environment variable from the .env file
 */
export function getEnvVariable(key: string, cwd: string = process.cwd()): string | undefined {
  const variables = readEnvFile(cwd);
  return variables[key];
}

/**
 * Creates a .env file with initial content if it doesn't exist
 */
export function createEnvFile(
  initialVariables: Record<string, string> = {}, 
  cwd: string = process.cwd()
): void {
  const envPath = getEnvFilePath(cwd);
  
  if (fs.existsSync(envPath)) {
    throw new EnvFileError('Environment file already exists', envPath);
  }
  
  writeEnvFile(initialVariables, cwd);
}

/**
 * Merges environment variables from multiple sources
 */
export function mergeEnvVariables(
  ...sources: Record<string, string>[]
): Record<string, string> {
  return Object.assign({}, ...sources);
}

/**
 * Validates environment variable names
 */
export function validateEnvVariableName(name: string): { isValid: boolean; error?: string } {
  if (!name) {
    return { isValid: false, error: 'Environment variable name cannot be empty' };
  }
  
  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
    return { 
      isValid: false, 
      error: 'Environment variable name must start with a letter and contain only uppercase letters, numbers, and underscores' 
    };
  }
  
  return { isValid: true };
}

/**
 * Gets environment variables from both process.env and .env file, with .env taking precedence
 */
export function getAllEnvVariables(cwd: string = process.cwd()): Record<string, string> {
  const processEnv = { ...process.env };
  const fileEnv = readEnvFile(cwd);
  
  // Remove undefined values from process.env
  const cleanProcessEnv = Object.fromEntries(
    Object.entries(processEnv).filter(([, value]) => value !== undefined)
  ) as Record<string, string>;
  
  return mergeEnvVariables(cleanProcessEnv, fileEnv);
}