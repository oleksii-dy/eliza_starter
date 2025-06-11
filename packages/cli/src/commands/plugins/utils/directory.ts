import { detectDirectoryType } from '@/src/utils/directory-detection';
import { getDependencies, PackageJsonError } from '@/src/utils/package-json';
import { logger } from '@elizaos/core';
import { Dependencies } from '../types';

/**
 * Helper function to get dependencies from package.json using directory detection
 */
export const getDependenciesFromDirectory = (cwd: string): Dependencies | null => {
  const directoryInfo = detectDirectoryType(cwd);

  if (!directoryInfo.hasPackageJson) {
    return null;
  }

  try {
    const deps = getDependencies(cwd);
    return deps.allDependencies;
  } catch (error) {
    if (error instanceof Error) {
      logger.warn(`Error reading package.json: ${error.message}`);
    }
    return null;
  }
};
