import type { PackageJson } from 'type-fest';
import { UserEnvironment } from './user-environment';

/**
 * Get the current version of a package from the monorepo
 */
/**
 * Retrieves the version of a specified package.
 *
 * @param {string} packageName - The name of the package to retrieve the version for.
 * @returns {Promise<string>} A promise that resolves with the version of the package.
 */
export async function getPackageVersion(packageName: string): Promise<string> {
  return UserEnvironment.getInstance().getPackageVersion(packageName);
}

/**
 * Check if we're inside a monorepo
 */
export async function isMonorepoContext(): Promise<boolean> {
  const { monorepoRoot } = await UserEnvironment.getInstance().getPathInfo();
  return monorepoRoot !== null;
}

/**
 * Get local packages available in the monorepo
 */
export async function getLocalPackages(): Promise<string[]> {
  return UserEnvironment.getInstance().getLocalPackages();
}

export async function getPackageInfo(): Promise<PackageJson> {
  const { packageJsonPath } = await UserEnvironment.getInstance().getPathInfo();
  return JSON.parse(
    await import('node:fs/promises').then((fs) => fs.readFile(packageJsonPath, 'utf8'))
  ) as PackageJson;
}
