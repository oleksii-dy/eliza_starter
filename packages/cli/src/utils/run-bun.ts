import { execa, type Options as ExecaOptions } from 'execa';
import { spawn, type SpawnOptions } from 'child_process';
import which from 'which';
import { displayBunInstallationTipCompact } from './bun-installation-helper';

export interface ProcessExecutionOptions {
  cwd?: string;
  stdio?: 'inherit' | 'pipe' | 'ignore';
  env?: Record<string, string>;
  timeout?: number;
  silent?: boolean;
}

export interface SpawnProcessOptions extends ProcessExecutionOptions {
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

/**
 * Asynchronously runs a 'bun' command with the provided arguments in the specified directory.
 * @param {string[]} args - The arguments to pass to the 'bun' command.
 * @param {string} cwd - The current working directory in which to run the command.
 * @param {ProcessExecutionOptions} options - Additional execution options.
 * @returns {Promise<void>} A Promise that resolves when the command has finished running.
 */
export async function runBunCommand(
  args: string[], 
  cwd: string = process.cwd(), 
  options: ProcessExecutionOptions = {}
): Promise<void> {
  const { stdio = 'inherit', env, timeout, silent = false } = options;
  
  try {
    const execaOptions: ExecaOptions = {
      cwd,
      stdio: silent ? 'pipe' : stdio,
      env: { ...process.env, ...env },
      ...(timeout && { timeout })
    };

    await execa('bun', args, execaOptions);
  } catch (error: any) {
    if (error.code === 'ENOENT' || error.message?.includes('bun: command not found')) {
      throw new Error(`Bun command not found. ${displayBunInstallationTipCompact()}`);
    }
    throw error;
  }
}

/**
 * Runs a package manager command with the specified arguments.
 * @param {string} packageManager - The package manager to use ('bun', 'npm', 'yarn', 'pnpm').
 * @param {string[]} args - The arguments to pass to the package manager.
 * @param {string} cwd - The current working directory in which to run the command.
 * @param {ProcessExecutionOptions} options - Additional execution options.
 * @returns {Promise<void>} A Promise that resolves when the command has finished running.
 */
export async function runPackageManagerCommand(
  packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm',
  args: string[],
  cwd: string = process.cwd(),
  options: ProcessExecutionOptions = {}
): Promise<void> {
  const { stdio = 'inherit', env, timeout, silent = false } = options;
  
  try {
    const execaOptions: ExecaOptions = {
      cwd,
      stdio: silent ? 'pipe' : stdio,
      env: { ...process.env, ...env },
      ...(timeout && { timeout })
    };

    await execa(packageManager, args, execaOptions);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`${packageManager} command not found. Please install ${packageManager}.`);
    }
    throw error;
  }
}

/**
 * Spawns a process with promise-based interface and enhanced error handling.
 * @param {string} command - The command to execute.
 * @param {string[]} args - The arguments to pass to the command.
 * @param {SpawnProcessOptions} options - Spawn options with additional callbacks.
 * @returns {Promise<void>} A Promise that resolves when the process exits successfully.
 */
export async function spawnProcess(
  command: string,
  args: string[],
  options: SpawnProcessOptions = {}
): Promise<void> {
  const { cwd = process.cwd(), stdio = 'inherit', env, onStdout, onStderr } = options;

  try {
    // Check if command exists
    await which(command);
  } catch {
    throw new Error(`Command '${command}' not found. Please ensure it is installed and in your PATH.`);
  }

  return new Promise<void>((resolve, reject) => {
    const spawnOptions: SpawnOptions = {
      cwd,
      stdio: onStdout || onStderr ? 'pipe' : stdio,
      env: { ...process.env, ...env },
    };

    const child = spawn(command, args, spawnOptions);

    if (onStdout && child.stdout) {
      child.stdout.on('data', (data) => onStdout(data.toString()));
    }

    if (onStderr && child.stderr) {
      child.stderr.on('data', (data) => onStderr(data.toString()));
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(new Error(`Process error: ${error.message}`));
    });
  });
}

/**
 * Runs bun install in the specified directory with enhanced options.
 * @param {string} cwd - The directory in which to run bun install.
 * @param {ProcessExecutionOptions} options - Additional execution options.
 * @returns {Promise<void>} A Promise that resolves when the installation completes.
 */
export async function bunInstall(
  cwd: string = process.cwd(),
  options: ProcessExecutionOptions = {}
): Promise<void> {
  return runBunCommand(['install'], cwd, options);
}

/**
 * Runs bun add to install packages with enhanced options.
 * @param {string[]} packages - The packages to install.
 * @param {string} cwd - The directory in which to run the command.
 * @param {ProcessExecutionOptions & { dev?: boolean }} options - Installation options.
 * @returns {Promise<void>} A Promise that resolves when the installation completes.
 */
export async function bunAdd(
  packages: string[],
  cwd: string = process.cwd(),
  options: ProcessExecutionOptions & { dev?: boolean } = {}
): Promise<void> {
  const { dev = false, ...execOptions } = options;
  const args = dev ? ['add', '--dev', ...packages] : ['add', ...packages];
  return runBunCommand(args, cwd, execOptions);
}

/**
 * Runs bun remove to uninstall packages.
 * @param {string[]} packages - The packages to remove.
 * @param {string} cwd - The directory in which to run the command.
 * @param {ProcessExecutionOptions} options - Additional execution options.
 * @returns {Promise<void>} A Promise that resolves when the removal completes.
 */
export async function bunRemove(
  packages: string[],
  cwd: string = process.cwd(),
  options: ProcessExecutionOptions = {}
): Promise<void> {
  return runBunCommand(['remove', ...packages], cwd, options);
}

/**
 * Runs a package.json script using bun.
 * @param {string} scriptName - The name of the script to run.
 * @param {string} cwd - The directory in which to run the script.
 * @param {ProcessExecutionOptions} options - Additional execution options.
 * @returns {Promise<void>} A Promise that resolves when the script completes.
 */
export async function bunRunScript(
  scriptName: string,
  cwd: string = process.cwd(),
  options: ProcessExecutionOptions = {}
): Promise<void> {
  return runBunCommand(['run', scriptName], cwd, options);
}

/**
 * Executes a command with progress reporting and enhanced error handling.
 * @param {string} command - The command to execute.
 * @param {string[]} args - The arguments to pass to the command.
 * @param {SpawnProcessOptions} options - Execution options.
 * @returns {Promise<void>} A Promise that resolves when the command completes successfully.
 */
export async function execWithProgress(
  command: string,
  args: string[],
  options: SpawnProcessOptions = {}
): Promise<void> {
  return spawnProcess(command, args, options);
}
