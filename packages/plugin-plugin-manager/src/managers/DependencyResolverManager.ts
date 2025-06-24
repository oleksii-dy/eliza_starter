import { elizaLogger, type IAgentRuntime } from '@elizaos/core';
import * as semver from 'semver';
import { PluginManagerServiceType } from '../types.ts';

export interface DependencyNode {
  pluginName: string;
  version: string;
  dependencies: Map<string, string>; // name -> version constraint
  resolvedVersion?: string;
  depth: number;
}

export interface DependencyConflict {
  pluginName: string;
  requestedBy: Array<{ plugin: string; constraint: string }>;
  suggestion?: string;
}

export interface DependencyResolution {
  success: boolean;
  graph: Map<string, DependencyNode>;
  conflicts: DependencyConflict[];
  installOrder: string[];
  minimalSet?: string[]; // Minimal set of plugins needed
}

export class DependencyResolverManager {
  private runtime: IAgentRuntime;
  private resolutionCache = new Map<string, DependencyResolution>();

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  /**
   * Resolve dependencies for a set of plugins
   */
  async resolveDependencies(
    pluginNames: string[],
    options: {
      includeOptional?: boolean;
      checkCircular?: boolean;
      findMinimalSet?: boolean;
    } = {}
  ): Promise<DependencyResolution> {
    const cacheKey = `${pluginNames.join(',')}-${JSON.stringify(options)}`;
    const cached = this.resolutionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    elizaLogger.info('[DependencyResolver] Starting dependency resolution', {
      plugins: pluginNames,
      options,
    });

    const graph = new Map<string, DependencyNode>();
    const conflicts: DependencyConflict[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>(); // For circular dependency detection

    // Build dependency graph
    for (const pluginName of pluginNames) {
      await this.buildDependencyGraph(pluginName, graph, visited, visiting, conflicts, 0);
    }

    // Check for circular dependencies
    if (options.checkCircular) {
      const circular = this.detectCircularDependencies(graph);
      if (circular.length > 0) {
        conflicts.push(
          ...circular.map((cycle) => ({
            pluginName: cycle[0],
            requestedBy: cycle.map((p, i) => ({
              plugin: cycle[(i + 1) % cycle.length],
              constraint: 'circular',
            })),
          }))
        );
      }
    }

    // Resolve version conflicts
    const versionConflicts = this.resolveVersionConflicts(graph);
    conflicts.push(...versionConflicts);

    // Find minimal set if requested
    let minimalSet: string[] | undefined;
    if (options.findMinimalSet && conflicts.length === 0) {
      minimalSet = this.findMinimalPluginSet(graph, pluginNames);
    }

    // Topological sort for installation order
    const installOrder = this.topologicalSort(graph);

    const resolution: DependencyResolution = {
      success: conflicts.length === 0,
      graph,
      conflicts,
      installOrder,
      minimalSet,
    };

    this.resolutionCache.set(cacheKey, resolution);
    return resolution;
  }

  /**
   * Build dependency graph recursively
   */
  private async buildDependencyGraph(
    pluginName: string,
    graph: Map<string, DependencyNode>,
    visited: Set<string>,
    visiting: Set<string>,
    conflicts: DependencyConflict[],
    depth: number
  ): Promise<void> {
    if (visited.has(pluginName)) {
      return;
    }

    if (visiting.has(pluginName)) {
      // Circular dependency detected
      conflicts.push({
        pluginName,
        requestedBy: [{ plugin: pluginName, constraint: 'circular' }],
      });
      return;
    }

    visiting.add(pluginName);

    try {
      // Get plugin info from registry
      const pluginInfo = await this.getPluginInfo(pluginName);
      if (!pluginInfo) {
        elizaLogger.warn(`[DependencyResolver] Plugin ${pluginName} not found in registry`);
        return;
      }

      const node: DependencyNode = {
        pluginName,
        version: pluginInfo.version || 'latest',
        dependencies: new Map(Object.entries(pluginInfo.dependencies || {})),
        depth,
      };

      graph.set(pluginName, node);

      // Recursively process dependencies
      for (const [depName, depVersion] of node.dependencies) {
        await this.buildDependencyGraph(depName, graph, visited, visiting, conflicts, depth + 1);
      }
    } finally {
      visiting.delete(pluginName);
      visited.add(pluginName);
    }
  }

  /**
   * Get plugin information from registry
   */
  private async getPluginInfo(pluginName: string): Promise<any> {
    const pluginManager = this.runtime.getService(PluginManagerServiceType.PLUGIN_MANAGER) as any;
    if (!pluginManager) {
      return null;
    }

    const registryPlugins = await pluginManager.getAvailablePluginsFromRegistry();
    return registryPlugins[pluginName] || null;
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(graph: Map<string, DependencyNode>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const deps = graph.get(node)?.dependencies || new Map();
      for (const [depName] of deps) {
        if (!visited.has(depName)) {
          if (dfs(depName)) {
            return true;
          }
        } else if (recursionStack.has(depName)) {
          // Found cycle
          const cycleStart = path.indexOf(depName);
          cycles.push(path.slice(cycleStart));
          return true;
        }
      }

      path.pop();
      recursionStack.delete(node);
      return false;
    };

    for (const [nodeName] of graph) {
      if (!visited.has(nodeName)) {
        dfs(nodeName);
      }
    }

    return cycles;
  }

  /**
   * Resolve version conflicts between dependencies
   */
  private resolveVersionConflicts(graph: Map<string, DependencyNode>): DependencyConflict[] {
    const conflicts: DependencyConflict[] = [];
    const versionRequirements = new Map<string, Array<{ plugin: string; constraint: string }>>();

    // Collect all version requirements
    for (const [pluginName, node] of graph) {
      for (const [depName, depVersion] of node.dependencies) {
        if (!versionRequirements.has(depName)) {
          versionRequirements.set(depName, []);
        }
        versionRequirements.get(depName)!.push({
          plugin: pluginName,
          constraint: depVersion,
        });
      }
    }

    // Check for conflicts
    for (const [pluginName, requirements] of versionRequirements) {
      if (requirements.length > 1) {
        // Try to find a version that satisfies all constraints
        const constraints = requirements.map((r) => r.constraint);
        const satisfiableVersion = this.findSatisfiableVersion(constraints);

        if (!satisfiableVersion) {
          conflicts.push({
            pluginName,
            requestedBy: requirements,
            suggestion: this.suggestVersionResolution(constraints),
          });
        } else {
          // Update resolved version
          const node = graph.get(pluginName);
          if (node) {
            node.resolvedVersion = satisfiableVersion;
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Find a version that satisfies all constraints
   */
  private findSatisfiableVersion(constraints: string[]): string | null {
    // This is a simplified version - in production, you'd query available versions
    // from the registry and find one that satisfies all constraints
    try {
      // Check if all constraints can be satisfied by a single version
      const testVersions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0', '2.1.0'];

      for (const version of testVersions) {
        if (constraints.every((constraint) => semver.satisfies(version, constraint))) {
          return version;
        }
      }
    } catch (_error) {
      elizaLogger.error('[DependencyResolver] Error checking version constraints', error);
    }

    return null;
  }

  /**
   * Suggest a resolution for version conflicts
   */
  private suggestVersionResolution(constraints: string[]): string {
    // Analyze constraints and suggest the most permissive version
    try {
      const ranges = constraints.map((c) => semver.validRange(c)).filter(Boolean);
      if (ranges.length === 0) {return 'latest';}

      // Find the intersection of all ranges (simplified)
      return ranges[0] || 'latest';
    } catch {
      return 'latest';
    }
  }

  /**
   * Find minimal set of plugins needed
   */
  private findMinimalPluginSet(
    graph: Map<string, DependencyNode>,
    requestedPlugins: string[]
  ): string[] {
    const required = new Set<string>();
    const visited = new Set<string>();

    const markRequired = (pluginName: string) => {
      if (visited.has(pluginName)) {return;}
      visited.add(pluginName);
      required.add(pluginName);

      const node = graph.get(pluginName);
      if (node) {
        for (const [depName] of node.dependencies) {
          markRequired(depName);
        }
      }
    };

    // Mark all truly required plugins
    for (const plugin of requestedPlugins) {
      markRequired(plugin);
    }

    return Array.from(required);
  }

  /**
   * Topological sort for installation order
   */
  private topologicalSort(graph: Map<string, DependencyNode>): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (node: string) => {
      if (temp.has(node)) {
        throw new Error(`Circular dependency detected at ${node}`);
      }
      if (visited.has(node)) {
        return;
      }

      temp.add(node);
      const deps = graph.get(node)?.dependencies || new Map();
      for (const [depName] of deps) {
        if (graph.has(depName)) {
          visit(depName);
        }
      }
      temp.delete(node);
      visited.add(node);
      sorted.push(node);
    };

    for (const [nodeName] of graph) {
      if (!visited.has(nodeName)) {
        visit(nodeName);
      }
    }

    return sorted;
  }

  /**
   * Clear the resolution cache
   */
  clearCache(): void {
    this.resolutionCache.clear();
  }
}
