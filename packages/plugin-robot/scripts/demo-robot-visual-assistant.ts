#!/usr/bin/env node

/**
 * AiNex Robot Visual Assistant Demo
 * Demonstrates the integration of vision and robot control capabilities
 */

// Simulate the createUniqueUuid function since we can't import from @elizaos/core in a standalone demo
function createUniqueUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Simulate a mock runtime for demonstration
class MockRuntime {
  agentId = createUniqueUuid();
  character = {
    name: 'AiNex Robot Assistant',
    bio: ['I am an AI-powered humanoid robot with 24 degrees of freedom and visual perception capabilities'],
    system: 'You are controlling an AiNex humanoid robot. You can see through my camera, control my joints, and learn new motions through teaching.'
  };
  
  logger = {
    info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
    error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
    warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
    debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data || '')
  };

  getSetting(key: string): string | undefined {
    const settings: Record<string, string> = {
      USE_SIMULATION: 'true',
      ROBOT_SERIAL_PORT: '/dev/ttyUSB0',
      ROBOT_BAUD_RATE: '115200',
      ROS_WEBSOCKET_URL: 'ws://localhost:9090'
    };
    return settings[key];
  }

  services = new Map();
  
  getService(name: string) {
    return this.services.get(name);
  }
}

// Simulate robot state with proper typing
type RobotMode = 'IDLE' | 'MANUAL' | 'AUTONOMOUS' | 'TEACHING' | 'EMERGENCY_STOP';

const robotState = {
  mode: 'IDLE' as RobotMode,
  status: 'OK' as const,
  emergencyStop: false,
  joints: {
    head_yaw: { position: 0, velocity: 0, effort: 0 },
    head_pitch: { position: 0, velocity: 0, effort: 0 },
    left_shoulder_pitch: { position: 0, velocity: 0, effort: 0 },
    left_shoulder_roll: { position: 0, velocity: 0, effort: 0 },
    left_elbow_pitch: { position: 0, velocity: 0, effort: 0 },
    right_shoulder_pitch: { position: 0, velocity: 0, effort: 0 },
    right_shoulder_roll: { position: 0, velocity: 0, effort: 0 },
    right_elbow_pitch: { position: 0, velocity: 0, effort: 0 },
    waist_yaw: { position: 0, velocity: 0, effort: 0 },
    left_hip_pitch: { position: 0, velocity: 0, effort: 0 },
    left_hip_roll: { position: 0, velocity: 0, effort: 0 },
    left_knee_pitch: { position: 0, velocity: 0, effort: 0 },
    left_ankle_pitch: { position: 0, velocity: 0, effort: 0 },
    left_ankle_roll: { position: 0, velocity: 0, effort: 0 },
    right_hip_pitch: { position: 0, velocity: 0, effort: 0 },
    right_hip_roll: { position: 0, velocity: 0, effort: 0 },
    right_knee_pitch: { position: 0, velocity: 0, effort: 0 },
    right_ankle_pitch: { position: 0, velocity: 0, effort: 0 },
    right_ankle_roll: { position: 0, velocity: 0, effort: 0 }
  },
  battery: 85,
  temperature: 32,
  imu: {
    orientation: { x: 0, y: 0, z: 0, w: 1 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    linearAcceleration: { x: 0, y: 0, z: 9.81 }
  }
};

// Simulate vision capabilities
const visionCapabilities = {
  currentScene: {
    objects: ['desk', 'laptop', 'coffee cup', 'person'],
    people: [{ name: 'Unknown', position: 'in front', distance: '2 meters' }],
    text: ['ElizaOS', 'Robot Control'],
    description: 'I see a workspace with a desk, laptop, and coffee cup. There is a person standing in front of me.'
  }
};

// Demonstrate scenarios
async function runScenario(title: string, interactions: Array<{user: string, action: () => void}>) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📋 ${title}`);
  console.log(`${'═'.repeat(60)}\n`);
  
  for (const interaction of interactions) {
    console.log(`👤 User: "${interaction.user}"`);
    await new Promise(resolve => setTimeout(resolve, 500));
    interaction.action();
    console.log();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Main demo function
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          AiNex Robot Visual Assistant Demo                   ║');
  console.log('║     Integrating Vision, Control, and Learning                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const runtime = new MockRuntime();

  console.log('🤖 Robot Assistant: Hello! I am your AiNex humanoid robot assistant.');
  console.log('   I have 24 degrees of freedom and advanced visual perception.\n');

  // Scenario 1: Visual Perception
  await runScenario('Scenario 1: Visual Perception & Understanding', [
    {
      user: 'What do you see?',
      action: () => {
        console.log('🤖 Robot: Looking around...');
        console.log(`   📷 I see ${visionCapabilities.currentScene.description}`);
        console.log('   Objects detected:', visionCapabilities.currentScene.objects.join(', '));
      }
    },
    {
      user: 'Can you read any text?',
      action: () => {
        console.log('🤖 Robot: Analyzing text in view...');
        console.log(`   📝 I can see text that says: "${visionCapabilities.currentScene.text.join('", "')}"`);
      }
    },
    {
      user: 'Look at the person and wave',
      action: () => {
        console.log('🤖 Robot: Tracking person and preparing to wave...');
        console.log('   👁️ Person detected: 2 meters away, directly in front');
        console.log('   🎯 Moving head_yaw to face person (0.0 rad)');
        console.log('   👋 Executing wave motion:');
        console.log('      - right_shoulder_pitch → -1.2 rad');
        console.log('      - right_elbow_pitch → -0.5 rad');
        console.log('      - Moving hand side to side...');
        console.log('   ✅ Wave complete!');
      }
    }
  ]);

  // Scenario 2: Robot Control
  await runScenario('Scenario 2: Direct Robot Control', [
    {
      user: 'Move your head to look left',
      action: () => {
        console.log('🤖 Robot: Moving head to look left...');
        console.log('   🎯 Setting head_yaw to 0.785 rad (45°)');
        robotState.joints.head_yaw.position = 0.785;
        console.log('   ✅ Head moved to left position');
      }
    },
    {
      user: 'Stand in a ready position',
      action: () => {
        console.log('🤖 Robot: Moving to ready stance...');
        console.log('   🦿 Adjusting leg positions:');
        console.log('      - hip_pitch: -0.1 rad');
        console.log('      - knee_pitch: 0.2 rad');
        console.log('      - ankle_pitch: -0.1 rad');
        console.log('   🦾 Adjusting arm positions:');
        console.log('      - shoulder_pitch: -0.2 rad');
        console.log('      - elbow_pitch: -0.5 rad');
        console.log('   ✅ Ready position achieved');
      }
    },
    {
      user: 'Show me your battery level',
      action: () => {
        console.log('🤖 Robot: Checking system status...');
        console.log(`   🔋 Battery: ${robotState.battery}%`);
        console.log(`   🌡️ Temperature: ${robotState.temperature}°C`);
        console.log(`   📊 IMU Status: Stable (upright orientation)`);
        console.log(`   ⚙️ All servos: Operational`);
      }
    }
  ]);

  // Scenario 3: Teaching Mode
  await runScenario('Scenario 3: Teaching by Demonstration', [
    {
      user: 'Enter teaching mode',
      action: () => {
        robotState.mode = 'TEACHING';
        console.log('🤖 Robot: Teaching mode activated!');
        console.log('   🎓 Servos are now compliant');
        console.log('   👐 You can now move my joints manually');
        console.log('   💡 Say "record pose" when you want to save a position');
      }
    },
    {
      user: 'Record this pose as greeting',
      action: () => {
        console.log('🤖 Robot: Recording current pose...');
        console.log('   📸 Captured joint positions:');
        console.log('      - right_shoulder_pitch: -0.8 rad');
        console.log('      - right_elbow_pitch: -1.2 rad');
        console.log('      - left_shoulder_pitch: -0.8 rad');
        console.log('   💾 Pose saved as "greeting"');
      }
    },
    {
      user: 'Save this motion sequence as handshake',
      action: () => {
        console.log('🤖 Robot: Recording motion sequence...');
        console.log('   🎬 Recording keyframes:');
        console.log('      Frame 1: Arm extended forward');
        console.log('      Frame 2: Hand open position');
        console.log('      Frame 3: Grip position');
        console.log('      Frame 4: Shake motion (3 cycles)');
        console.log('   💾 Motion "handshake" saved with 4 keyframes');
        console.log('   ⏱️ Total duration: 3.5 seconds');
      }
    }
  ]);

  // Scenario 4: Autonomous Behavior
  await runScenario('Scenario 4: Autonomous Visual-Motor Coordination', [
    {
      user: 'Track the coffee cup and point at it',
      action: () => {
        console.log('🤖 Robot: Searching for coffee cup...');
        console.log('   👁️ Object detected: Coffee cup at 30° right, 1.5m away');
        console.log('   🎯 Tracking object:');
        console.log('      - head_yaw → -0.524 rad (tracking)');
        console.log('      - head_pitch → -0.2 rad (looking down)');
        console.log('   👉 Pointing gesture:');
        console.log('      - right_shoulder_pitch → -0.5 rad');
        console.log('      - right_shoulder_roll → -0.3 rad');
        console.log('      - right_elbow_pitch → 0.0 rad (extended)');
        console.log('   ✅ Pointing at coffee cup');
      }
    },
    {
      user: 'If you see a person, wave. Otherwise, nod.',
      action: () => {
        console.log('🤖 Robot: Analyzing scene...');
        console.log('   👁️ Person detected in view!');
        console.log('   🤔 Decision: Execute wave gesture');
        console.log('   👋 Performing wave motion...');
        console.log('   ✅ Social gesture completed');
      }
    }
  ]);

  // Scenario 5: Safety Features
  await runScenario('Scenario 5: Safety and Emergency Response', [
    {
      user: 'What are your safety limits?',
      action: () => {
        console.log('🤖 Robot: My safety features include:');
        console.log('   ⚠️ Joint limits: Each joint has min/max position limits');
        console.log('   🚄 Velocity limits: Max 2.0 rad/s for safety');
        console.log('   🎯 Acceleration limits: Max 5.0 rad/s² for smooth motion');
        console.log('   🛡️ Collision detection: IMU-based fall detection');
        console.log('   🛑 Emergency stop: Instant halt on command');
      }
    },
    {
      user: 'Emergency stop!',
      action: () => {
        robotState.mode = 'EMERGENCY_STOP';
        robotState.emergencyStop = true;
        console.log('🤖 Robot: ⚠️ EMERGENCY STOP ACTIVATED!');
        console.log('   🛑 All motors halted immediately');
        console.log('   🔒 Motion commands disabled');
        console.log('   📢 Waiting for reset command...');
      }
    },
    {
      user: 'Reset emergency stop',
      action: () => {
        robotState.mode = 'IDLE';
        robotState.emergencyStop = false;
        console.log('🤖 Robot: Emergency stop cleared');
        console.log('   ✅ Systems back online');
        console.log('   🔄 Running self-diagnostic...');
        console.log('   ✅ All systems operational');
      }
    }
  ]);

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    Demo Summary                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('🎯 Demonstrated Capabilities:');
  console.log('   ✅ Visual perception and scene understanding');
  console.log('   ✅ Natural language robot control');
  console.log('   ✅ Teaching by demonstration');
  console.log('   ✅ Visual-motor coordination');
  console.log('   ✅ Safety features and emergency response\n');

  console.log('🔧 Technical Features:');
  console.log('   • 24 DOF control with safety limits');
  console.log('   • Serial communication (115200 baud)');
  console.log('   • ROS 2 integration via WebSocket');
  console.log('   • IMU-based balance and fall detection');
  console.log('   • Motion recording and playback');
  console.log('   • Real-time visual processing\n');

  console.log('📚 Available Commands:');
  console.log('   • Movement: "Move [joint] to [angle]"');
  console.log('   • Vision: "What do you see?", "Look at [object]"');
  console.log('   • Teaching: "Enter teaching mode", "Record pose as [name]"');
  console.log('   • Motions: "Execute motion [name]", "Wave", "Point at [object]"');
  console.log('   • Safety: "Emergency stop", "Show status"\n');

  console.log('🚀 Next Steps:');
  console.log('   1. Install dependencies: npm install');
  console.log('   2. Run setup: ./scripts/setup-robot.sh');
  console.log('   3. Start simulation or connect hardware');
  console.log('   4. Launch ElizaOS with robot character\n');

  console.log('💡 For more information, see:');
  console.log('   • README.md - Getting started guide');
  console.log('   • docs/ROBOT_IMPLEMENTATION_COMPLETE.md - Full documentation');
  console.log('   • src/tests/e2e/robot-control.ts - Test examples\n');

  console.log('✨ Demo complete! The AiNex robot is ready to assist you.');
}

// Run the demo
main().catch(console.error);

// Export to make this a module
export {}; 