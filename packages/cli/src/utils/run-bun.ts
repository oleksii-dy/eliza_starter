import { spawn, type SpawnOptions } from 'child_process';
import { displayBunInstallationTipCompact } from './bun-installation-helper';

export interface BunExecutionOptions {
  cwd?: string;
  stdio?: 'inherit' | 'pipe' | 'ignore';
  env?: Record<string, string>;
  timeout?: number;
  silent?: boolean;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

/**
 * Executes a bun command using native spawn with promise interface
 * @param {string[]} args - The arguments to pass to the 'bun' command.
 * @param {string} cwd - The current working directory in which to run the command.
 * @param {BunExecutionOptions} options - Additional execution options.
 * @returns {Promise<void>} A Promise that resolves when the command has finished running.
 */
export async function runBunCommand(
  args: string[], 
  cwd: string = process.cwd(), 
  options: BunExecutionOptions = {}
): Promise<void> {
  const { 
    stdio = 'inherit', 
    env, 
    timeout, 
    silent = false, 
    onStdout, 
    onStderr 
  } = options;
  
  return new Promise<void>((resolve, reject) => {
    const spawnOptions: SpawnOptions = {
      cwd,
      stdio: (onStdout || onStderr || silent) ? 'pipe' : stdio,
      env: { ...process.env, ...env },
    };

    const child = spawn('bun', args, spawnOptions);

    if (onStdout && child.stdout) {
      child.stdout.on('data', (data) => onStdout(data.toString()));
    }

    if (onStderr && child.stderr) {
      child.stderr.on('data', (data) => onStderr(data.toString()));
    }

    // Handle timeout
    let timeoutId: NodeJS.Timeout | undefined;
    if (timeout) {
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Bun command timed out after ${timeout}ms`));
      }, timeout);
    }

    child.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Bun command exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      if ((error as any).code === 'ENOENT') {
        reject(new Error(`Bun command not found. ${displayBunInstallationTipCompact()}`));
      } else {
        reject(new Error(`Bun process error: ${error.message}`));
      }
    });
  });
}

// Note: ElizaOS now exclusively uses bun, so package manager abstractions have been removed

/**
 * Runs bun install in the specified directory with enhanced options.
 * @param {string} cwd - The directory in which to run bun install.
 * @param {BunExecutionOptions} options - Additional execution options.
 * @returns {Promise<void>} A Promise that resolves when the installation completes.
 */
export async function bunInstall(
  cwd: string = process.cwd(),
  options: BunExecutionOptions = {}
): Promise<void> {
  return runBunCommand(['install'], cwd, options);
}

/**
 * Runs bun add to install packages with enhanced options.
 * @param {string[]} packages - The packages to install.
 * @param {string} cwd - The directory in which to run the command.
 * @param {BunExecutionOptions & { dev?: boolean }} options - Installation options.
 * @returns {Promise<void>} A Promise that resolves when the installation completes.
 */
export async function bunAdd(
  packages: string[],
  cwd: string = process.cwd(),
  options: BunExecutionOptions & { dev?: boolean } = {}
): Promise<void> {
  const { dev = false, ...execOptions } = options;
  const args = dev ? ['add', '--dev', ...packages] : ['add', ...packages];
  return runBunCommand(args, cwd, execOptions);
}

/**
 * Runs bun remove to uninstall packages.
 * @param {string[]} packages - The packages to remove.
 * @param {string} cwd - The directory in which to run the command.
 * @param {BunExecutionOptions} options - Additional execution options.
 * @returns {Promise<void>} A Promise that resolves when the removal completes.
 */
export async function bunRemove(
  packages: string[],
  cwd: string = process.cwd(),
  options: BunExecutionOptions = {}
): Promise<void> {
  return runBunCommand(['remove', ...packages], cwd, options);
}

/**
 * Runs a package.json script using bun.
 * @param {string} scriptName - The name of the script to run.
 * @param {string} cwd - The directory in which to run the script.
 * @param {BunExecutionOptions} options - Additional execution options.
 * @returns {Promise<void>} A Promise that resolves when the script completes.
 */
export async function bunRunScript(
  scriptName: string,
  cwd: string = process.cwd(),
  options: BunExecutionOptions = {}
): Promise<void> {
  return runBunCommand(['run', scriptName], cwd, options);
}

/**
 * Runs bun build for TypeScript projects.
 * @param {string} cwd - The directory in which to run the build.
 * @param {BunExecutionOptions} options - Additional execution options.
 * @returns {Promise<void>} A Promise that resolves when the build completes.
 */
export async function bunBuild(
  cwd: string = process.cwd(),
  options: BunExecutionOptions = {}
): Promise<void> {
  return runBunCommand(['run', 'build'], cwd, options);
}

/**
 * Runs bun test in the specified directory.
 * @param {string} cwd - The directory in which to run tests.
 * @param {BunExecutionOptions} options - Additional execution options.
 * @returns {Promise<void>} A Promise that resolves when tests complete.
 */
export async function bunTest(
  cwd: string = process.cwd(),
  options: BunExecutionOptions = {}
): Promise<void> {
  return runBunCommand(['test'], cwd, options);
}
