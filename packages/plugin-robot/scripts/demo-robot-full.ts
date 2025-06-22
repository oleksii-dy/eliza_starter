#!/usr/bin/env tsx

/**
 * ElizaOS Robot Control Plugin - Full Feature Demo
 * 
 * This script demonstrates all features of the robot control plugin
 * without requiring actual hardware or ROS 2 setup.
 */

import { logger } from '@elizaos/core';

// Mock implementations for demo
const mockRuntime = {
  agentId: 'demo-agent',
  getSetting: (key: string) => {
    const settings: Record<string, string> = {
      USE_SIMULATION: 'true',
      ROBOT_SERIAL_PORT: '/dev/ttyUSB0',
      ROS_WEBSOCKET_URL: 'ws://localhost:9090',
    };
    return settings[key];
  },
  getService: (name: string) => {
    if (name === 'ROBOT') return mockRobotService;
    return null;
  },
  logger,
};

// Mock robot service for demo
const mockRobotService = {
  isConnected: () => true,
  getState: () => ({
    timestamp: Date.now(),
    joints: Array.from({ length: 24 }, (_, i) => ({
      name: `joint_${i}`,
      position: 0,
      velocity: 0,
      effort: 0,
    })),
    isEmergencyStopped: false,
    mode: 'IDLE',
    status: 'OK',
  }),
  setMode: async (mode: string) => {
    console.log(`[Robot] Mode set to: ${mode}`);
  },
  moveJoint: async (joint: string, position: number) => {
    console.log(`[Robot] Moving ${joint} to ${position.toFixed(3)} rad`);
  },
  moveToPose: async (pose: any) => {
    console.log(`[Robot] Moving to pose: ${pose.name}`);
  },
  executeMotion: async (motion: string) => {
    console.log(`[Robot] Executing motion: ${motion}`);
  },
  emergencyStop: async () => {
    console.log(`[Robot] EMERGENCY STOP ACTIVATED!`);
  },
  releaseEmergencyStop: async () => {
    console.log(`[Robot] Emergency stop released`);
  },
  recordPose: async (name: string) => {
    console.log(`[Robot] Recorded pose: ${name}`);
  },
  saveMotion: async (name: string) => {
    console.log(`[Robot] Saved motion: ${name}`);
  },
  getStoredMotions: () => ['wave_hello', 'walk_forward', 'stand'],
};

// Demo scenarios
async function demoBasicControl() {
  console.log('\n=== Basic Joint Control Demo ===\n');
  
  // Move individual joints
  await mockRobotService.moveJoint('head_yaw', 0.523);
  await mockRobotService.moveJoint('head_pitch', -0.261);
  await mockRobotService.moveJoint('left_shoulder_pitch', -0.785);
  
  await delay(1000);
}

async function demoModeControl() {
  console.log('\n=== Mode Control Demo ===\n');
  
  // Switch between modes
  await mockRobotService.setMode('MANUAL');
  console.log('Robot is now in manual control mode');
  
  await delay(500);
  
  await mockRobotService.setMode('AUTONOMOUS');
  console.log('Robot is now in autonomous mode');
  
  await delay(500);
}

async function demoTeaching() {
  console.log('\n=== Teaching by Demonstration Demo ===\n');
  
  await mockRobotService.setMode('TEACHING');
  console.log('Teaching mode activated - move robot to desired positions');
  
  await delay(500);
  
  // Record poses
  await mockRobotService.recordPose('start_position');
  await delay(500);
  
  await mockRobotService.recordPose('middle_position');
  await delay(500);
  
  await mockRobotService.recordPose('end_position');
  await delay(500);
  
  // Save motion
  await mockRobotService.saveMotion('custom_gesture');
  console.log('Motion saved successfully!');
  
  await mockRobotService.setMode('IDLE');
}

async function demoMotionExecution() {
  console.log('\n=== Motion Execution Demo ===\n');
  
  const motions = mockRobotService.getStoredMotions();
  console.log('Available motions:', motions.join(', '));
  
  await mockRobotService.setMode('AUTONOMOUS');
  
  // Execute a motion
  await mockRobotService.executeMotion('wave_hello');
  console.log('Waving hello...');
  
  await delay(2000);
}

async function demoSafety() {
  console.log('\n=== Safety Features Demo ===\n');
  
  // Emergency stop
  console.log('Triggering emergency stop...');
  await mockRobotService.emergencyStop();
  
  await delay(1000);
  
  // Release emergency stop
  console.log('Releasing emergency stop...');
  await mockRobotService.releaseEmergencyStop();
  
  await delay(500);
}

async function demoPredefinedPoses() {
  console.log('\n=== Predefined Poses Demo ===\n');
  
  const poses = [
    { name: 'home', description: 'Home position' },
    { name: 'ready', description: 'Ready stance' },
    { name: 'sit', description: 'Sitting position' },
  ];
  
  for (const pose of poses) {
    console.log(`Moving to ${pose.description}...`);
    await mockRobotService.moveToPose(pose);
    await delay(1500);
  }
}

async function demoStateMonitoring() {
  console.log('\n=== State Monitoring Demo ===\n');
  
  const state = mockRobotService.getState();
  
  console.log('Robot State:');
  console.log(`- Mode: ${state.mode}`);
  console.log(`- Status: ${state.status}`);
  console.log(`- Emergency Stop: ${state.isEmergencyStopped ? 'ACTIVE' : 'Released'}`);
  console.log(`- Joint Count: ${state.joints.length}`);
  console.log(`- Sample Joint Positions:`);
  console.log(`  - head_yaw: ${state.joints[0].position.toFixed(3)} rad`);
  console.log(`  - left_shoulder_pitch: ${state.joints[2].position.toFixed(3)} rad`);
}

async function demoNaturalLanguageCommands() {
  console.log('\n=== Natural Language Commands Demo ===\n');
  
  const commands = [
    'Move the robot head yaw to 30 degrees',
    'Set robot to manual mode',
    'Go to home position',
    'Start teaching the robot',
    'Emergency stop!',
  ];
  
  console.log('Example natural language commands:');
  for (const cmd of commands) {
    console.log(`- "${cmd}"`);
  }
  
  console.log('\nProcessing: "Move the robot head yaw to 30 degrees"');
  await mockRobotService.moveJoint('head_yaw', 0.523); // 30 degrees in radians
}

// Helper function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ASCII art robot
function printRobotArt() {
  console.log(`
    ╔═══════════════════════════════════╗
    ║   AiNex Humanoid Robot Control    ║
    ║         ElizaOS Plugin            ║
    ╚═══════════════════════════════════╝
    
         ┌─────┐
         │ o o │  <- Camera (2 DOF)
         │  -  │
         └──┬──┘
      ┌─────┴─────┐
      │  ┌─┐ ┌─┐  │  <- Arms (8 DOF each)
      │  │ │ │ │  │
      │  │ │ │ │  │
      │  └─┘ └─┘  │
      └─────┬─────┘
          ┌─┴─┐
          │   │      <- Torso
          │   │
          ├───┤
         /│   │\\
        / │   │ \\    <- Legs (6 DOF each)
       /  │   │  \\
      /   │   │   \\
     ▓    ▓   ▓    ▓
    
    Total: 24 Degrees of Freedom
  `);
}

// Main demo sequence
async function runDemo() {
  printRobotArt();
  
  console.log('\n🤖 Starting ElizaOS Robot Control Demo...\n');
  console.log('This demo shows all features without requiring hardware.\n');
  
  await delay(2000);
  
  // Run all demos
  await demoBasicControl();
  await delay(1000);
  
  await demoModeControl();
  await delay(1000);
  
  await demoTeaching();
  await delay(1000);
  
  await demoMotionExecution();
  await delay(1000);
  
  await demoPredefinedPoses();
  await delay(1000);
  
  await demoSafety();
  await delay(1000);
  
  await demoStateMonitoring();
  await delay(1000);
  
  await demoNaturalLanguageCommands();
  
  console.log('\n✅ Demo Complete!\n');
  console.log('Features demonstrated:');
  console.log('- Direct joint control');
  console.log('- Mode switching');
  console.log('- Teaching by demonstration');
  console.log('- Motion execution');
  console.log('- Predefined poses');
  console.log('- Safety systems');
  console.log('- State monitoring');
  console.log('- Natural language commands');
  
  console.log('\nTo use with real hardware:');
  console.log('1. Connect AiNex robot via USB');
  console.log('2. Set USE_SIMULATION=false');
  console.log('3. Run: npm start');
  
  console.log('\nTo use with Gazebo simulation:');
  console.log('1. Start Gazebo and ROS 2 bridge');
  console.log('2. Set USE_SIMULATION=true');
  console.log('3. Run: npm start');
}

// Run the demo
runDemo().catch(console.error); 