import * as fs from 'fs';
import * as path from 'path';
import type { PackageJson as BasePackageJson } from 'type-fest';

export interface ElizaAgentConfig {
    pluginType: string;
    pluginParameters?: Record<string, {
        type: string;
        description: string;
        required?: boolean;
        default?: any;
        sensitive?: boolean;
    }>;
}

export interface ElizaPackageJson extends BasePackageJson {
    agentConfig?: ElizaAgentConfig;
    eliza?: {
        type?: string;
        version?: string;
    };
    packageType?: 'plugin' | 'project';
}

export type PackageJson = ElizaPackageJson;

export interface PackageDependencies {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    peerDependencies: Record<string, string>;
    allDependencies: Record<string, string>;
}

export class PackageJsonError extends Error {
    constructor(message: string, public readonly filePath: string) {
        super(message);
        this.name = 'PackageJsonError';
    }
}

export function readPackageJson(cwd: string): PackageJson {
    const packageJsonPath = path.join(cwd, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
        throw new PackageJsonError(`package.json not found in ${cwd}`, packageJsonPath);
    }

    try {
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
        return JSON.parse(packageJsonContent);
    } catch (error) {
        throw new PackageJsonError(
            `Failed to read or parse package.json: ${error instanceof Error ? error.message : 'Unknown error'}`,
            packageJsonPath
        );
    }
}

export async function readPackageJsonAsync(cwd: string): Promise<PackageJson> {
    const packageJsonPath = path.join(cwd, 'package.json');
    
    try {
        await fs.promises.access(packageJsonPath);
        const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf-8');
        return JSON.parse(packageJsonContent);
    } catch (error) {
        throw new PackageJsonError(
            `Failed to read or parse package.json: ${error instanceof Error ? error.message : 'Unknown error'}`,
            packageJsonPath
        );
    }
}

export function writePackageJson(cwd: string, packageJson: PackageJson): void {
    const packageJsonPath = path.join(cwd, 'package.json');
    
    try {
        const content = JSON.stringify(packageJson, null, 2);
        fs.writeFileSync(packageJsonPath, content, 'utf-8');
    } catch (error) {
        throw new PackageJsonError(
            `Failed to write package.json: ${error instanceof Error ? error.message : 'Unknown error'}`,
            packageJsonPath
        );
    }
}

export async function writePackageJsonAsync(cwd: string, packageJson: PackageJson): Promise<void> {
    const packageJsonPath = path.join(cwd, 'package.json');
    
    try {
        const content = JSON.stringify(packageJson, null, 2);
        await fs.promises.writeFile(packageJsonPath, content, 'utf-8');
    } catch (error) {
        throw new PackageJsonError(
            `Failed to write package.json: ${error instanceof Error ? error.message : 'Unknown error'}`,
            packageJsonPath
        );
    }
}

export function getDependencies(cwd: string): PackageDependencies {
    const packageJson = readPackageJson(cwd);
    
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    const peerDependencies = packageJson.peerDependencies || {};
    
    return {
        dependencies,
        devDependencies,
        peerDependencies,
        allDependencies: { ...dependencies, ...devDependencies, ...peerDependencies }
    };
}

export function addDependency(cwd: string, packageName: string, version: string, isDev = false): void {
    const packageJson = readPackageJson(cwd);
    
    if (isDev) {
        packageJson.devDependencies = packageJson.devDependencies || {};
        packageJson.devDependencies[packageName] = version;
    } else {
        packageJson.dependencies = packageJson.dependencies || {};
        packageJson.dependencies[packageName] = version;
    }
    
    writePackageJson(cwd, packageJson);
}

export function removeDependency(cwd: string, packageName: string): void {
    const packageJson = readPackageJson(cwd);
    
    if (packageJson.dependencies?.[packageName]) {
        delete packageJson.dependencies[packageName];
    }
    
    if (packageJson.devDependencies?.[packageName]) {
        delete packageJson.devDependencies[packageName];
    }
    
    if (packageJson.peerDependencies?.[packageName]) {
        delete packageJson.peerDependencies[packageName];
    }
    
    writePackageJson(cwd, packageJson);
}

export function hasScript(cwd: string, scriptName: string): boolean {
    const packageJson = readPackageJson(cwd);
    return !!(packageJson.scripts && packageJson.scripts[scriptName]);
}

export function getScript(cwd: string, scriptName: string): string | undefined {
    const packageJson = readPackageJson(cwd);
    return packageJson.scripts?.[scriptName];
}

export function addScript(cwd: string, scriptName: string, command: string): void {
    const packageJson = readPackageJson(cwd);
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts[scriptName] = command;
    writePackageJson(cwd, packageJson);
}

export function removeScript(cwd: string, scriptName: string): void {
    const packageJson = readPackageJson(cwd);
    if (packageJson.scripts?.[scriptName]) {
        delete packageJson.scripts[scriptName];
        writePackageJson(cwd, packageJson);
    }
}

export function validatePackageJson(packageJson: PackageJson): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!packageJson.name) {
        errors.push('Package name is required');
    } else if (typeof packageJson.name !== 'string') {
        errors.push('Package name must be a string');
    }
    
    if (!packageJson.version) {
        errors.push('Package version is required');
    } else if (typeof packageJson.version !== 'string') {
        errors.push('Package version must be a string');
    }
    
    if (packageJson.scripts && typeof packageJson.scripts !== 'object') {
        errors.push('Scripts must be an object');
    }
    
    if (packageJson.dependencies && typeof packageJson.dependencies !== 'object') {
        errors.push('Dependencies must be an object');
    }
    
    if (packageJson.devDependencies && typeof packageJson.devDependencies !== 'object') {
        errors.push('DevDependencies must be an object');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

export function packageJsonExists(cwd: string): boolean {
    const packageJsonPath = path.join(cwd, 'package.json');
    return fs.existsSync(packageJsonPath);
}

export function getPackageJsonPath(cwd: string): string {
    return path.join(cwd, 'package.json');
}

export function isDependencyInstalled(cwd: string, packageName: string): boolean {
    const deps = getDependencies(cwd);
    return packageName in deps.allDependencies;
}

export function getPackageName(cwd: string): string | undefined {
    try {
        const packageJson = readPackageJson(cwd);
        return packageJson.name;
    } catch {
        return undefined;
    }
}

export function getPackageVersion(cwd: string): string | undefined {
    try {
        const packageJson = readPackageJson(cwd);
        return packageJson.version;
    } catch {
        return undefined;
    }
}