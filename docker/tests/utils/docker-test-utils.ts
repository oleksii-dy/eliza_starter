import { readdir, readFile } from 'fs/promises';
import path from 'path';

export interface DockerTestConfig {
  target: 'dev' | 'prod';
  timeout: number;
  retries: number;
  verbose: boolean;
}

export interface ContainerInfo {
  name: string;
  status: string;
  health: string;
  ports: string[];
}

export interface TestResult {
  success: boolean;
  message: string;
  duration: number;
  details?: any;
}

/**
 * Default test configuration
 */
export const DEFAULT_CONFIG: DockerTestConfig = {
  target: 'dev',
  timeout: 30000, // 30 seconds
  retries: 3,
  verbose: false
};

/**
 * Execute a shell command and return the result
 */
export async function execCommand(command: string, timeout = 10000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    // Split command into command and arguments
    const args = command.split(' ');
    const [cmd, ...cmdArgs] = args;
    
    // Use Bun.spawn for reliable command execution
    const proc = Bun.spawn([cmd, ...cmdArgs], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    
    const result = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    
    return {
      stdout,
      stderr,
      exitCode: result || 0
    };
  } catch (error: any) {
    // Handle command execution errors gracefully
    return {
      stdout: '',
      stderr: error.message || 'Command execution failed',
      exitCode: 1
    };
  }
}

/**
 * Check if Docker is available and running
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    const result = await execCommand('docker --version');
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Check if Docker Compose is available
 */
export async function isDockerComposeAvailable(): Promise<boolean> {
  try {
    const result = await execCommand('docker compose --version');
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Get list of running containers
 */
export async function getRunningContainers(): Promise<ContainerInfo[]> {
  try {
    const result = await execCommand('docker ps --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"');
    if (result.exitCode !== 0) {
      throw new Error(`Failed to get containers: ${result.stderr}`);
    }

    return result.stdout
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [name, status, ports] = line.split('\t');
        return {
          name: name || '',
          status: status || '',
          health: 'unknown',
          ports: ports ? ports.split(',').map(p => p.trim()) : []
        };
      });
  } catch (error) {
    throw new Error(`Failed to get running containers: ${error}`);
  }
}

/**
 * Check container health status
 */
export async function getContainerHealth(containerName: string): Promise<string> {
  try {
    const result = await execCommand(`docker inspect --format='{{.State.Health.Status}}' ${containerName}`);
    if (result.exitCode === 0) {
      return result.stdout.trim();
    }
    
    // Fallback to checking if container is running
    const statusResult = await execCommand(`docker inspect --format='{{.State.Status}}' ${containerName}`);
    return statusResult.exitCode === 0 ? statusResult.stdout.trim() : 'not-found';
  } catch {
    return 'not-found';
  }
}

/**
 * Wait for container to be healthy
 */
export async function waitForContainerHealth(
  containerName: string, 
  timeout = 30000,
  interval = 1000
): Promise<TestResult> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const health = await getContainerHealth(containerName);
      
      if (health === 'healthy' || health === 'running') {
        return {
          success: true,
          message: `Container ${containerName} is ${health}`,
          duration: Date.now() - startTime
        };
      }
      
      if (health === 'unhealthy') {
        return {
          success: false,
          message: `Container ${containerName} is unhealthy`,
          duration: Date.now() - startTime
        };
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      return {
        success: false,
        message: `Error checking container health: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }
  
  return {
    success: false,
    message: `Timeout waiting for container ${containerName} to be healthy`,
    duration: Date.now() - startTime
  };
}

/**
 * Get available Docker targets from the targets directory
 */
export async function getAvailableTargets(): Promise<string[]> {
  try {
    const targetsDir = path.join(process.cwd(), 'docker', 'targets');
    const entries = await readdir(targetsDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch {
    return [];
  }
}

/**
 * Check if a specific Docker target exists
 */
export async function targetExists(target: string): Promise<boolean> {
  try {
    const targetPath = path.join(process.cwd(), 'docker', 'targets', target, 'docker-compose.yml');
    await readFile(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean up any test containers and networks
 */
export async function cleanupTestContainers(): Promise<void> {
  try {
    // Stop and remove containers with test- prefix
    await execCommand('docker ps -q --filter "name=test-" | xargs docker stop 2>/dev/null || true');
    await execCommand('docker ps -aq --filter "name=test-" | xargs docker rm 2>/dev/null || true');
    
    // Remove test networks
    await execCommand('docker network ls -q --filter "name=test-" | xargs docker network rm 2>/dev/null || true');
  } catch {
    // Cleanup failures are non-critical
  }
}

/**
 * Create a test result with timing
 */
export function createTestResult(
  success: boolean, 
  message: string, 
  startTime: number, 
  details?: any
): TestResult {
  return {
    success,
    message,
    duration: Date.now() - startTime,
    details
  };
} 