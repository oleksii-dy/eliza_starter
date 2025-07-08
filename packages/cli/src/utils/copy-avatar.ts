import { join, resolve } from 'node:path';
import { mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * Copies elizaos-avatar.png from CLI dist into the project's frontend folder.
 */
export async function copyElizaAvatarToProject(projectTargetDir: string) {
  const avatarSourcePath = resolve(__dirname, '../dist/elizaos-avatar.png');
  const frontendTargetDir = join(projectTargetDir, 'src/frontend/avatars');
  const avatarTargetPath = join(frontendTargetDir, 'elizaos-avatar.png');

  if (!existsSync(frontendTargetDir)) {
    await mkdir(frontendTargetDir, { recursive: true });
  }
  await copyFile(avatarSourcePath, avatarTargetPath);
}
