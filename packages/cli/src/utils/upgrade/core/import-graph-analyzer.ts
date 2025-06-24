/**
 * ENHANCED IMPORT GRAPH ANALYZER
 *
 * Provides comprehensive import dependency analysis including:
 * - Circular dependency detection and resolution
 * - Import path validation
 * - Missing dependency identification
 * - Performance impact analysis
 * - Self-healing suggestions
 */

import { logger } from '@elizaos/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { ImportNode, ImportGraph, ImportIssue } from './ai-import-resolver.js';

/**
 * Dependency analysis result
 */
export interface DependencyAnalysis {
  totalFiles: number;
  totalImports: number;
  circularDependencies: CircularDependency[];
  missingImports: MissingImport[];
  performanceIssues: PerformanceIssue[];
  recommendations: Recommendation[];
  healthScore: number;
}

/**
 * Circular dependency information
 */
export interface CircularDependency {
  id: string;
  cycle: string[];
  impact: 'critical' | 'high' | 'medium' | 'low';
  suggestedBreakPoints: BreakPoint[];
  affectedImports: string[];
}

/**
 * Missing import information
 */
export interface MissingImport {
  id: string;
  importPath: string;
  file: string;
  line: number;
  suggestedResolutions: string[];
  confidence: number;
}

/**
 * Performance issue information
 */
export interface PerformanceIssue {
  id: string;
  type: 'deep-import-chain' | 'redundant-imports' | 'large-bundle' | 'slow-resolution';
  description: string;
  file: string;
  impact: number; // 1-10 scale
  suggestion: string;
}

/**
 * Break point suggestion for circular dependencies
 */
export interface BreakPoint {
  file: string;
  importToRemove: string;
  alternativeApproach: string;
  confidence: number;
}

/**
 * Recommendation for improvement
 */
export interface Recommendation {
  id: string;
  type: 'refactor' | 'optimize' | 'fix' | 'warning';
  priority: 'high' | 'medium' | 'low';
  description: string;
  action: string;
  estimatedBenefit: string;
}

/**
 * Enhanced import graph analyzer with AI-powered insights
 */
export class ImportGraphAnalyzer {
  private fileCache = new Map<string, string>();
  private analysisCache = new Map<string, DependencyAnalysis>();

  /**
   * Analyze import graph and provide comprehensive insights
   */
  async analyzeProject(rootPath: string, files: string[]): Promise<DependencyAnalysis> {
    logger.info('🔍 Starting comprehensive import graph analysis...');

    const startTime = Date.now();

    // Build import graph
    const graph = await this.buildImportGraph(files);

    // Perform various analyses
    const circularDependencies = await this.analyzeCircularDependencies(graph);
    const missingImports = await this.analyzeMissingImports(graph);
    const performanceIssues = await this.analyzePerformance(graph);
    const recommendations = await this.generateRecommendations(
      graph,
      circularDependencies,
      performanceIssues
    );

    // Calculate health score
    const healthScore = this.calculateHealthScore(
      graph,
      circularDependencies,
      missingImports,
      performanceIssues
    );

    const analysis: DependencyAnalysis = {
      totalFiles: graph.nodes.size,
      totalImports: Array.from(graph.nodes.values()).reduce(
        (sum, node) => sum + node.imports.length,
        0
      ),
      circularDependencies,
      missingImports,
      performanceIssues,
      recommendations,
      healthScore,
    };

    const duration = Date.now() - startTime;
    logger.info(`✅ Import graph analysis completed in ${duration}ms`);
    logger.info(`📊 Health Score: ${healthScore}/100`);
    logger.info(`🔄 Circular Dependencies: ${circularDependencies.length}`);
    logger.info(`❌ Missing Imports: ${missingImports.length}`);
    logger.info(`⚡ Performance Issues: ${performanceIssues.length}`);

    return analysis;
  }

  /**
   * Build comprehensive import graph
   */
  private async buildImportGraph(files: string[]): Promise<ImportGraph> {
    const graph: ImportGraph = {
      nodes: new Map(),
      circularDependencies: [],
      orphanedFiles: [],
      missingDependencies: new Map(),
    };

    // First pass: collect all imports and exports
    for (const file of files) {
      if (!this.isTypeScriptFile(file)) continue;

      try {
        const content = await this.getFileContent(file);
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

        const imports: string[] = [];
        const exports: string[] = [];

        this.extractImportsAndExports(sourceFile, imports, exports);

        graph.nodes.set(file, {
          file,
          imports,
          exports,
          dependencies: new Set(imports),
          dependents: new Set(),
          isCircular: false,
        });
      } catch (error) {
        logger.warn(`⚠️  Failed to analyze ${file}:`, error);
      }
    }

    // Second pass: build dependency relationships
    for (const [file, node] of graph.nodes) {
      for (const importPath of node.imports) {
        const resolvedPath = this.resolveImportPath(importPath, file);

        if (resolvedPath && graph.nodes.has(resolvedPath)) {
          const dependentNode = graph.nodes.get(resolvedPath);
          if (dependentNode) {
            dependentNode.dependents.add(file);
          }
        } else if (
          resolvedPath === null &&
          !importPath.startsWith('@') &&
          !importPath.startsWith('node:')
        ) {
          // Track missing dependencies (excluding external packages)
          if (!graph.missingDependencies.has(file)) {
            graph.missingDependencies.set(file, []);
          }
          graph.missingDependencies.get(file)!.push(importPath);
        }
      }
    }

    // Detect orphaned files
    graph.orphanedFiles = Array.from(graph.nodes.keys()).filter((file) => {
      const node = graph.nodes.get(file)!;
      return node.dependents.size === 0 && !this.isEntryPoint(file);
    });

    return graph;
  }

  /**
   * Analyze circular dependencies with detailed impact assessment
   */
  private async analyzeCircularDependencies(graph: ImportGraph): Promise<CircularDependency[]> {
    const cycles = this.detectCycles(graph);
    const circularDependencies: CircularDependency[] = [];

    for (let i = 0; i < cycles.length; i++) {
      const cycle = cycles[i];
      const impact = this.assessCircularDependencyImpact(cycle, graph);
      const suggestedBreakPoints = await this.suggestBreakPoints(cycle, graph);
      const affectedImports = this.getAffectedImports(cycle, graph);

      circularDependencies.push({
        id: `circular-${i + 1}`,
        cycle,
        impact,
        suggestedBreakPoints,
        affectedImports,
      });
    }

    return circularDependencies;
  }

  /**
   * Analyze missing imports with resolution suggestions
   */
  private async analyzeMissingImports(graph: ImportGraph): Promise<MissingImport[]> {
    const missingImports: MissingImport[] = [];
    let id = 1;

    for (const [file, missingPaths] of graph.missingDependencies) {
      const content = await this.getFileContent(file);
      const lines = content.split('\n');

      for (const missingPath of missingPaths) {
        const line = this.findImportLine(lines, missingPath);
        const suggestedResolutions = await this.suggestImportResolutions(missingPath, file);

        missingImports.push({
          id: `missing-${id++}`,
          importPath: missingPath,
          file,
          line,
          suggestedResolutions,
          confidence: this.calculateResolutionConfidence(suggestedResolutions),
        });
      }
    }

    return missingImports;
  }

  /**
   * Analyze performance issues in import structure
   */
  private async analyzePerformance(graph: ImportGraph): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];
    let id = 1;

    for (const [file, node] of graph.nodes) {
      // Check for deep import chains
      const chainDepth = this.calculateImportChainDepth(file, graph);
      if (chainDepth > 10) {
        issues.push({
          id: `perf-${id++}`,
          type: 'deep-import-chain',
          description: `Import chain depth of ${chainDepth} may impact performance`,
          file,
          impact: Math.min(chainDepth - 5, 10),
          suggestion: 'Consider flattening the import structure or using barrel exports',
        });
      }

      // Check for redundant imports
      const redundantImports = this.findRedundantImports(node);
      if (redundantImports.length > 0) {
        issues.push({
          id: `perf-${id++}`,
          type: 'redundant-imports',
          description: `${redundantImports.length} redundant imports detected`,
          file,
          impact: redundantImports.length,
          suggestion: 'Remove or consolidate redundant imports',
        });
      }

      // Check for large bundle impact
      const bundleImpact = await this.estimateBundleImpact(file, node);
      if (bundleImpact > 7) {
        issues.push({
          id: `perf-${id++}`,
          type: 'large-bundle',
          description: `High bundle impact score of ${bundleImpact}`,
          file,
          impact: bundleImpact,
          suggestion: 'Consider code splitting or lazy loading',
        });
      }
    }

    return issues;
  }

  /**
   * Generate actionable recommendations
   */
  private async generateRecommendations(
    graph: ImportGraph,
    circularDependencies: CircularDependency[],
    performanceIssues: PerformanceIssue[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    let id = 1;

    // Recommendations for circular dependencies
    for (const circular of circularDependencies) {
      if (circular.impact === 'critical' || circular.impact === 'high') {
        recommendations.push({
          id: `rec-${id++}`,
          type: 'fix',
          priority: circular.impact === 'critical' ? 'high' : 'medium',
          description: `Break circular dependency in ${circular.cycle.join(' → ')}`,
          action: `Apply suggested break point: ${circular.suggestedBreakPoints[0]?.alternativeApproach || 'Refactor dependencies'}`,
          estimatedBenefit: 'Improved build performance and reduced complexity',
        });
      }
    }

    // Recommendations for performance issues
    for (const issue of performanceIssues) {
      if (issue.impact >= 7) {
        recommendations.push({
          id: `rec-${id++}`,
          type: 'optimize',
          priority: issue.impact >= 9 ? 'high' : 'medium',
          description: issue.description,
          action: issue.suggestion,
          estimatedBenefit: 'Reduced bundle size and faster load times',
        });
      }
    }

    // General recommendations
    if (graph.orphanedFiles.length > 0) {
      recommendations.push({
        id: `rec-${id++}`,
        type: 'warning',
        priority: 'low',
        description: `${graph.orphanedFiles.length} orphaned files detected`,
        action: 'Review and remove unused files or add proper imports',
        estimatedBenefit: 'Cleaner codebase and reduced confusion',
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(
    graph: ImportGraph,
    circularDependencies: CircularDependency[],
    missingImports: MissingImport[],
    performanceIssues: PerformanceIssue[]
  ): number {
    let score = 100;

    // Deduct for circular dependencies
    for (const circular of circularDependencies) {
      switch (circular.impact) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Deduct for missing imports
    score -= missingImports.length * 5;

    // Deduct for performance issues
    for (const issue of performanceIssues) {
      score -= issue.impact;
    }

    // Deduct for orphaned files
    score -= graph.orphanedFiles.length * 2;

    return Math.max(0, Math.min(100, score));
  }

  // Utility methods

  private isTypeScriptFile(file: string): boolean {
    return file.endsWith('.ts') || file.endsWith('.tsx');
  }

  private async getFileContent(file: string): Promise<string> {
    if (!this.fileCache.has(file)) {
      const content = await fs.promises.readFile(file, 'utf-8');
      this.fileCache.set(file, content);
    }
    return this.fileCache.get(file)!;
  }

  private extractImportsAndExports(
    sourceFile: ts.SourceFile,
    imports: string[],
    exports: string[]
  ): void {
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier as ts.StringLiteral;
        imports.push(moduleSpecifier.text);
      }

      if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        const moduleSpecifier = node.moduleSpecifier as ts.StringLiteral;
        exports.push(moduleSpecifier.text);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private resolveImportPath(importPath: string, fromFile: string): string | null {
    if (importPath.startsWith('@') || importPath.startsWith('node:')) {
      return importPath; // External package
    }

    if (importPath.startsWith('.')) {
      const fromDir = path.dirname(fromFile);
      const resolved = path.resolve(fromDir, importPath);

      // Try different extensions
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }

      // Try index files
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        const indexFile = path.join(resolved, `index${ext}`);
        if (fs.existsSync(indexFile)) {
          return indexFile;
        }
      }
    }

    return null;
  }

  private detectCycles(graph: ImportGraph): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (file: string, path: string[]): void => {
      if (recursionStack.has(file)) {
        const cycleStart = path.indexOf(file);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
        return;
      }

      if (visited.has(file)) return;

      visited.add(file);
      recursionStack.add(file);
      path.push(file);

      const node = graph.nodes.get(file);
      if (node) {
        for (const dependency of node.dependencies) {
          const resolvedPath = this.resolveImportPath(dependency, file);
          if (resolvedPath && graph.nodes.has(resolvedPath)) {
            dfs(resolvedPath, [...path]);
          }
        }
      }

      recursionStack.delete(file);
      path.pop();
    };

    for (const file of graph.nodes.keys()) {
      if (!visited.has(file)) {
        dfs(file, []);
      }
    }

    return cycles;
  }

  private assessCircularDependencyImpact(
    cycle: string[],
    graph: ImportGraph
  ): 'critical' | 'high' | 'medium' | 'low' {
    const cycleLength = cycle.length;
    const totalDependents = cycle.reduce((sum, file) => {
      const node = graph.nodes.get(file);
      return sum + (node?.dependents.size || 0);
    }, 0);

    if (cycleLength >= 5 || totalDependents >= 10) return 'critical';
    if (cycleLength >= 4 || totalDependents >= 7) return 'high';
    if (cycleLength >= 3 || totalDependents >= 4) return 'medium';
    return 'low';
  }

  private async suggestBreakPoints(cycle: string[], graph: ImportGraph): Promise<BreakPoint[]> {
    const breakPoints: BreakPoint[] = [];

    for (let i = 0; i < cycle.length; i++) {
      const currentFile = cycle[i];
      const nextFile = cycle[(i + 1) % cycle.length];

      const node = graph.nodes.get(currentFile);
      if (node && node.dependencies.has(nextFile)) {
        breakPoints.push({
          file: currentFile,
          importToRemove: nextFile,
          alternativeApproach: 'Use dependency injection or event system',
          confidence: 0.8,
        });
      }
    }

    return breakPoints;
  }

  private getAffectedImports(cycle: string[], graph: ImportGraph): string[] {
    const affected = new Set<string>();

    for (const file of cycle) {
      const node = graph.nodes.get(file);
      if (node) {
        for (const imp of node.imports) {
          affected.add(imp);
        }
      }
    }

    return Array.from(affected);
  }

  private findImportLine(lines: string[], importPath: string): number {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(importPath)) {
        return i + 1;
      }
    }
    return 1;
  }

  private async suggestImportResolutions(missingPath: string, fromFile: string): Promise<string[]> {
    const suggestions: string[] = [];
    const fromDir = path.dirname(fromFile);

    // Try with different extensions
    const basePath = path.resolve(fromDir, missingPath);
    for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
      const withExt = basePath + ext;
      if (fs.existsSync(withExt)) {
        suggestions.push(missingPath + ext);
      }
    }

    // Try index files
    for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
      const indexFile = path.join(basePath, `index${ext}`);
      if (fs.existsSync(indexFile)) {
        suggestions.push(missingPath + '/index' + ext);
      }
    }

    // Try fuzzy matching for typos
    const similarFiles = await this.findSimilarFiles(missingPath, fromDir);
    suggestions.push(...similarFiles);

    return suggestions;
  }

  private calculateResolutionConfidence(suggestions: string[]): number {
    if (suggestions.length === 0) return 0;
    if (suggestions.length === 1) return 0.9;
    return 0.7;
  }

  private calculateImportChainDepth(
    file: string,
    graph: ImportGraph,
    visited = new Set<string>()
  ): number {
    if (visited.has(file)) return 0;
    visited.add(file);

    const node = graph.nodes.get(file);
    if (!node || node.dependencies.size === 0) return 1;

    let maxDepth = 0;
    for (const dependency of node.dependencies) {
      const resolvedPath = this.resolveImportPath(dependency, file);
      if (resolvedPath && graph.nodes.has(resolvedPath)) {
        const depth = this.calculateImportChainDepth(resolvedPath, graph, new Set(visited));
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    return maxDepth + 1;
  }

  private findRedundantImports(node: ImportNode): string[] {
    const importCounts = new Map<string, number>();

    for (const imp of node.imports) {
      importCounts.set(imp, (importCounts.get(imp) || 0) + 1);
    }

    return Array.from(importCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([imp, _]) => imp);
  }

  private async estimateBundleImpact(file: string, node: ImportNode): Promise<number> {
    // Simplified bundle impact calculation
    // In a real implementation, this could analyze actual bundle sizes

    let impact = node.imports.length * 0.5; // Base impact from imports
    impact += node.dependents.size * 0.3; // Impact from dependents

    // Add impact for external dependencies
    const externalImports = node.imports.filter(
      (imp) => imp.startsWith('@') || !imp.startsWith('.')
    );
    impact += externalImports.length * 1.5;

    return Math.min(10, Math.max(1, impact));
  }

  private isEntryPoint(file: string): boolean {
    const filename = path.basename(file);
    return (
      filename === 'index.ts' ||
      filename === 'index.tsx' ||
      filename === 'main.ts' ||
      filename === 'main.tsx' ||
      filename.includes('entry') ||
      filename.includes('start')
    );
  }

  private async findSimilarFiles(missingPath: string, fromDir: string): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      const files = await fs.promises.readdir(fromDir, { recursive: true });
      const targetName = path.basename(missingPath);

      for (const file of files) {
        if (typeof file === 'string') {
          const fileName = path.basename(file, path.extname(file));
          if (this.calculateSimilarity(targetName, fileName) > 0.7) {
            suggestions.push(file);
          }
        }
      }
    } catch (error) {
      // Ignore readdir errors
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}
