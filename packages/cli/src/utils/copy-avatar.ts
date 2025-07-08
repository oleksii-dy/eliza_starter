import { join, resolve } from 'node:path';
import { mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * Copies elizaos-avatar.png from CLI dist into the project's frontend folder.
 */
export async function copyElizaAvatarToProject(projectTargetDir: string) {
    try {
      const avatarSourcePath = resolve(__dirname, './elizaos-avatar.png');
      
      if (!existsSync(avatarSourcePath)) {
        throw new Error(`Avatar source not found at ${avatarSourcePath}`);
      }
      
      const frontendTargetDir = join(projectTargetDir, 'src/frontend/avatars');
      const avatarTargetPath = join(frontendTargetDir, 'elizaos-avatar.png');
  
      if (!existsSync(frontendTargetDir)) {
        await mkdir(frontendTargetDir, { recursive: true });
      }
      await copyFile(avatarSourcePath, avatarTargetPath);
    } catch (error) {
      console.error('Failed to copy avatar:', error);
      throw error;
    }
  }
