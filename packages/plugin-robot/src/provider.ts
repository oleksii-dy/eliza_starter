// Vision provider - provides current visual perception data to the agent
import {
  type IAgentRuntime,
  type Memory,
  type Provider,
  type State,
  addHeader,
  logger,
} from '@elizaos/core';
import { type VisionService } from './service';

export const visionProvider: Provider = {
  name: 'VISION_PERCEPTION',
  description:
    'Provides current visual perception data including scene description, detected objects, and people. This provider is always active and provides real-time visual awareness.',
  position: 99, // High priority for vision context
  dynamic: false, // Always included - vision is a constant sense

  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const visionService = runtime.getService<VisionService>('VISION' as any);

    if (!visionService) {
      logger.warn('[visionProvider] VisionService not found.');
      return {
        values: {
          visionAvailable: false,
          sceneDescription: 'Vision service is not available.',
          cameraStatus: 'No camera connected',
        },
        text: addHeader('# Visual Perception', 'Vision service is not available.'),
        data: { hasVision: false },
      };
    }

    // Get current scene description (enhanced if screen is enabled)
    const sceneDescription =
      (await visionService.getEnhancedSceneDescription()) ||
      (await visionService.getSceneDescription());
    const cameraInfo = visionService.getCameraInfo();
    const isActive = visionService.isActive();
    const visionMode = visionService.getVisionMode();
    const screenCapture = await visionService.getScreenCapture();

    let perceptionText = '';
    let values = {};
    let data = {};

    if (!isActive) {
      perceptionText = `Vision mode: ${visionMode}\n`;
      if (visionMode === 'OFF') {
        perceptionText += 'Vision is disabled.';
      } else {
        perceptionText += 'Vision service is initializing...';
      }

      values = {
        visionAvailable: false,
        visionMode,
        sceneDescription: 'Vision not active',
        cameraStatus: cameraInfo
          ? `Camera "${cameraInfo.name}" detected but not active`
          : 'No camera',
      };
    } else {
      perceptionText = `Vision mode: ${visionMode}\n\n`;

      // Camera vision data
      if ((visionMode === 'CAMERA' || visionMode === 'BOTH') && sceneDescription) {
        const ageInSeconds = (Date.now() - sceneDescription.timestamp) / 1000;
        const secondsAgo = Math.round(ageInSeconds);

        perceptionText += `Camera view (${secondsAgo}s ago):\n${sceneDescription.description}`;

        if (sceneDescription.people.length > 0) {
          perceptionText += `\n\nPeople detected: ${sceneDescription.people.length}`;
          const poses = sceneDescription.people.map((p) => p.pose).filter((p) => p !== 'unknown');
          const facings = sceneDescription.people
            .map((p) => p.facing)
            .filter((f) => f !== 'unknown');

          if (poses.length > 0) {
            const poseCounts = poses.reduce(
              (acc, pose) => {
                acc[pose] = (acc[pose] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            );
            perceptionText +=
              '\n  Poses: ' +
              Object.entries(poseCounts)
                .map(([pose, count]) => `${count} ${pose}`)
                .join(', ');
          }

          if (facings.length > 0) {
            const facingCounts = facings.reduce(
              (acc, facing) => {
                acc[facing] = (acc[facing] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            );
            perceptionText +=
              '\n  Facing: ' +
              Object.entries(facingCounts)
                .map(([facing, count]) => `${count} facing ${facing}`)
                .join(', ');
          }
        }

        if (sceneDescription.objects.length > 0) {
          const objectTypes = sceneDescription.objects.map((o) => o.type);
          const uniqueObjects = [...new Set(objectTypes)];
          perceptionText += `\n\nObjects detected: ${uniqueObjects.join(', ')}`;
        }

        if (sceneDescription.sceneChanged) {
          perceptionText += `\n\nScene change: ${sceneDescription.changePercentage.toFixed(1)}% of pixels changed`;
        }
      }

      // Screen vision data
      if ((visionMode === 'SCREEN' || visionMode === 'BOTH') && screenCapture) {
        const screenAge = (Date.now() - screenCapture.timestamp) / 1000;
        const screenSecondsAgo = Math.round(screenAge);

        if (visionMode === 'BOTH') {
          perceptionText += '\n\n---\n\n';
        }

        perceptionText += `Screen capture (${screenSecondsAgo}s ago):\n`;
        perceptionText += `Resolution: ${screenCapture.width}x${screenCapture.height}\n`;

        // Enhanced scene data if available
        const enhanced = sceneDescription as any;
        if (enhanced?.screenAnalysis) {
          if (enhanced.screenAnalysis.activeTile?.analysis) {
            const tileAnalysis = enhanced.screenAnalysis.activeTile.analysis;

            if (tileAnalysis.summary) {
              perceptionText += `\nActive area: ${tileAnalysis.summary}`;
            }

            if (tileAnalysis.text) {
              perceptionText += `\n\nVisible text:\n"${tileAnalysis.text.substring(0, 200)}${tileAnalysis.text.length > 200 ? '...' : ''}"`;
            }

            if (tileAnalysis.objects && tileAnalysis.objects.length > 0) {
              const uiElements = tileAnalysis.objects.map((o) => o.type);
              const uniqueElements = [...new Set(uiElements)];
              perceptionText += `\n\nUI elements: ${uniqueElements.join(', ')}`;
            }
          }

          if (enhanced.screenAnalysis.focusedApp) {
            perceptionText += `\n\nActive application: ${enhanced.screenAnalysis.focusedApp}`;
          }
        }
      }

      values = {
        visionAvailable: true,
        visionMode,
        sceneDescription: sceneDescription?.description || 'Processing...',
        cameraStatus: cameraInfo ? `Connected to ${cameraInfo.name}` : 'No camera',
        cameraId: cameraInfo?.id,
        peopleCount: sceneDescription?.people.length || 0,
        objectCount: sceneDescription?.objects.length || 0,
        sceneAge: sceneDescription
          ? Math.round((Date.now() - sceneDescription.timestamp) / 1000)
          : null,
        lastChange: sceneDescription?.sceneChanged ? sceneDescription.changePercentage : 0,
        hasScreenCapture: !!screenCapture,
        screenResolution: screenCapture ? `${screenCapture.width}x${screenCapture.height}` : null,
      };

      data = {
        objects: sceneDescription?.objects || [],
        people: sceneDescription?.people || [],
        screenCapture: screenCapture || null,
        enhancedData: (sceneDescription as any)?.screenAnalysis || null,
      };
    }

    return {
      values,
      text: addHeader('# Visual Perception', perceptionText),
      data,
    };
  },
};
