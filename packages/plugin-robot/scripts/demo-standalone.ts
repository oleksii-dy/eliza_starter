#!/usr/bin/env node
import 'dotenv/config';
import { VisionService } from '../src/service.js';
import { visionPlugin } from '../src/index.js';
import { ModelType, logger } from '../../../node_modules/@elizaos/core/dist/index.js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Check for API keys
const openaiKey = process.env.OPENAI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

if (!openaiKey && !anthropicKey) {
  console.error('❌ No API key found. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY in your .env file');
  process.exit(1);
}

// Create AI clients
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

// Create a real runtime implementation
const runtime = {
  getSetting: (key: string) => {
    const settings: Record<string, string> = {
      'VISION_MODE': 'BOTH',
      'VISION_ENABLE_OBJECT_DETECTION': 'true',
      'VISION_ENABLE_POSE_DETECTION': 'true',
      'VISION_OCR_ENABLED': 'true',
      'VISION_FLORENCE2_ENABLED': 'true',
      'VISION_PIXEL_CHANGE_THRESHOLD': '30',
      'VISION_TF_UPDATE_INTERVAL': '2000',
      'VISION_VLM_UPDATE_INTERVAL': '5000',
      'VISION_SCREEN_CAPTURE_INTERVAL': '3000',
    };
    return settings[key] || process.env[key];
  },
  
  useModel: async (type: typeof ModelType[keyof typeof ModelType], input: any) => {
    console.log(`\n🤖 AI Model Request (${type})...`);
    
    if (type === ModelType.IMAGE_DESCRIPTION) {
      const imageData = typeof input === 'string' ? input : input.image;
      
      if (!imageData || !imageData.startsWith('data:image')) {
        return { description: 'No valid image data provided' };
      }
      
      try {
        if (openai) {
          // Use OpenAI Vision
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  { 
                    type: "text", 
                    text: "Describe what you see in this image. Be specific about objects, people, text, and the overall scene." 
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageData,
                      detail: "low"
                    }
                  }
                ]
              }
            ],
            max_tokens: 300
          });
          
          const description = response.choices[0]?.message?.content || 'Unable to describe image';
          console.log('✅ OpenAI Vision response received');
          return { description };
          
        } else if (anthropic) {
          // Use Anthropic Claude
          const base64Data = imageData.split(',')[1];
          const mediaTypeMatch = imageData.match(/data:image\/(.*?);/)?.[1] || 'jpeg';
          const mediaType = ['jpeg', 'png', 'gif', 'webp'].includes(mediaTypeMatch) 
            ? mediaTypeMatch as 'jpeg' | 'png' | 'gif' | 'webp'
            : 'jpeg';
          
          const response = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 300,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: `image/${mediaType}`,
                      data: base64Data
                    }
                  },
                  {
                    type: "text",
                    text: "Describe what you see in this image. Be specific about objects, people, text, and the overall scene."
                  }
                ]
              }
            ]
          });
          
          const description = response.content[0]?.type === 'text' 
            ? response.content[0].text 
            : 'Unable to describe image';
          console.log('✅ Anthropic Claude response received');
          return { description };
        }
      } catch (error) {
        console.error('❌ AI Vision error:', error);
        return { description: `Error: ${error.message}` };
      }
    }
    
    return 'Generic response';
  },
  
  logger,
  
  // Plugin management
  plugins: [] as any[],
  providers: [] as any[],
  actions: [] as any[],
  services: new Map(),
  
  registerPlugin: async function(plugin: any) {
    console.log(`\n🔌 Registering plugin: ${plugin.name}`);
    
    // Initialize services
    if (plugin.services) {
      for (const ServiceClass of plugin.services) {
        const service = await ServiceClass.start(this);
        this.services.set(ServiceClass.serviceName, service);
        console.log(`   ✅ Started service: ${ServiceClass.serviceName}`);
      }
    }
    
    // Register providers
    if (plugin.providers) {
      this.providers.push(...plugin.providers);
      console.log(`   ✅ Registered ${plugin.providers.length} providers`);
    }
    
    // Register actions
    if (plugin.actions) {
      this.actions.push(...plugin.actions);
      console.log(`   ✅ Registered ${plugin.actions.length} actions`);
    }
  },
  
  getService: function(name: string) {
    return this.services.get(name);
  }
} as any;

async function runDemo() {
  console.log('🎬 ElizaOS Vision Plugin - Standalone Demo');
  console.log('==========================================\n');
  
  console.log('📋 Configuration:');
  console.log(`   - AI Provider: ${openai ? 'OpenAI' : 'Anthropic'}`);
  console.log(`   - Vision Mode: BOTH (Camera + Screen)`);
  console.log(`   - Object Detection: Enabled`);
  console.log(`   - OCR: Enabled`);
  console.log(`   - Florence-2: Enabled (with fallback)`);
  
  try {
    // Register the vision plugin
    await runtime.registerPlugin(visionPlugin);
    
    // Get the vision service
    const visionService = runtime.getService('VISION');
    if (!visionService) {
      throw new Error('Vision service not found!');
    }
    
    console.log('\n📊 Vision Service Status:');
    console.log(`   - Mode: ${visionService.getVisionMode()}`);
    console.log(`   - Camera: ${visionService.getCameraInfo() ? '✅ Connected' : '❌ Not connected'}`);
    console.log(`   - Active: ${visionService.isActive() ? '✅ Yes' : '❌ No'}`);
    
    // Wait for initial captures
    console.log('\n⏳ Waiting for initial vision capture...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get and display scene description
    console.log('\n👁️ Current Scene Analysis:');
    console.log('─────────────────────────');
    
    const scene = await visionService.getSceneDescription();
    if (scene) {
      console.log(`\n📝 Description: ${scene.description}`);
      console.log(`\n📊 Details:`);
      console.log(`   - Timestamp: ${new Date(scene.timestamp).toLocaleTimeString()}`);
      console.log(`   - Objects Detected: ${scene.objects.length}`);
      console.log(`   - People Detected: ${scene.people.length}`);
      console.log(`   - Scene Changed: ${scene.sceneChanged ? 'Yes' : 'No'}`);
      console.log(`   - Change Amount: ${scene.changePercentage?.toFixed(1)}%`);
      
      if (scene.objects.length > 0) {
        console.log('\n📦 Detected Objects:');
        scene.objects.forEach(obj => {
          console.log(`   - ${obj.type} (${(obj.confidence * 100).toFixed(0)}% confidence)`);
        });
      }
      
      if (scene.people.length > 0) {
        console.log('\n👥 Detected People:');
        scene.people.forEach(person => {
          console.log(`   - Person: ${person.pose} pose, facing ${person.facing}`);
        });
      }
    } else {
      console.log('❌ No scene data available yet');
    }
    
    // Get screen capture info
    const screen = await visionService.getScreenCapture();
    if (screen) {
      console.log('\n🖥️ Screen Capture:');
      console.log(`   - Resolution: ${screen.width}x${screen.height}`);
      console.log(`   - Tiles: ${screen.tiles.length}`);
      
      const analyzedTiles = screen.tiles.filter(t => t.analysis);
      if (analyzedTiles.length > 0) {
        console.log(`   - Analyzed Tiles: ${analyzedTiles.length}`);
        
        const tile = analyzedTiles[0];
        if (tile.analysis?.ocr?.fullText) {
          console.log(`\n📄 OCR Text (first tile):`);
          console.log(`   "${tile.analysis.ocr.fullText.substring(0, 100)}..."`);
        }
      }
    }
    
    // Monitor for changes
    console.log('\n\n👀 Monitoring for vision updates (press Ctrl+C to stop)...');
    console.log('─────────────────────────────────────────────────────────\n');
    
    let updateCount = 0;
    const monitor = setInterval(async () => {
      const currentScene = await visionService.getSceneDescription();
      if (currentScene && currentScene.sceneChanged) {
        updateCount++;
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] 🔄 Update #${updateCount}:`);
        console.log(`   "${currentScene.description.substring(0, 100)}..."`);
        console.log(`   Change: ${currentScene.changePercentage?.toFixed(1)}% | Objects: ${currentScene.objects.length} | People: ${currentScene.people.length}\n`);
      }
    }, 1000);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      clearInterval(monitor);
      console.log('\n\n🛑 Shutting down...');
      console.log(`📊 Total updates detected: ${updateCount}`);
      await visionService.stop();
      console.log('✅ Vision service stopped');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\n❌ Demo Error:', error);
    process.exit(1);
  }
}

// Run the demo
console.log('Starting in 2 seconds...\n');
setTimeout(runDemo, 2000);