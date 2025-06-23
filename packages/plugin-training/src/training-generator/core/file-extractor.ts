import { elizaLogger } from '@elizaos/core';/**
 * File Extractor - Core Infrastructure for Training Data Generation
 * 
 * Extracts and analyzes all relevant files from repositories.
 * Provides detailed metadata for training scenario generation.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { glob } from 'glob';

export interface ExtractedFile {
  path: string;
  relativePath: string;
  content: string;
  language: string;
  size: number;
  purpose: string;
  dependencies: string[];
  exports: string[];
  imports: string[];
  complexity: 'simple' | 'medium' | 'complex';
  isTestFile: boolean;
  isConfigFile: boolean;
  lastModified: string;
}

export interface ExtractionResult {
  files: ExtractedFile[];
  totalFiles: number;
  totalSize: number;
  languages: Record<string, number>;
  fileTypes: Record<string, number>;
  extractionTime: number;
}

export class FileExtractor {
  private readonly SUPPORTED_EXTENSIONS = [
    '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml', '.yaml', 
    '.toml', '.txt', '.env.example', '.gitignore', '.dockerignore'
  ];

  private readonly IGNORE_PATTERNS = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/.nyc_output/**',
    '**/tmp/**',
    '**/temp/**',
    `**/${path.basename(os.tmpdir())}/**`, // Cross-platform temp directory
    '**/.cache/**',
    '**/logs/**',
    '**/*.log',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/bun.lockb',
    '**/.DS_Store'
  ];

  /**
   * Extract all relevant files from a repository
   */
  async extractAllFiles(repoDir: string): Promise<ExtractionResult> {
    const startTime = Date.now();
    elizaLogger.info(`📁 Extracting files from: ${repoDir}`);

    const files: ExtractedFile[] = [];
    const languages: Record<string, number> = {};
    const fileTypes: Record<string, number> = {};
    let totalSize = 0;

    // Create glob patterns for supported extensions
    const patterns = this.SUPPORTED_EXTENSIONS.map(ext => `**/*${ext}`);

    for (const pattern of patterns) {
      const matchedFiles = await glob(pattern, {
        cwd: repoDir,
        ignore: this.IGNORE_PATTERNS,
        absolute: true,
        nodir: true
      });

      for (const filePath of matchedFiles) {
        try {
          const extractedFile = await this.extractFile(filePath, repoDir);
          files.push(extractedFile);
          
          // Update statistics
          languages[extractedFile.language] = (languages[extractedFile.language] || 0) + 1;
          const ext = path.extname(extractedFile.relativePath);
          fileTypes[ext] = (fileTypes[ext] || 0) + 1;
          totalSize += extractedFile.size;
          
        } catch (error) {
          elizaLogger.warn(`⚠️  Failed to extract file ${filePath}:`, error instanceof Error ? error.message : String(error));
        }
      }
    }

    const extractionTime = Date.now() - startTime;
    
    elizaLogger.info(`✅ Extracted ${files.length} files in ${extractionTime}ms`);
    elizaLogger.info(`📊 Languages found: ${Object.keys(languages).join(', ')}`);

    return {
      files: files.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
      totalFiles: files.length,
      totalSize,
      languages,
      fileTypes,
      extractionTime
    };
  }

  /**
   * Extract individual file with detailed analysis
   */
  private async extractFile(filePath: string, repoDir: string): Promise<ExtractedFile> {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(repoDir, filePath);
    const stats = await fs.stat(filePath);
    
    const language = this.detectLanguage(filePath);
    const dependencies = this.extractDependencies(content, language);
    const imports = this.extractImports(content, language);
    const exports = this.extractExports(content, language);
    const purpose = this.analyzePurpose(content, relativePath);
    const complexity = this.assessComplexity(content, relativePath);
    const isTestFile = this.isTestFile(relativePath);
    const isConfigFile = this.isConfigFile(relativePath);

    return {
      path: filePath,
      relativePath,
      content,
      language,
      size: content.length,
      purpose,
      dependencies,
      imports,
      exports,
      complexity,
      isTestFile,
      isConfigFile,
      lastModified: stats.mtime.toISOString()
    };
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();
    
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript-react',
      '.js': 'javascript',
      '.jsx': 'javascript-react',
      '.json': 'json',
      '.md': 'markdown',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.toml': 'toml',
      '.txt': 'text',
      '.env': 'env'
    };

    if (basename.includes('dockerfile')) return 'dockerfile';
    if (basename.includes('makefile')) return 'makefile';
    if (ext === '' && basename.startsWith('.')) return 'config';
    
    return languageMap[ext] || 'text';
  }

  /**
   * Extract dependency information from file content
   */
  private extractDependencies(content: string, language: string): string[] {
    const dependencies = new Set<string>();
    
    if (language.includes('typescript') || language.includes('javascript')) {
      // Extract import statements
      const importRegex = /import.*?from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        dependencies.add(match[1]);
      }
      
      // Extract require statements
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        dependencies.add(match[1]);
      }
      
      // Extract dynamic imports
      const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
      while ((match = dynamicImportRegex.exec(content)) !== null) {
        dependencies.add(match[1]);
      }
    }
    
    return Array.from(dependencies).filter(dep => !dep.startsWith('.'));
  }

  /**
   * Extract import statements for local files
   */
  private extractImports(content: string, language: string): string[] {
    const imports = new Set<string>();
    
    if (language.includes('typescript') || language.includes('javascript')) {
      const importRegex = /import.*?from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        if (match[1].startsWith('.')) {
          imports.add(match[1]);
        }
      }
    }
    
    return Array.from(imports);
  }

  /**
   * Extract export statements
   */
  private extractExports(content: string, language: string): string[] {
    const exports = new Set<string>();
    
    if (language.includes('typescript') || language.includes('javascript')) {
      // Named exports
      const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
      let match;
      while ((match = namedExportRegex.exec(content)) !== null) {
        exports.add(match[1]);
      }
      
      // Export declarations
      const exportDeclRegex = /export\s*{\s*([^}]+)\s*}/g;
      while ((match = exportDeclRegex.exec(content)) !== null) {
        const items = match[1].split(',').map(item => item.trim().split(' as ')[0].trim());
        items.forEach(item => exports.add(item));
      }
      
      // Default exports
      if (content.includes('export default')) {
        exports.add('default');
      }
    }
    
    return Array.from(exports);
  }

  /**
   * Analyze file purpose based on content and path
   */
  private analyzePurpose(content: string, relativePath: string): string {
    const purposes = [];
    const pathLower = relativePath.toLowerCase();
    
    // Path-based analysis
    if (pathLower.includes('test') || pathLower.includes('spec')) {
      purposes.push('testing');
    }
    if (pathLower.includes('config')) {
      purposes.push('configuration');
    }
    if (pathLower.includes('types') || pathLower.includes('type')) {
      purposes.push('type definitions');
    }
    if (pathLower.includes('utils') || pathLower.includes('helper')) {
      purposes.push('utilities');
    }
    if (pathLower.includes('actions')) {
      purposes.push('actions');
    }
    if (pathLower.includes('providers')) {
      purposes.push('providers');
    }
    if (pathLower.includes('evaluators')) {
      purposes.push('evaluators');
    }
    if (pathLower.includes('services')) {
      purposes.push('services');
    }
    if (pathLower.includes('components')) {
      purposes.push('components');
    }
    if (pathLower.includes('plugin')) {
      purposes.push('plugin');
    }
    if (pathLower === 'readme.md' || pathLower.includes('readme')) {
      purposes.push('documentation');
    }
    if (pathLower === 'package.json') {
      purposes.push('package configuration');
    }
    
    // Content-based analysis
    if (content.includes('export interface') || content.includes('export type')) {
      purposes.push('type definitions');
    }
    if (content.includes('export class')) {
      purposes.push('class implementation');
    }
    if (content.includes('export function') || content.includes('export const') && content.includes('= (')) {
      purposes.push('functions');
    }
    if (content.includes(': Action')) {
      purposes.push('ElizaOS action');
    }
    if (content.includes(': Provider')) {
      purposes.push('ElizaOS provider');
    }
    if (content.includes(': Evaluator')) {
      purposes.push('ElizaOS evaluator');
    }
    if (content.includes(': Plugin')) {
      purposes.push('ElizaOS plugin');
    }
    if (content.includes('extends Service')) {
      purposes.push('ElizaOS service');
    }
    if (content.includes('describe(') || content.includes('it(') || content.includes('test(')) {
      purposes.push('unit tests');
    }
    
    return purposes.length > 0 ? purposes.join(', ') : 'general implementation';
  }

  /**
   * Assess code complexity
   */
  private assessComplexity(content: string, relativePath: string): 'simple' | 'medium' | 'complex' {
    const lines = content.split('\n').length;
    const functions = (content.match(/function\s+\w+|=>\s*{|:\s*\(/g) || []).length;
    const classes = (content.match(/class\s+\w+/g) || []).length;
    const interfaces = (content.match(/interface\s+\w+/g) || []).length;
    
    const complexityScore = lines * 0.1 + functions * 5 + classes * 10 + interfaces * 3;
    
    if (complexityScore > 500) return 'complex';
    if (complexityScore > 100) return 'medium';
    return 'simple';
  }

  /**
   * Check if file is a test file
   */
  private isTestFile(relativePath: string): boolean {
    const pathLower = relativePath.toLowerCase();
    return pathLower.includes('test') || 
           pathLower.includes('spec') || 
           pathLower.includes('__tests__') ||
           pathLower.endsWith('.test.ts') ||
           pathLower.endsWith('.test.js') ||
           pathLower.endsWith('.spec.ts') ||
           pathLower.endsWith('.spec.js');
  }

  /**
   * Check if file is a configuration file
   */
  private isConfigFile(relativePath: string): boolean {
    const configFiles = [
      'package.json', 'tsconfig.json', 'vite.config.ts', 'vitest.config.ts',
      'eslint.config.js', 'prettier.config.js', 'jest.config.js',
      'rollup.config.js', 'webpack.config.js', 'babel.config.js',
      '.gitignore', '.npmignore', '.dockerignore', 'Dockerfile',
      'docker-compose.yml', 'Makefile', '.env.example'
    ];
    
    const basename = path.basename(relativePath);
    return configFiles.includes(basename) || 
           basename.startsWith('.') ||
           relativePath.toLowerCase().includes('config');
  }

  /**
   * Filter files by criteria
   */
  filterFiles(files: ExtractedFile[] criteria: {
    language?: string;
    purpose?: string;
    complexity?: 'simple' | 'medium' | 'complex';
    excludeTests?: boolean;
    excludeConfig?: boolean;
    minSize?: number;
    maxSize?: number;
  }): ExtractedFile[] {
    return files.filter(file => {
      if (criteria.language && file.language !== criteria.language) return false;
      if (criteria.purpose && !file.purpose.includes(criteria.purpose)) return false;
      if (criteria.complexity && file.complexity !== criteria.complexity) return false;
      if (criteria.excludeTests && file.isTestFile) return false;
      if (criteria.excludeConfig && file.isConfigFile) return false;
      if (criteria.minSize && file.size < criteria.minSize) return false;
      if (criteria.maxSize && file.size > criteria.maxSize) return false;
      return true;
    });
  }

  /**
   * Get extraction statistics
   */
  getStatistics(files: ExtractedFile[]): {
    totalFiles: number;
    totalLines: number;
    averageFileSize: number;
    languageDistribution: Record<string, number>;
    complexityDistribution: Record<string, number>;
    purposeDistribution: Record<string, number>;
  } {
    const totalLines = files.reduce((sum, file) => sum + file.content.split('\n').length, 0);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    const languageDistribution: Record<string, number> = {};
    const complexityDistribution: Record<string, number> = {};
    const purposeDistribution: Record<string, number> = {};
    
    files.forEach(file => {
      languageDistribution[file.language] = (languageDistribution[file.language] || 0) + 1;
      complexityDistribution[file.complexity] = (complexityDistribution[file.complexity] || 0) + 1;
      
      file.purpose.split(', ').forEach(purpose => {
        purposeDistribution[purpose] = (purposeDistribution[purpose] || 0) + 1;
      });
    });
    
    return {
      totalFiles: files.length,
      totalLines,
      averageFileSize: files.length > 0 ? Math.round(totalSize / files.length) : 0,
      languageDistribution,
      complexityDistribution,
      purposeDistribution
    };
  }
}

elizaLogger.info('✅ File extractor module loaded');