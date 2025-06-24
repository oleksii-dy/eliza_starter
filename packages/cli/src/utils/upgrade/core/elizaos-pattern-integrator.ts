/**
 * ElizaOS Pattern Integrator
 * 
 * Loads and validates transformations against specific ElizaOS V1 to V2 patterns
 * from the migration guide files. Ensures cache entries comply with documented
 * transformation patterns.
 * 
 * Philosophy: "Every cached transformation must follow documented ElizaOS patterns"
 * 
 * @file elizaos-pattern-integrator.ts
 * @version 1.0.0
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Represents a specific V1 to V2 transformation pattern
 */
export interface ElizaOSPattern {
  /** Unique identifier for the pattern */
  id: string;
  /** Pattern category (import, action, provider, type, etc.) */
  category: 'import' | 'action' | 'provider' | 'type' | 'method' | 'template' | 'config';
  /** V1 pattern to match */
  v1Pattern: string | RegExp;
  /** V2 replacement pattern */
  v2Pattern: string;
  /** Description of the transformation */
  description: string;
  /** Examples of the transformation */
  examples: {
    before: string;
    after: string;
    explanation?: string;
  }[];
  /** Validation rules for the pattern */
  validation: {
    /** Required imports for V2 */
    requiredImports?: string[];
    /** Deprecated imports to check for */
    deprecatedImports?: string[];
    /** Additional validation function */
    customValidator?: (before: string, after: string) => boolean;
  };
  /** Complexity score for the transformation */
  complexity: number;
  /** Pattern priority (higher = more important) */
  priority: number;
}

/**
 * Pattern collection loaded from migration guides
 */
export interface PatternCollection {
  /** All loaded patterns */
  patterns: ElizaOSPattern[];
  /** Pattern lookup by ID */
  byId: Map<string, ElizaOSPattern>;
  /** Patterns by category */
  byCategory: Map<string, ElizaOSPattern[]>;
  /** Version hash of the pattern collection */
  versionHash: string;
  /** Last loaded timestamp */
  loadedAt: Date;
}

/**
 * Result of pattern validation
 */
export interface PatternValidationResult {
  /** Whether the transformation matches a known pattern */
  isValidPattern: boolean;
  /** Matching pattern(s) */
  matchingPatterns: ElizaOSPattern[];
  /** Confidence in the pattern match */
  confidence: number;
  /** Validation issues found */
  issues: string[];
  /** Suggestions for improvement */
  suggestions: string[];
  /** Whether this is a complete transformation */
  isComplete: boolean;
}

/**
 * ElizaOS Pattern Integration System
 * 
 * Loads, parses, and validates transformations against ElizaOS migration patterns
 */
export class ElizaOSPatternIntegrator {
  private patterns: PatternCollection | null = null;
  private readonly patternsDir: string;
  private readonly cacheFile: string;

  constructor(private readonly repoPath: string) {
    this.patternsDir = path.join(repoPath, 'packages', 'cli', 'src', 'utils', 'upgrade', 'patterns');
    this.cacheFile = path.join(repoPath, '.elizaos-patterns-cache.json');
  }

  /**
   * Load and parse all ElizaOS migration patterns
   */
  async loadPatterns(): Promise<PatternCollection> {
    try {
      // Try to load from cache first
      const cached = await this.loadFromCache();
      if (cached && this.isCacheValid(cached)) {
        this.patterns = cached;
        return cached;
      }

      // Load from source files
      console.log('🔄 Loading ElizaOS migration patterns...');
      
      const actionPatterns = await this.loadActionPatterns();
      const providerPatterns = await this.loadProviderPatterns();
      const corePatterns = this.getCorePatterns();

      const allPatterns = [
        ...actionPatterns,
        ...providerPatterns, 
        ...corePatterns
      ];

      // Create pattern collection
      const collection: PatternCollection = {
        patterns: allPatterns,
        byId: new Map(allPatterns.map(p => [p.id, p])),
        byCategory: this.groupByCategory(allPatterns),
        versionHash: this.calculateVersionHash(allPatterns),
        loadedAt: new Date()
      };

      // Cache the result
      await this.saveToCache(collection);
      this.patterns = collection;

      console.log(`✅ Loaded ${allPatterns.length} ElizaOS migration patterns`);
      return collection;

    } catch (error: any) {
      console.error('❌ Error loading ElizaOS patterns:', error);
      throw new Error(`Failed to load ElizaOS patterns: ${error.message}`);
    }
  }

  /**
   * Validate a transformation against loaded patterns
   */
  async validateTransformation(
    before: string,
    after: string,
    transformationType: string
  ): Promise<PatternValidationResult> {
    if (!this.patterns) {
      await this.loadPatterns();
    }

    const matchingPatterns: ElizaOSPattern[] = [];
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Find matching patterns
    for (const pattern of this.patterns!.patterns) {
      if (this.matchesPattern(before, after, pattern)) {
        matchingPatterns.push(pattern);
      }
    }

    // Validate against matching patterns
    let confidence = 0;
    let isComplete = false;

    if (matchingPatterns.length > 0) {
      // Use highest priority pattern for validation
      const primaryPattern = matchingPatterns.reduce((highest, current) => 
        current.priority > highest.priority ? current : highest
      );

      confidence = this.calculateConfidence(before, after, primaryPattern);
      isComplete = this.isTransformationComplete(before, after, primaryPattern);

      // Check for common issues
      this.validateImports(before, after, primaryPattern, issues, suggestions);
      this.validateSyntax(before, after, primaryPattern, issues, suggestions);
      this.validateSemantics(before, after, primaryPattern, issues, suggestions);

    } else {
      // No matching pattern found
      issues.push('No matching ElizaOS pattern found for this transformation');
      suggestions.push('Verify this transformation follows V1 to V2 migration guidelines');
      
      // Check if it's a known pattern with incorrect implementation
      const similarPatterns = this.findSimilarPatterns(before, after);
      if (similarPatterns.length > 0) {
        suggestions.push(`Similar patterns found: ${similarPatterns.map(p => p.id).join(', ')}`);
      }
    }

    return {
      isValidPattern: matchingPatterns.length > 0 && issues.length === 0,
      matchingPatterns,
      confidence,
      issues,
      suggestions,
      isComplete
    };
  }

  /**
   * Get pattern version for cache invalidation
   */
  async getPatternVersion(): Promise<{ version: string; hash: string }> {
    if (!this.patterns) {
      await this.loadPatterns();
    }

    return {
      version: '2.0.0',
      hash: this.patterns!.versionHash
    };
  }

  /**
   * Load action migration patterns from plugin-action-migration-guide.md
   */
  private async loadActionPatterns(): Promise<ElizaOSPattern[]> {
    const actionGuidePath = path.join(this.patternsDir, 'plugin-action-migration-guide.md');
    const content = await fs.readFile(actionGuidePath, 'utf-8');

    const patterns: ElizaOSPattern[] = [
      // Import transformations
      {
        id: 'composeContext-to-composePromptFromState',
        category: 'import',
        v1Pattern: /composeContext/g,
        v2Pattern: 'composePromptFromState',
        description: 'Replace composeContext with composePromptFromState',
        examples: [
          {
            before: 'import { composeContext } from "@elizaos/core";',
            after: 'import { composePromptFromState } from "@elizaos/core";',
            explanation: 'Import name change for V2 compatibility'
          }
        ],
        validation: {
          requiredImports: ['composePromptFromState'],
          deprecatedImports: ['composeContext']
        },
        complexity: 2,
        priority: 10
      }
    ];

    return patterns;
  }

  /**
   * Load provider migration patterns from plugin-provider-action-items.md
   */
  private async loadProviderPatterns(): Promise<ElizaOSPattern[]> {
    const providerGuidePath = path.join(this.patternsDir, 'plugin-provider-action-items.md');
    const content = await fs.readFile(providerGuidePath, 'utf-8');

    const patterns: ElizaOSPattern[] = [
      {
        id: 'provider-return-type',
        category: 'provider',
        v1Pattern: /Promise<string \| null>/g,
        v2Pattern: 'Promise<ProviderResult>',
        description: 'Update provider return type to ProviderResult',
        examples: [
          {
            before: 'async get(): Promise<string | null>',
            after: 'async get(): Promise<ProviderResult>',
            explanation: 'Provider return type modernization'
          }
        ],
        validation: {
          requiredImports: ['ProviderResult'],
        },
        complexity: 3,
        priority: 8
      }
    ];

    return patterns;
  }

  /**
   * Get core transformation patterns not covered in guide files
   */
  private getCorePatterns(): ElizaOSPattern[] {
    return [
      {
        id: 'content-action-to-actions-array',
        category: 'type',
        v1Pattern: /action:/g,
        v2Pattern: 'actions: []',
        description: 'Replace single action with actions array in Content',
        examples: [
          {
            before: 'content: { action: "TRANSFER" }',
            after: 'content: { actions: ["TRANSFER"] }',
            explanation: 'Content structure change for multiple actions'
          }
        ],
        validation: {
          customValidator: (before: string, after: string) => {
            if (!before.includes('action:')) return true;
            return after.includes('actions:') && after.includes('[');
          }
        },
        complexity: 2,
        priority: 6
      }
    ];
  }

  /**
   * Check if transformation matches a specific pattern
   */
  private matchesPattern(before: string, after: string, pattern: ElizaOSPattern): boolean {
    // Check if before contains the V1 pattern
    const v1Regex = typeof pattern.v1Pattern === 'string' 
      ? new RegExp(pattern.v1Pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      : pattern.v1Pattern;
    
    const hasV1Pattern = v1Regex.test(before);
    
    if (!hasV1Pattern) return false;

    // Check if after contains the V2 pattern or expected transformation
    if (typeof pattern.v2Pattern === 'string') {
      const expectedInAfter = pattern.v2Pattern.includes('$1') 
        ? this.expandV2Pattern(before, pattern)
        : pattern.v2Pattern;
      
      return after.includes(expectedInAfter);
    }

    // Use custom validator if available
    if (pattern.validation.customValidator) {
      return pattern.validation.customValidator(before, after);
    }

    return true;
  }

  /**
   * Expand V2 pattern with captured groups
   */
  private expandV2Pattern(before: string, pattern: ElizaOSPattern): string {
    const v1Regex = typeof pattern.v1Pattern === 'string' 
      ? new RegExp(pattern.v1Pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      : pattern.v1Pattern;
    
    const match = before.match(v1Regex);
    if (!match) return pattern.v2Pattern;

    let result = pattern.v2Pattern;
    match.forEach((captured, index) => {
      result = result.replace(`$${index + 1}`, captured);
    });

    return result;
  }

  /**
   * Calculate confidence in pattern match
   */
  private calculateConfidence(before: string, after: string, pattern: ElizaOSPattern): number {
    let confidence = 0.8; // Base confidence

    // Boost confidence for exact pattern matches
    if (this.matchesPattern(before, after, pattern)) {
      confidence += 0.1;
    }

    // Boost for import compliance
    if (this.hasRequiredImports(after, pattern)) {
      confidence += 0.05;
    }

    // Reduce for deprecated imports
    if (this.hasDeprecatedImports(after, pattern)) {
      confidence -= 0.1;
    }

    // Boost for high-priority patterns
    if (pattern.priority >= 8) {
      confidence += 0.05;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Check if transformation is complete
   */
  private isTransformationComplete(before: string, after: string, pattern: ElizaOSPattern): boolean {
    // Check for required imports
    if (!this.hasRequiredImports(after, pattern)) {
      return false;
    }

    // Check for deprecated imports still present
    if (this.hasDeprecatedImports(after, pattern)) {
      return false;
    }

    // Use pattern-specific validation
    if (pattern.validation.customValidator) {
      return pattern.validation.customValidator(before, after);
    }

    return true;
  }

  /**
   * Validate imports in transformation
   */
  private validateImports(
    before: string, 
    after: string, 
    pattern: ElizaOSPattern, 
    issues: string[], 
    suggestions: string[]
  ): void {
    // Check for required imports
    if (pattern.validation.requiredImports) {
      for (const requiredImport of pattern.validation.requiredImports) {
        if (!after.includes(requiredImport)) {
          issues.push(`Missing required import: ${requiredImport}`);
          suggestions.push(`Add 'import { ${requiredImport} } from "@elizaos/core";'`);
        }
      }
    }

    // Check for deprecated imports
    if (pattern.validation.deprecatedImports) {
      for (const deprecatedImport of pattern.validation.deprecatedImports) {
        if (after.includes(deprecatedImport)) {
          issues.push(`Deprecated import still present: ${deprecatedImport}`);
          suggestions.push(`Remove deprecated import: ${deprecatedImport}`);
        }
      }
    }
  }

  /**
   * Validate syntax in transformation
   */
  private validateSyntax(
    before: string, 
    after: string, 
    pattern: ElizaOSPattern,
    issues: string[], 
    suggestions: string[]
  ): void {
    // Basic syntax checks
    const beforeBraces = (before.match(/[{}]/g) || []).length;
    const afterBraces = (after.match(/[{}]/g) || []).length;
    
    if (Math.abs(beforeBraces - afterBraces) > 2) {
      issues.push('Significant brace mismatch detected');
      suggestions.push('Check for missing or extra braces in transformation');
    }

    // Check for incomplete transformations
    if (after.includes('TODO') || after.includes('FIXME')) {
      issues.push('Incomplete transformation detected');
      suggestions.push('Complete the transformation before caching');
    }
  }

  /**
   * Validate semantics in transformation
   */
  private validateSemantics(
    before: string, 
    after: string, 
    pattern: ElizaOSPattern,
    issues: string[], 
    suggestions: string[]
  ): void {
    // Check for semantic preservation
    const beforeFunctionCalls = (before.match(/\w+\(/g) || []).length;
    const afterFunctionCalls = (after.match(/\w+\(/g) || []).length;

    if (pattern.complexity >= 3 && Math.abs(beforeFunctionCalls - afterFunctionCalls) > 1) {
      issues.push('Significant semantic changes detected');
      suggestions.push('Verify that transformation preserves original functionality');
    }
  }

  /**
   * Check if code has required imports
   */
  private hasRequiredImports(code: string, pattern: ElizaOSPattern): boolean {
    if (!pattern.validation.requiredImports) return true;
    
    return pattern.validation.requiredImports.every(imp => code.includes(imp));
  }

  /**
   * Check if code has deprecated imports
   */
  private hasDeprecatedImports(code: string, pattern: ElizaOSPattern): boolean {
    if (!pattern.validation.deprecatedImports) return false;
    
    return pattern.validation.deprecatedImports.some(imp => code.includes(imp));
  }

  /**
   * Find similar patterns for suggestions
   */
  private findSimilarPatterns(before: string, after: string): ElizaOSPattern[] {
    if (!this.patterns) return [];

    return this.patterns.patterns.filter(pattern => {
      // Simple similarity check based on keywords
      const beforeWords = before.toLowerCase().match(/\w+/g) || [];
      const patternWords = pattern.description.toLowerCase().match(/\w+/g) || [];
      
      const commonWords = beforeWords.filter(word => patternWords.includes(word));
      return commonWords.length >= 2;
    });
  }

  /**
   * Group patterns by category
   */
  private groupByCategory(patterns: ElizaOSPattern[]): Map<string, ElizaOSPattern[]> {
    const grouped = new Map<string, ElizaOSPattern[]>();
    
    for (const pattern of patterns) {
      const category = pattern.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(pattern);
    }

    return grouped;
  }

  /**
   * Calculate version hash for patterns
   */
  private calculateVersionHash(patterns: ElizaOSPattern[]): string {
    const content = JSON.stringify(patterns.map(p => ({
      id: p.id,
      v1Pattern: p.v1Pattern.toString(),
      v2Pattern: p.v2Pattern,
      priority: p.priority
    })));
    
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Load patterns from cache
   */
  private async loadFromCache(): Promise<PatternCollection | null> {
    try {
      const cacheContent = await fs.readFile(this.cacheFile, 'utf-8');
      const cached = JSON.parse(cacheContent);
      
      // Reconstruct Maps
      cached.byId = new Map(Object.entries(cached.byId));
      cached.byCategory = new Map(Object.entries(cached.byCategory));
      cached.loadedAt = new Date(cached.loadedAt);

      return cached;
    } catch {
      return null;
    }
  }

  /**
   * Save patterns to cache
   */
  private async saveToCache(collection: PatternCollection): Promise<void> {
    try {
      const cacheData = {
        ...collection,
        byId: Object.fromEntries(collection.byId),
        byCategory: Object.fromEntries(collection.byCategory)
      };
      
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      console.warn('Failed to save pattern cache:', error);
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(cached: PatternCollection): boolean {
    const age = Date.now() - cached.loadedAt.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    return age < maxAge;
  }
}
