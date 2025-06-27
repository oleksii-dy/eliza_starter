import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'bun:test';

describe('Environment Setup', () => {
  it('should verify configuration files exist', () => {
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'tsconfig.build.json',
      'build.config.ts',
      'bunfig.toml',
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('should have proper src directory structure', () => {
    const srcDir = path.join(process.cwd(), 'src');
    expect(fs.existsSync(srcDir)).toBe(true);

    const requiredSrcFiles = ['index.ts'];

    for (const file of requiredSrcFiles) {
      const filePath = path.join(srcDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('should have a valid package.json with required fields', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(packageJson).toHaveProperty('name');
    expect(packageJson).toHaveProperty('version');
    expect(packageJson).toHaveProperty('type', 'module');
    expect(packageJson).toHaveProperty('main');
    expect(packageJson).toHaveProperty('module');
    expect(packageJson).toHaveProperty('types');
    expect(packageJson).toHaveProperty('dependencies');
    expect(packageJson).toHaveProperty('devDependencies');
    expect(packageJson).toHaveProperty('scripts');

    // Check for required dependencies
    expect(packageJson.dependencies).toHaveProperty('@elizaos/core');

    // Check for required scripts
    expect(packageJson.scripts).toHaveProperty('build');
    expect(packageJson.scripts).toHaveProperty('test');
  });

  it('should have a valid tsconfig.json with required configuration', () => {
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);

    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    expect(tsconfig).toHaveProperty('extends');
    expect(tsconfig.extends).toContain('@elizaos/core');
    expect(tsconfig).toHaveProperty('compilerOptions');
    expect(tsconfig.compilerOptions).toHaveProperty('baseUrl');
  });

  it('should have a valid build.config.ts for building', () => {
    const buildConfigPath = path.join(process.cwd(), 'build.config.ts');
    expect(fs.existsSync(buildConfigPath)).toBe(true);

    const buildConfig = fs.readFileSync(buildConfigPath, 'utf8');
    expect(buildConfig).toContain('buildConfig');
    expect(buildConfig).toContain('entrypoints');
    expect(buildConfig).toContain('./src/index.ts');
  });

  it('should have a valid README.md file', () => {
    const readmePath = path.join(process.cwd(), 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);

    const readme = fs.readFileSync(readmePath, 'utf8');
    expect(readme).toContain('# Project Starter');
  });
});
