import { character as elizaCharacter } from '@/src/characters/eliza';
import { copyTemplate as copyTemplateUtil, buildProject } from '@/src/utils';
import { join } from 'path';
import fs from 'node:fs/promises';
import * as clack from '@clack/prompts';
import colors from 'yoctocolors';
import { processPluginName, validateTargetDirectory } from '../utils';
import { installDependencies, setupProjectEnvironment } from './setup';

/**
 * Creates a new plugin with the specified name and configuration.
 */
export async function createPlugin(
  pluginName: string,
  targetDir: string,
  isNonInteractive = false
): Promise<void> {
  // Process and validate the plugin name
  const nameResult = processPluginName(pluginName);
  if (!nameResult.isValid) {
    throw new Error(nameResult.error || 'Invalid plugin name');
  }

  const processedName = nameResult.processedName!;
  // Add prefix to ensure plugin directory name follows convention
  const pluginDirName = processedName.startsWith('plugin-')
    ? processedName
    : `plugin-${processedName}`;
  const pluginTargetDir = join(targetDir, pluginDirName);

  // Validate target directory
  const dirResult = await validateTargetDirectory(pluginTargetDir);
  if (!dirResult.isValid) {
    throw new Error(dirResult.error || 'Invalid target directory');
  }

  if (!isNonInteractive) {
    const confirmCreate = await clack.confirm({
      message: `Create plugin "${colors.cyan(pluginDirName)}" with template in new dir ${colors.dim(pluginTargetDir)}?`,
    });

    if (clack.isCancel(confirmCreate) || !confirmCreate) {
      clack.cancel('Plugin creation cancelled.');
      process.exit(0);
    }
  }

  // Copy plugin template
  await copyTemplateUtil('plugin', pluginTargetDir, pluginDirName);

  // Install dependencies
  await installDependencies(pluginTargetDir);

  console.info(`\n${colors.green('✓')} Plugin "${pluginDirName}" created successfully!`);
  console.info(`\nNext steps:`);
  console.info(`  cd ${pluginTargetDir}`);
  console.info(`  bun run build`);
  console.info(`  elizaos start\n`);
}


/**
 * Creates a new TEE project with the specified name and configuration.
 */
export async function createTEEProject(
  projectName: string,
  targetDir: string,
  database: string,
  aiModel: string,
  isNonInteractive = false
): Promise<void> {
  const teeTargetDir = join(targetDir, projectName);

  // Validate target directory
  const dirResult = await validateTargetDirectory(teeTargetDir);
  if (!dirResult.isValid) {
    throw new Error(dirResult.error || 'Invalid target directory');
  }

  if (!isNonInteractive) {
    const confirmCreate = await clack.confirm({
      message: `Create TEE project "${colors.cyan(projectName)}" with ${database} + ${aiModel} in new dir ${colors.dim(teeTargetDir)}?`,
    });

    if (clack.isCancel(confirmCreate) || !confirmCreate) {
      clack.cancel('TEE project creation cancelled.');
      process.exit(0);
    }
  }

  // Copy TEE template
  await copyTemplateUtil('project-tee-starter', teeTargetDir, projectName);

  // Set up project environment
  await setupProjectEnvironment(teeTargetDir, database, aiModel, isNonInteractive);

  // Install dependencies
  await installDependencies(teeTargetDir);

  // Build the project
  await buildProject(teeTargetDir);

  console.info(`\n${colors.green('✓')} TEE project "${projectName}" created successfully!`);
  console.info(`\nNext steps:`);
  console.info(`  cd ${teeTargetDir}`);
  console.info(`  bun run build`);
  console.info(`  elizaos start\n`);
}

/**
 * Creates a new regular project with the specified name and configuration.
 */
export async function createProject(
  projectName: string,
  targetDir: string,
  database: string,
  aiModel: string,
  isNonInteractive = false
): Promise<void> {
  // Handle current directory case
  const projectTargetDir = projectName === '.' ? targetDir : join(targetDir, projectName);

  // Validate target directory
  const dirResult = await validateTargetDirectory(projectTargetDir);
  if (!dirResult.isValid) {
    throw new Error(dirResult.error || 'Invalid target directory');
  }

  if (!isNonInteractive) {
    const confirmCreate = await clack.confirm({
      message: `Create project "${colors.cyan(projectName === '.' ? 'in current directory' : projectName)}" with ${database} + ${aiModel} in new dir ${colors.dim(projectTargetDir)}?`,
    });

    if (clack.isCancel(confirmCreate) || !confirmCreate) {
      clack.cancel('Project creation cancelled.');
      process.exit(0);
    }
  }

  // Copy project template
  // For current directory projects, use the directory name as the project name
  const templateName =
    projectName === '.' ? targetDir.split('/').pop() || 'eliza-project' : projectName;
  await copyTemplateUtil('project-starter', projectTargetDir, templateName);

  // Set up project environment
  await setupProjectEnvironment(projectTargetDir, database, aiModel, isNonInteractive);

  // Install dependencies
  await installDependencies(projectTargetDir);

  // Build the project
  await buildProject(projectTargetDir);

  const displayName = projectName === '.' ? 'Project' : `Project "${projectName}"`;
  console.info(`\n${colors.green('✓')} ${displayName} created successfully!`);
  console.info(`\nNext steps:`);
  console.info(`  cd ${projectTargetDir}`);
  console.info(`  bun run build`);
  console.info(`  elizaos start\n`);
}
