// Vision actions for scene analysis and image capture
import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
  type Media,
  ContentType,
  createUniqueUuid,
} from '@elizaos/core';
import { type VisionService } from './service';
import { VisionMode } from './types';

// Helper function to save execution record to message feed
async function saveExecutionRecord(
  runtime: IAgentRuntime,
  messageContext: Memory,
  thought: string,
  text: string,
  actions?: string[],
  attachments?: Media[]
): Promise<void> {
  const memory: Memory = {
    id: createUniqueUuid(runtime, `vision-record-${Date.now()}`),
    content: {
      text,
      thought,
      actions: actions || ['VISION_ANALYSIS'],
      attachments,
    },
    entityId: createUniqueUuid(runtime, runtime.agentId),
    agentId: runtime.agentId,
    roomId: messageContext.roomId,
    worldId: messageContext.worldId,
    createdAt: Date.now(),
  };
  await runtime.createMemory(memory, 'messages');
}

export const describeSceneAction: Action = {
  name: 'DESCRIBE_SCENE',
  similes: ['ANALYZE_SCENE', 'WHAT_DO_YOU_SEE', 'VISION_CHECK', 'LOOK_AROUND'],
  description:
    'Analyzes the current visual scene and provides a detailed description of what the agent sees through the camera.',
  validate: async (runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> => {
    const visionService = runtime.getService<VisionService>('VISION' as any);
    return !!visionService && visionService.isActive();
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback,
    _responses?: Memory[]
  ): Promise<void> => {
    const visionService = runtime.getService<VisionService>('VISION' as any);

    if (!visionService || !visionService.isActive()) {
      const thought = 'Vision service is not available or no camera is connected.';
      const text = 'I cannot see anything right now. No camera is available.';
      await saveExecutionRecord(runtime, message, thought, text, ['DESCRIBE_SCENE']);
      if (callback) {
        await callback({ 
          thought, 
          text,
          actions: ['DESCRIBE_SCENE']
        });
      }
      return;
    }

    try {
      const scene = await visionService.getSceneDescription();
      const cameraInfo = visionService.getCameraInfo();

      if (!scene) {
        const thought = 'Camera is connected but no scene has been analyzed yet.';
        const text = `Camera "${cameraInfo?.name}" is connected, but I haven't analyzed any scenes yet. Please wait a moment.`;
        await saveExecutionRecord(runtime, message, thought, text, ['DESCRIBE_SCENE']);
        if (callback) {
          await callback({ 
            thought, 
            text,
            actions: ['DESCRIBE_SCENE']
          });
        }
        return;
      }

      // Format the response
      const peopleCount = scene.people.length;
      const objectCount = scene.objects.length;
      const timestamp = new Date(scene.timestamp).toLocaleString();

      let description = `Looking through ${cameraInfo?.name || 'the camera'}, `;
      description += scene.description;

      if (peopleCount > 0) {
        description += `\n\nI can see ${peopleCount} ${peopleCount === 1 ? 'person' : 'people'}`;
        const facingData = scene.people.reduce(
          (acc, person) => {
            if (person.facing && person.facing !== 'unknown') {
              acc[person.facing] = (acc[person.facing] || 0) + 1;
            }
            return acc;
          },
          {} as Record<string, number>
        );

        if (Object.keys(facingData).length > 0) {
          const facingDescriptions = Object.entries(facingData).map(
            ([direction, count]) => `${count} facing ${direction}`
          );
          description += ` (${facingDescriptions.join(', ')})`;
        }
        description += '.';
      }

      if (objectCount > 0) {
        const objectTypes = scene.objects.reduce(
          (acc, obj) => {
            acc[obj.type] = (acc[obj.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        const objectDescriptions = Object.entries(objectTypes).map(
          ([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`
        );
        description += `\n\nObjects detected: ${objectDescriptions.join(', ')}.`;
      }

      if (scene.sceneChanged && scene.changePercentage) {
        description += `\n\n(Scene changed by ${scene.changePercentage.toFixed(1)}% since last analysis)`;
      }

      const thought = `Analyzed the visual scene at ${timestamp}.`;
      const text = description;

      await saveExecutionRecord(runtime, message, thought, text, ['DESCRIBE_SCENE']);
      if (callback) {
        await callback({ 
          thought, 
          text,
          actions: ['DESCRIBE_SCENE']
        });
      }
    } catch (error: any) {
      logger.error('[describeSceneAction] Error analyzing scene:', error);
      const thought = 'An error occurred while trying to analyze the visual scene.';
      const text = `Error analyzing scene: ${error.message}`;
      await saveExecutionRecord(runtime, message, thought, text, ['DESCRIBE_SCENE']);
      if (callback) {
        await callback({ 
          thought, 
          text,
          actions: ['DESCRIBE_SCENE']
        });
      }
    }
  },
  examples: [
    [
      { name: 'user', content: { text: 'what do you see?' } },
      {
        name: 'agent',
        content: {
          actions: ['DESCRIBE_SCENE'],
          thought: 'The user wants to know what I can see through my camera.',
          text: 'I see a room with a desk and computer setup. There are 2 people, one is sitting and one is standing.',
        },
      },
    ],
    [
      { name: 'user', content: { text: 'describe the scene' } },
      {
        name: 'agent',
        content: {
          actions: ['DESCRIBE_SCENE'],
        },
      },
    ],
  ],
};

export const captureImageAction: Action = {
  name: 'CAPTURE_IMAGE',
  similes: ['TAKE_PHOTO', 'SCREENSHOT', 'CAPTURE_FRAME', 'TAKE_PICTURE'],
  description: 'Captures the current frame from the camera and saves it as an image attachment.',
  validate: async (runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> => {
    const visionService = runtime.getService<VisionService>('VISION' as any);
    return !!visionService && visionService.isActive();
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback,
    _responses?: Memory[]
  ): Promise<void> => {
    const visionService = runtime.getService<VisionService>('VISION' as any);

    if (!visionService || !visionService.isActive()) {
      const thought = 'Vision service is not available or no camera is connected.';
      const text = 'I cannot capture an image right now. No camera is available.';
      await saveExecutionRecord(runtime, message, thought, text, ['CAPTURE_IMAGE']);
      if (callback) {
        await callback({ 
          thought, 
          text,
          actions: ['CAPTURE_IMAGE']
        });
      }
      return;
    }

    try {
      const imageBuffer = await visionService.captureImage();
      const cameraInfo = visionService.getCameraInfo();

      if (!imageBuffer) {
        const thought = 'Failed to capture image from camera.';
        const text = 'I could not capture an image from the camera. Please try again.';
        await saveExecutionRecord(runtime, message, thought, text, ['CAPTURE_IMAGE']);
        if (callback) {
          await callback({ 
            thought, 
            text,
            actions: ['CAPTURE_IMAGE']
          });
        }
        return;
      }

      // Create image attachment
      const attachmentId = createUniqueUuid(runtime, `capture-${Date.now()}`);
      const timestamp = new Date().toISOString();
      
      const imageAttachment: Media = {
        id: attachmentId,
        title: `Camera Capture - ${timestamp}`,
        contentType: ContentType.IMAGE,
        source: `camera:${cameraInfo?.name || 'unknown'}`,
        url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
      };

      const thought = `Captured an image from camera "${cameraInfo?.name}".`;
      const text = `I've captured an image from the camera at ${timestamp}.`;

      await saveExecutionRecord(
        runtime,
        message,
        thought,
        text,
        ['CAPTURE_IMAGE'],
        [imageAttachment]
      );

      if (callback) {
        await callback({
          thought,
          text,
          actions: ['CAPTURE_IMAGE'],
          attachments: [imageAttachment],
        });
      }
    } catch (error: any) {
      logger.error('[captureImageAction] Error capturing image:', error);
      const thought = 'An error occurred while trying to capture an image.';
      const text = `Error capturing image: ${error.message}`;
      await saveExecutionRecord(runtime, message, thought, text, ['CAPTURE_IMAGE']);
      if (callback) {
        await callback({ 
          thought, 
          text,
          actions: ['CAPTURE_IMAGE']
        });
      }
    }
  },
  examples: [
    [
      { name: 'user', content: { text: 'take a photo' } },
      {
        name: 'agent',
        content: {
          actions: ['CAPTURE_IMAGE'],
          thought: 'The user wants me to capture an image from the camera.',
          text: "I've captured an image from the camera.",
        },
      },
    ],
    [
      { name: 'user', content: { text: 'capture the current scene' } },
      {
        name: 'agent',
        content: {
          actions: ['CAPTURE_IMAGE'],
        },
      },
    ],
  ],
};

export const killAutonomousAction: Action = {
  name: 'KILL_AUTONOMOUS',
  similes: ['STOP_AUTONOMOUS', 'HALT_AUTONOMOUS', 'KILL_AUTO_LOOP'],
  description: 'Stops the autonomous agent loop for debugging purposes.',
  validate: async (runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> => {
    // Always allow this action for debugging
    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback,
    _responses?: Memory[]
  ): Promise<void> => {
    try {
      // Try to get the autonomous service and stop it
      const autonomousService = runtime.getService('AUTONOMOUS' as any);

      if (autonomousService && 'stop' in autonomousService) {
        await (autonomousService as any).stop();

        const thought = 'Successfully stopped the autonomous agent loop.';
        const text =
          'Autonomous loop has been killed. The agent will no longer run autonomously until restarted.';

        await saveExecutionRecord(runtime, message, thought, text, ['KILL_AUTONOMOUS']);
        if (callback) {
          await callback({ 
            thought, 
            text,
            actions: ['KILL_AUTONOMOUS']
          });
        }
      } else {
        const thought = 'Autonomous service not found or already stopped.';
        const text = 'No autonomous loop was running or the service could not be found.';

        await saveExecutionRecord(runtime, message, thought, text, ['KILL_AUTONOMOUS']);
        if (callback) {
          await callback({ 
            thought, 
            text,
            actions: ['KILL_AUTONOMOUS']
          });
        }
      }
    } catch (error: any) {
      logger.error('[killAutonomousAction] Error stopping autonomous service:', error);

      const thought = 'An error occurred while trying to stop the autonomous loop.';
      const text = `Error stopping autonomous loop: ${error.message}`;

      await saveExecutionRecord(runtime, message, thought, text, ['KILL_AUTONOMOUS']);
      if (callback) {
        await callback({ 
          thought, 
          text,
          actions: ['KILL_AUTONOMOUS']
        });
      }
    }
  },
  examples: [
    [
      { name: 'user', content: { text: 'kill the autonomous loop' } },
      {
        name: 'agent',
        content: {
          actions: ['KILL_AUTONOMOUS'],
          thought: 'The user wants to stop the autonomous agent loop for debugging.',
          text: 'Autonomous loop has been killed. The agent will no longer run autonomously until restarted.',
        },
      },
    ],
    [
      { name: 'user', content: { text: 'stop autonomous mode' } },
      {
        name: 'agent',
        content: {
          actions: ['KILL_AUTONOMOUS'],
        },
      },
    ],
  ],
};

export const setVisionModeAction: Action = {
  name: 'SET_VISION_MODE',
  description: 'Set the vision mode to OFF, CAMERA, SCREEN, or BOTH',
  similes: [
    'change vision to {mode}',
    'set vision mode {mode}',
    'switch to {mode} vision',
    'turn vision {mode}',
    'use {mode} vision',
    'enable {mode} vision',
    'disable vision',
  ],
  validate: async (runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> => {
    const visionService = runtime.getService<VisionService>('VISION' as any);
    return visionService !== null;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback,
    _responses?: Memory[]
  ): Promise<void> => {
    const visionService = runtime.getService<VisionService>('VISION' as any);
    
    if (!visionService) {
      const thought = 'Vision service is not available.';
      const text = 'I cannot change vision mode because the vision service is not available.';
      await saveExecutionRecord(runtime, message, thought, text, ['SET_VISION_MODE']);
      if (callback) {
        await callback({ 
          thought, 
          text,
          actions: ['SET_VISION_MODE']
        });
      }
      return;
    }

    try {
      // Extract the desired mode from the message
      const messageText = message.content.text?.toLowerCase() || '';
      let newMode: VisionMode | null = null;
      
      if (messageText.includes('off') || messageText.includes('disable')) {
        newMode = VisionMode.OFF;
      } else if (messageText.includes('both')) {
        newMode = VisionMode.BOTH;
      } else if (messageText.includes('screen')) {
        newMode = VisionMode.SCREEN;
      } else if (messageText.includes('camera')) {
        newMode = VisionMode.CAMERA;
      }
      
      if (!newMode) {
        const thought = 'Could not determine the desired vision mode from the message.';
        const text = 'Please specify the vision mode: OFF, CAMERA, SCREEN, or BOTH.';
        await saveExecutionRecord(runtime, message, thought, text, ['SET_VISION_MODE']);
        if (callback) {
          await callback({ 
            thought, 
            text,
            actions: ['SET_VISION_MODE']
          });
        }
        return;
      }

      const currentMode = visionService.getVisionMode();
      await visionService.setVisionMode(newMode);

      const thought = `Changed vision mode from ${currentMode} to ${newMode}.`;
      let text = '';
      
      switch (newMode) {
        case VisionMode.OFF:
          text = 'Vision has been disabled. I will no longer process visual input.';
          break;
        case VisionMode.CAMERA:
          text = 'Vision mode set to CAMERA only. I will process input from the camera.';
          break;
        case VisionMode.SCREEN:
          text = 'Vision mode set to SCREEN only. I will analyze what\'s on your screen.';
          break;
        case VisionMode.BOTH:
          text = 'Vision mode set to BOTH. I will process input from both camera and screen.';
          break;
      }

      await saveExecutionRecord(runtime, message, thought, text, ['SET_VISION_MODE']);
      if (callback) {
        await callback({ 
          thought, 
          text,
          actions: ['SET_VISION_MODE']
        });
      }
    } catch (error: any) {
      logger.error('[setVisionModeAction] Error changing vision mode:', error);
      const thought = 'An error occurred while trying to change the vision mode.';
      const text = `Error changing vision mode: ${error.message}`;
      await saveExecutionRecord(runtime, message, thought, text, ['SET_VISION_MODE']);
      if (callback) {
        await callback({ 
          thought, 
          text,
          actions: ['SET_VISION_MODE']
        });
      }
    }
  },
  examples: [
    [
      { name: 'user', content: { text: 'set vision mode to screen' } },
      {
        name: 'agent',
        content: {
          actions: ['SET_VISION_MODE'],
          thought: 'The user wants to switch to screen vision mode.',
          text: 'Vision mode set to SCREEN only. I will analyze what\'s on your screen.',
        },
      },
    ],
    [
      { name: 'user', content: { text: 'enable both camera and screen vision' } },
      {
        name: 'agent',
        content: {
          actions: ['SET_VISION_MODE'],
          thought: 'The user wants to enable both vision inputs.',
          text: 'Vision mode set to BOTH. I will process input from both camera and screen.',
        },
      },
    ],
    [
      { name: 'user', content: { text: 'turn off vision' } },
      {
        name: 'agent',
        content: {
          actions: ['SET_VISION_MODE'],
          thought: 'The user wants to disable vision.',
          text: 'Vision has been disabled. I will no longer process visual input.',
        },
      },
    ],
  ],
};
