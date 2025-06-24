#!/usr/bin/env bun
import { logger, ModelType } from '@elizaos/core';
import { VisionService } from '../../service';
import VisionCaptureLogTestSuite from './vision-capture-log';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple test runner for capture log test
async function runCaptureLogTest() {
  try {
    logger.info('🚀 Starting Vision Capture Log Test');
    logger.info('📸 This will capture 30 seconds of vision data');

    // Check if we have OpenAI API key for real VLM
    const useRealVLM = !!process.env.OPENAI_API_KEY;
    if (useRealVLM) {
      logger.info('✅ Using real OpenAI Vision model for image analysis');
    } else {
      logger.warn('⚠️  No OPENAI_API_KEY found - using mock responses');
      logger.warn('   Set OPENAI_API_KEY in .env for real image analysis');
    }

    // Check if Phase 2 features are enabled
    const enableObjectDetection = process.env.ENABLE_OBJECT_DETECTION === 'true';
    const enablePoseDetection = process.env.ENABLE_POSE_DETECTION === 'true';

    if (enableObjectDetection || enablePoseDetection) {
      logger.info('🚀 Phase 2 Features Enabled:');
      if (enableObjectDetection) {
        logger.info('   ✅ Object Detection (COCO-SSD)');
      }
      if (enablePoseDetection) {
        logger.info('   ✅ Pose Detection (PoseNet)');
      }
    } else {
      logger.info('ℹ️  Using Phase 1 motion-based detection');
      logger.info('   Set ENABLE_OBJECT_DETECTION=true or ENABLE_POSE_DETECTION=true for Phase 2');
    }

    // Create agent ID
    const agentId = `vision-test-${Date.now()}`;

    // Create a minimal runtime with vision service
    const runtime = {
      agentId,
      character: {
        id: agentId,
        name: 'Vision Test Agent',
        bio: ['An agent designed to test vision capabilities'],
        system: 'You have visual perception capabilities. Describe what you see accurately.',
        plugins: ['vision'],
        settings: {
          VISION_PIXEL_CHANGE_THRESHOLD: '25', // Lower threshold for more sensitive detection
        },
      },
      getSetting: (key: string) => {
        const settings: Record<string, string> = {
          CAMERA_NAME: '', // Use default camera
          PIXEL_CHANGE_THRESHOLD: '25',
          VISION_PIXEL_CHANGE_THRESHOLD: '25',
          OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
          ENABLE_OBJECT_DETECTION: process.env.ENABLE_OBJECT_DETECTION || 'false',
          ENABLE_POSE_DETECTION: process.env.ENABLE_POSE_DETECTION || 'false',
          VISION_ENABLE_OBJECT_DETECTION: process.env.ENABLE_OBJECT_DETECTION || 'false',
          VISION_ENABLE_POSE_DETECTION: process.env.ENABLE_POSE_DETECTION || 'false',
          // New interval settings
          TF_UPDATE_INTERVAL: process.env.TF_UPDATE_INTERVAL || '1000',
          VLM_UPDATE_INTERVAL: process.env.VLM_UPDATE_INTERVAL || '10000',
          TF_CHANGE_THRESHOLD: process.env.TF_CHANGE_THRESHOLD || '10',
          VLM_CHANGE_THRESHOLD: process.env.VLM_CHANGE_THRESHOLD || '50',
          VISION_TF_UPDATE_INTERVAL: process.env.TF_UPDATE_INTERVAL || '1000',
          VISION_VLM_UPDATE_INTERVAL: process.env.VLM_UPDATE_INTERVAL || '10000',
          VISION_TF_CHANGE_THRESHOLD: process.env.TF_CHANGE_THRESHOLD || '10',
          VISION_VLM_CHANGE_THRESHOLD: process.env.VLM_CHANGE_THRESHOLD || '50',
        };
        return settings[key] || process.env[key] || null;
      },
      getService: (name: string) => {
        if (name === 'VISION') {
          return visionService;
        }
        return null;
      },
      useModel: async (type: string, params: any) => {
        if (type === ModelType.IMAGE_DESCRIPTION) {
          if (useRealVLM) {
            // Use OpenAI's vision model
            try {
              const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [
                    {
                      role: 'user',
                      content: [
                        {
                          type: 'text',
                          text: 'Describe what you see in this image in detail. Include information about any people (their appearance, clothing, pose), objects (computers, furniture, etc.), and the overall setting.',
                        },
                        {
                          type: 'image_url',
                          image_url: {
                            url: params, // The base64 image URL
                          },
                        },
                      ],
                    },
                  ],
                  max_tokens: 300,
                }),
              });

              if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.statusText}`);
              }

              const data = await response.json();
              const description = data.choices[0].message.content;
              logger.debug(`[VLM] OpenAI response: ${description}`);
              return { description };
            } catch (error) {
              logger.error('[VLM] OpenAI API error:', error);
              return { description: 'Unable to analyze image due to API error' };
            }
          } else {
            // Mock response
            return {
              description:
                'Mock: I see a scene with various objects and details. The lighting appears normal and there are some items visible in the frame.',
            };
          }
        } else if (type === ModelType.TEXT_LARGE) {
          // Handle the fallback case
          if (useRealVLM && params.image) {
            try {
              const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [
                    {
                      role: 'user',
                      content: [
                        {
                          type: 'text',
                          text: params.prompt || 'Describe what you see in this image.',
                        },
                        {
                          type: 'image_url',
                          image_url: {
                            url: params.image,
                          },
                        },
                      ],
                    },
                  ],
                  max_tokens: 300,
                }),
              });

              if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.statusText}`);
              }

              const data = await response.json();
              return data.choices[0].message.content;
            } catch (error) {
              logger.error('[VLM] OpenAI API error:', error);
              return 'Unable to analyze image due to API error';
            }
          } else {
            return 'Mock: Test response for TEXT_LARGE model';
          }
        }
        return 'Test response';
      },
      logger,
    } as any;

    // Start vision service
    const visionService = await VisionService.start(runtime);
    runtime.services = new Map([['VISION', visionService]]);

    logger.info('✅ Runtime created with Vision service');

    // Run the capture log test
    const test = VisionCaptureLogTestSuite.tests[0];
    logger.info(`\n🧪 Running test: ${test.name}\n`);

    await test.fn(runtime);

    logger.info('\n✨ Vision capture log test completed!');
    logger.info('📁 Check the logs/ directory for captured data');

    // Cleanup
    if (visionService) {
      await visionService.stop();
    }

    process.exit(0);
  } catch (error) {
    logger.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runCaptureLogTest();
