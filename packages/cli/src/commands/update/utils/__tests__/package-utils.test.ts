import { describe, it, expect } from 'bun:test';
import { isLocalVersion, isWorkspaceVersion, isFileVersion } from '../version-utils';

describe('version-utils', () => {
  describe('isFileVersion', () => {
    it('should return true for file: protocol dependencies', () => {
      expect(isFileVersion('file:../../../plugin-twitter')).toBe(true);
      expect(isFileVersion('file:./local-plugin')).toBe(true);
      expect(isFileVersion('file:/absolute/path/to/plugin')).toBe(true);
    });

    it('should return false for non-file dependencies', () => {
      expect(isFileVersion('1.0.0')).toBe(false);
      expect(isFileVersion('^2.0.0')).toBe(false);
      expect(isFileVersion('workspace:*')).toBe(false);
      expect(isFileVersion('latest')).toBe(false);
      expect(isFileVersion('github:user/repo')).toBe(false);
    });
  });

  describe('isWorkspaceVersion', () => {
    it('should return true for workspace: protocol dependencies', () => {
      expect(isWorkspaceVersion('workspace:*')).toBe(true);
      expect(isWorkspaceVersion('workspace')).toBe(true);
      expect(isWorkspaceVersion('workspace:^1.0.0')).toBe(true);
    });

    it('should return false for non-workspace dependencies', () => {
      expect(isWorkspaceVersion('1.0.0')).toBe(false);
      expect(isWorkspaceVersion('file:../plugin')).toBe(false);
      expect(isWorkspaceVersion('latest')).toBe(false);
    });
  });

  describe('isLocalVersion', () => {
    it('should return true for both file: and workspace: dependencies', () => {
      expect(isLocalVersion('file:../../../plugin-twitter')).toBe(true);
      expect(isLocalVersion('file:./local-plugin')).toBe(true);
      expect(isLocalVersion('workspace:*')).toBe(true);
      expect(isLocalVersion('workspace')).toBe(true);
      expect(isLocalVersion('workspace:^1.0.0')).toBe(true);
    });

    it('should return false for remote dependencies', () => {
      expect(isLocalVersion('1.0.0')).toBe(false);
      expect(isLocalVersion('^2.0.0')).toBe(false);
      expect(isLocalVersion('latest')).toBe(false);
      expect(isLocalVersion('github:user/repo')).toBe(false);
      expect(isLocalVersion('@elizaos/plugin-twitter')).toBe(false);
    });
  });
}); 