import { logger } from '@elizaos/core';
import type { Florence2Result, ScreenTile, BoundingBox } from './types';
import { Florence2API } from './florence2-api';

export class Florence2Model {
  private initialized = false;
  private api: Florence2API;

  constructor() {
    this.api = new Florence2API();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('[Florence2] Initializing Florence-2 model...');

      await this.api.initialize();

      this.initialized = true;
      logger.info('[Florence2] Model initialized');
    } catch (error) {
      logger.error('[Florence2] Failed to initialize:', error);
      // Don't throw - fall back to mock if API not available
      this.initialized = true;
      logger.warn('[Florence2] Running in mock mode');
    }
  }

  async analyzeTile(tile: ScreenTile): Promise<Florence2Result> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!tile.data) {
      throw new Error('Tile has no image data');
    }

    try {
      // Try real API first
      if (this.api.isInitialized()) {
        try {
          const result = await this.api.analyzeTile(tile);
          logger.debug(`[Florence2] Analyzed tile ${tile.id}: ${result.caption}`);
          return result;
        } catch (_apiError) {
          logger.warn('[Florence2] API call failed, falling back to mock:', _apiError);
        }
      }

      // Fall back to mock analysis
      const result = await this.mockAnalyze(tile);
      logger.debug(`[Florence2] Mock analyzed tile ${tile.id}: ${result.caption}`);
      return result;
    } catch (error) {
      logger.error('[Florence2] Analysis failed:', error);
      throw error;
    }
  }

  private async mockAnalyze(tile: ScreenTile): Promise<Florence2Result> {
    // Mock implementation that simulates Florence-2 output
    // In production, this would be replaced with actual API calls

    const isUpperRegion = tile.row < 2;
    const isLeftRegion = tile.col < 2;

    // Simulate different UI regions
    let caption = 'Desktop screen region';
    const objects: Array<{ label: string; bbox: BoundingBox; confidence: number }> = [];
    const regions: Array<{ description: string; bbox: BoundingBox }> = [];
    const tags: string[] = [];

    if (isUpperRegion) {
      caption = 'Application window with menu bar';
      objects.push({
        label: 'window',
        bbox: { x: 0, y: 0, width: tile.width, height: 50 },
        confidence: 0.9,
      });
      objects.push({
        label: 'menu_bar',
        bbox: { x: 0, y: 0, width: tile.width, height: 30 },
        confidence: 0.85,
      });
      tags.push('ui', 'application', 'desktop');
    }

    if (isLeftRegion) {
      caption = 'Sidebar or navigation area';
      objects.push({
        label: 'sidebar',
        bbox: { x: 0, y: 0, width: 100, height: tile.height },
        confidence: 0.8,
      });
      tags.push('navigation', 'sidebar');
    }

    // Add some common UI elements
    const buttonCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < buttonCount; i++) {
      objects.push({
        label: 'button',
        bbox: {
          x: Math.random() * (tile.width - 100),
          y: Math.random() * (tile.height - 40),
          width: 100,
          height: 40,
        },
        confidence: 0.7 + Math.random() * 0.2,
      });
    }

    // Add text regions
    const textRegions = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < textRegions; i++) {
      regions.push({
        description: 'Text content area',
        bbox: {
          x: Math.random() * (tile.width - 200),
          y: Math.random() * (tile.height - 100),
          width: 200,
          height: 100,
        },
      });
    }

    tags.push('screen', 'interface', 'computer');

    return {
      caption,
      objects,
      regions,
      tags,
    };
  }

  async detectUIElements(_imageBuffer: Buffer): Promise<
    Array<{
      type: string;
      bbox: BoundingBox;
      confidence: number;
      text?: string;
    }>
  > {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Use API to analyze image
      let result: Florence2Result;

      if (this.api.isInitialized()) {
        try {
          result = await this.api.analyzeImage(_imageBuffer);
        } catch (_apiError) {
          logger.warn('[Florence2] API failed for UI detection, using mock');
          result = await this.mockAnalyzeBuffer(_imageBuffer);
        }
      } else {
        result = await this.mockAnalyzeBuffer(_imageBuffer);
      }

      // Convert Florence-2 objects to UI elements
      return (result.objects || []).map((obj) => ({
        type: this.mapToUIElementType(obj.label),
        bbox: obj.bbox,
        confidence: obj.confidence,
      }));
    } catch (error) {
      logger.error('[Florence2] UI element detection failed:', error);
      return [];
    }
  }

  private async mockAnalyzeBuffer(_imageBuffer: Buffer): Promise<Florence2Result> {
    // Simple mock for when API is not available
    return {
      caption: 'User interface with various elements',
      objects: [
        {
          label: 'window',
          bbox: { x: 0, y: 0, width: 800, height: 600 },
          confidence: 0.9,
        },
        {
          label: 'button',
          bbox: { x: 100, y: 500, width: 100, height: 40 },
          confidence: 0.85,
        },
      ],
      regions: [],
      tags: ['ui', 'interface', 'application'],
    };
  }

  private mapToUIElementType(label: string): string {
    const mapping: Record<string, string> = {
      button: 'button',
      text_field: 'input',
      text_area: 'textarea',
      checkbox: 'checkbox',
      radio_button: 'radio',
      dropdown: 'select',
      menu: 'menu',
      menu_bar: 'menubar',
      toolbar: 'toolbar',
      window: 'window',
      dialog: 'dialog',
      icon: 'icon',
      image: 'image',
      video: 'video',
      link: 'link',
      heading: 'heading',
      paragraph: 'text',
      list: 'list',
      table: 'table',
      scrollbar: 'scrollbar',
      tab: 'tab',
      panel: 'panel',
    };

    return mapping[label.toLowerCase()] || 'unknown';
  }

  async generateSceneGraph(tiles: ScreenTile[]): Promise<{
    nodes: Array<{ id: string; type: string; label: string; position: BoundingBox }>;
    edges: Array<{ source: string; target: string; relation: string }>;
  }> {
    const nodes: Array<{ id: string; type: string; label: string; position: BoundingBox }> = [];
    const edges: Array<{ source: string; target: string; relation: string }> = [];

    // Analyze each tile
    for (const tile of tiles) {
      if (!tile.data) {
        continue;
      }

      const analysis = await this.analyzeTile(tile);

      // Add objects as nodes
      if (analysis.objects) {
        for (const obj of analysis.objects) {
          const nodeId = `${tile.id}-${obj.label}-${nodes.length}`;
          nodes.push({
            id: nodeId,
            type: obj.label,
            label: obj.label,
            position: {
              x: tile.x + obj.bbox.x,
              y: tile.y + obj.bbox.y,
              width: obj.bbox.width,
              height: obj.bbox.height,
            },
          });
        }
      }
    }

    // Infer spatial relationships
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const relation = this.inferSpatialRelation(nodes[i].position, nodes[j].position);
        if (relation) {
          edges.push({
            source: nodes[i].id,
            target: nodes[j].id,
            relation,
          });
        }
      }
    }

    return { nodes, edges };
  }

  private inferSpatialRelation(box1: BoundingBox, box2: BoundingBox): string | null {
    const center1 = {
      x: box1.x + box1.width / 2,
      y: box1.y + box1.height / 2,
    };
    const center2 = {
      x: box2.x + box2.width / 2,
      y: box2.y + box2.height / 2,
    };

    // Check containment
    if (this.contains(box1, box2)) {
      return 'contains';
    }
    if (this.contains(box2, box1)) {
      return 'contained_by';
    }

    // Check overlap
    if (this.overlaps(box1, box2)) {
      return 'overlaps';
    }

    // Check adjacency and direction
    const dx = center2.x - center1.x;
    const dy = center2.y - center1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 100) {
      // Close proximity
      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? 'right_of' : 'left_of';
      } else {
        return dy > 0 ? 'below' : 'above';
      }
    }

    return null;
  }

  private contains(box1: BoundingBox, box2: BoundingBox): boolean {
    return (
      box1.x <= box2.x &&
      box1.y <= box2.y &&
      box1.x + box1.width >= box2.x + box2.width &&
      box1.y + box1.height >= box2.y + box2.height
    );
  }

  private overlaps(box1: BoundingBox, box2: BoundingBox): boolean {
    return !(
      box1.x + box1.width < box2.x ||
      box2.x + box2.width < box1.x ||
      box1.y + box1.height < box2.y ||
      box2.y + box2.height < box1.y
    );
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async dispose(): Promise<void> {
    // Clean up resources if needed
    this.initialized = false;
    logger.info('[Florence2] Model disposed');
  }
}
