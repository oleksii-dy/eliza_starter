import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Environment Setup', () => {
    it('should verify configuration files exist', () => {
        const requiredFiles = [
            'package.json',
            'tsconfig.json',
            'tsconfig.build.json',
            'tsup.config.ts',
            'vitest.config.ts',
        ];

        for (const file of requiredFiles) {
            const filePath = path.join(process.cwd(), file);
            expect(fs.existsSync(filePath)).toBe(true);
        }
    });

    it('should have proper src directory structure', () => {
        const srcDir = path.join(process.cwd(), 'src');
        expect(fs.existsSync(srcDir)).toBe(true);

        const requiredSrcFiles = ['index.ts', 'plugin.ts'];

        for (const file of requiredSrcFiles) {
            const filePath = path.join(srcDir, file);
            expect(fs.existsSync(filePath)).toBe(true);
        }
    });

    it('should have a valid package.json with required fields', () => {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        expect(fs.existsSync(packageJsonPath)).toBe(true);

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        expect(packageJson).toHaveProperty('name', '@elizaos/plugin-alethea');
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
        expect(packageJson.dependencies).toHaveProperty('zod');
        expect(packageJson.dependencies).toHaveProperty('ethers');

        // Check for required dev dependencies
        expect(packageJson.devDependencies).toHaveProperty('vitest');
        expect(packageJson.devDependencies).toHaveProperty('typescript');
        expect(packageJson.devDependencies).toHaveProperty('@types/node');

        // Check for required scripts
        expect(packageJson.scripts).toHaveProperty('build');
        expect(packageJson.scripts).toHaveProperty('test');
        expect(packageJson.scripts).toHaveProperty('test:component');
        expect(packageJson.scripts).toHaveProperty('test:e2e');
    });

    it('should have proper TypeScript configuration', () => {
        const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
        const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));

        // Check essential compiler options
        expect(tsConfig).toHaveProperty('compilerOptions');
        expect(tsConfig.compilerOptions).toHaveProperty('target');
        expect(tsConfig.compilerOptions).toHaveProperty('module');

        // Check include patterns
        expect(tsConfig).toHaveProperty('include');
        expect(Array.isArray(tsConfig.include)).toBe(true);
    });

    it('should have proper build TypeScript configuration', () => {
        const tsBuildConfigPath = path.join(process.cwd(), 'tsconfig.build.json');
        const tsBuildConfig = JSON.parse(fs.readFileSync(tsBuildConfigPath, 'utf8'));

        // Check that it extends the base tsconfig
        expect(tsBuildConfig).toHaveProperty('extends');
        expect(tsBuildConfig.extends).toBe('./tsconfig.json');

        // Check compiler options
        expect(tsBuildConfig).toHaveProperty('compilerOptions');
        expect(tsBuildConfig.compilerOptions).toHaveProperty('declaration', true);
    });

    it('should have proper TSUP configuration', () => {
        const tsupConfigPath = path.join(process.cwd(), 'tsup.config.ts');
        expect(fs.existsSync(tsupConfigPath)).toBe(true);

        const tsupConfigContent = fs.readFileSync(tsupConfigPath, 'utf8');
        expect(tsupConfigContent).toContain('defineConfig');
        expect(tsupConfigContent).toContain('src/index.ts');
        expect(tsupConfigContent).toContain('dist');
    });

    it('should have proper vitest configuration', () => {
        const vitestConfigPath = path.join(process.cwd(), 'vitest.config.ts');
        expect(fs.existsSync(vitestConfigPath)).toBe(true);

        const vitestConfigContent = fs.readFileSync(vitestConfigPath, 'utf8');
        expect(vitestConfigContent).toContain('defineConfig');
        expect(vitestConfigContent).toContain('node');
    });

    it('should have README.md with proper content', () => {
        const readmePath = path.join(process.cwd(), 'README.md');
        expect(fs.existsSync(readmePath)).toBe(true);

        const readmeContent = fs.readFileSync(readmePath, 'utf8');
        expect(readmeContent).toContain('Alethea AI Plugin');
        expect(readmeContent).toContain('@elizaos/plugin-alethea');
        expect(readmeContent).toContain('Configuration');
        expect(readmeContent).toContain('ALETHEA_RPC_URL');
        expect(readmeContent).toContain('PRIVATE_KEY');
        expect(readmeContent).toContain('ALETHEA_API_KEY');
    });

    it('should have proper ESLint configuration', () => {
        const eslintConfigPath = path.join(process.cwd(), '.eslintrc.cjs');
        expect(fs.existsSync(eslintConfigPath)).toBe(true);

        const eslintConfigContent = fs.readFileSync(eslintConfigPath, 'utf8');
        expect(eslintConfigContent).toContain('@typescript-eslint');
        expect(eslintConfigContent).toContain('prettier');
    });

    it('should have proper Prettier configuration', () => {
        const prettierConfigPath = path.join(process.cwd(), '.prettierrc.cjs');
        expect(fs.existsSync(prettierConfigPath)).toBe(true);

        const prettierConfigContent = fs.readFileSync(prettierConfigPath, 'utf8');
        expect(prettierConfigContent).toContain('singleQuote');
        expect(prettierConfigContent).toContain('printWidth');
    });
});