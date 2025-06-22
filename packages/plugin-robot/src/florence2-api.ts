import { logger } from '@elizaos/core';
import type { Florence2Result, ScreenTile, BoundingBox } from './types';

interface Florence2Config {
  endpoint?: string;
  apiKey?: string;
  provider?: 'local' | 'azure' | 'huggingface' | 'replicate';
  timeout?: number;
}

export class Florence2API {
  private config: Florence2Config;
  private initialized = false;
  
  constructor(config?: Florence2Config) {
    this.config = {
      endpoint: config?.endpoint || process.env.FLORENCE2_ENDPOINT,
      apiKey: config?.apiKey || process.env.FLORENCE2_API_KEY,
      provider: config?.provider || (process.env.FLORENCE2_PROVIDER as any) || 'local',
      timeout: config?.timeout || 30000,
    };
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    logger.info('[Florence2API] Initializing...');
    
    // Validate configuration
    if (!this.config.endpoint && this.config.provider === 'local') {
      throw new Error('Florence2 endpoint not configured. Set FLORENCE2_ENDPOINT environment variable.');
    }
    
    if (!this.config.apiKey && ['azure', 'huggingface', 'replicate'].includes(this.config.provider!)) {
      throw new Error(`API key required for ${this.config.provider} provider. Set FLORENCE2_API_KEY.`);
    }
    
    // Set default endpoints based on provider
    if (!this.config.endpoint) {
      switch (this.config.provider) {
        case 'azure':
          this.config.endpoint = 'https://api.cognitive.microsoft.com/vision/v3.2/analyze';
          break;
        case 'huggingface':
          this.config.endpoint = 'https://api-inference.huggingface.co/models/microsoft/Florence-2-large';
          break;
        case 'replicate':
          this.config.endpoint = 'https://api.replicate.com/v1/predictions';
          break;
      }
    }
    
    this.initialized = true;
    logger.info(`[Florence2API] Initialized with ${this.config.provider} provider`);
  }
  
  async analyzeImage(imageBuffer: Buffer): Promise<Florence2Result> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      switch (this.config.provider) {
        case 'local':
          return await this.callLocalAPI(imageBuffer);
        case 'azure':
          return await this.callAzureAPI(imageBuffer);
        case 'huggingface':
          return await this.callHuggingFaceAPI(imageBuffer);
        case 'replicate':
          return await this.callReplicateAPI(imageBuffer);
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      logger.error('[Florence2API] API call failed:', error);
      throw error;
    }
  }
  
  private async callLocalAPI(imageBuffer: Buffer): Promise<Florence2Result> {
    const response = await fetch(this.config.endpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBuffer.toString('base64'),
        tasks: ['<CAPTION>', '<OD>', '<DENSE_REGION_CAPTION>'],
      }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });
    
    if (!response.ok) {
      throw new Error(`Local API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      caption: data['<CAPTION>'] || '',
      objects: this.parseObjects(data['<OD>'] || {}),
      regions: this.parseRegions(data['<DENSE_REGION_CAPTION>'] || {}),
      tags: this.extractTags(data),
    };
  }
  
  private async callAzureAPI(imageBuffer: Buffer): Promise<Florence2Result> {
    const response = await fetch(
      `${this.config.endpoint}?visualFeatures=Objects,Description,Tags&language=en`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.apiKey!,
          'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer,
        signal: AbortSignal.timeout(this.config.timeout!),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Azure API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      caption: data.description?.captions?.[0]?.text || '',
      objects: (data.objects || []).map((obj: any) => ({
        label: obj.object,
        bbox: {
          x: obj.rectangle.x,
          y: obj.rectangle.y,
          width: obj.rectangle.w,
          height: obj.rectangle.h,
        },
        confidence: obj.confidence,
      })),
      regions: [],
      tags: (data.tags || []).map((tag: any) => tag.name),
    };
  }
  
  private async callHuggingFaceAPI(imageBuffer: Buffer): Promise<Florence2Result> {
    const response = await fetch(this.config.endpoint!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: imageBuffer.toString('base64'),
        parameters: {
          task: '<CAPTION>',
        },
      }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });
    
    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // HuggingFace returns different formats, handle accordingly
    if (Array.isArray(data) && data[0]?.generated_text) {
      return {
        caption: data[0].generated_text,
        objects: [],
        regions: [],
        tags: [],
      };
    }
    
    return {
      caption: data.generated_text || data.caption || '',
      objects: [],
      regions: [],
      tags: [],
    };
  }
  
  private async callReplicateAPI(imageBuffer: Buffer): Promise<Florence2Result> {
    // Create prediction
    const createResponse = await fetch(this.config.endpoint!, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'e1fb2c3a3b0e4a0c8c0e4a0c8c0e4a0c8c0e4a0c', // Florence-2 model version
        input: {
          image: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
          task: '<CAPTION>',
        },
      }),
    });
    
    if (!createResponse.ok) {
      throw new Error(`Replicate API error: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const prediction = await createResponse.json();
    
    // Poll for results
    let result = prediction;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(result.urls.get, {
        headers: {
          'Authorization': `Token ${this.config.apiKey}`,
        },
      });
      
      if (!pollResponse.ok) {
        throw new Error(`Replicate polling error: ${pollResponse.status}`);
      }
      
      result = await pollResponse.json();
    }
    
    if (result.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${result.error}`);
    }
    
    return {
      caption: result.output?.caption || '',
      objects: [],
      regions: [],
      tags: [],
    };
  }
  
  private parseObjects(odData: any): Array<{ label: string; bbox: BoundingBox; confidence: number }> {
    if (!odData.bboxes || !odData.labels) return [];
    
    const objects: Array<{ label: string; bbox: BoundingBox; confidence: number }> = [];
    for (let i = 0; i < odData.bboxes.length; i++) {
      const bbox = odData.bboxes[i];
      objects.push({
        label: odData.labels[i],
        bbox: {
          x: bbox[0],
          y: bbox[1],
          width: bbox[2] - bbox[0],
          height: bbox[3] - bbox[1],
        },
        confidence: 0.8, // Florence-2 doesn't always provide confidence
      });
    }
    
    return objects;
  }
  
  private parseRegions(regionData: any): Array<{ description: string; bbox: BoundingBox }> {
    if (!regionData.bboxes || !regionData.labels) return [];
    
    const regions: Array<{ description: string; bbox: BoundingBox }> = [];
    for (let i = 0; i < regionData.bboxes.length; i++) {
      const bbox = regionData.bboxes[i];
      regions.push({
        description: regionData.labels[i],
        bbox: {
          x: bbox[0],
          y: bbox[1],
          width: bbox[2] - bbox[0],
          height: bbox[3] - bbox[1],
        },
      });
    }
    
    return regions;
  }
  
  private extractTags(data: any): string[] {
    const tags = new Set<string>();
    
    // Extract from caption
    if (data['<CAPTION>']) {
      const words = data['<CAPTION>'].toLowerCase().split(/\s+/);
      const commonTags = ['screen', 'window', 'desktop', 'application', 'browser', 'text', 'image'];
      words.forEach(word => {
        if (commonTags.includes(word)) {
          tags.add(word);
        }
      });
    }
    
    // Extract from objects
    if (data['<OD>']?.labels) {
      data['<OD>'].labels.forEach((label: string) => tags.add(label.toLowerCase()));
    }
    
    return Array.from(tags);
  }
  
  async analyzeTile(tile: ScreenTile): Promise<Florence2Result> {
    if (!tile.data) {
      throw new Error('Tile has no image data');
    }
    
    return this.analyzeImage(tile.data);
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  async dispose(): Promise<void> {
    this.initialized = false;
    logger.info('[Florence2API] Disposed');
  }
} 