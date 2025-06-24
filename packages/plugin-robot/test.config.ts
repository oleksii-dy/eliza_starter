// Test configuration for robot plugin E2E tests
export const testConfig = {
  // Test environment settings
  environment: {
    NODE_ENV: 'test',
    USE_MOCK_ROBOT: 'true',
    ELIZA_TEST: 'true',
    LOG_LEVEL: 'info',
  },

  // Mock robot configuration
  mockRobot: {
    simulateDelay: true,
    defaultDelay: 50,
    failureRate: 0,
    updateRate: 10, // Hz
    imuUpdateRate: 50, // Hz
  },

  // Test timeouts
  timeouts: {
    connection: 5000,
    command: 2000,
    motion: 10000,
    test: 30000,
  },

  // Test data
  testPoses: {
    home: {
      name: 'home',
      joints: {} as { [name: string]: number }, // All zeros
      duration: 2000,
    },
    wave: {
      name: 'wave',
      joints: {
        right_shoulder_pitch: -1.57,
        right_elbow_pitch: -0.5,
        right_wrist_pitch: 0.5,
      },
      duration: 1500,
    },
    ready: {
      name: 'ready',
      joints: {
        left_shoulder_pitch: 0.3,
        right_shoulder_pitch: 0.3,
        left_elbow_pitch: -0.5,
        right_elbow_pitch: -0.5,
      },
      duration: 1000,
    },
  },

  // Test commands
  testCommands: [
    'Move your head to look left',
    'Wave hello',
    'Stand in ready position',
    'Move your right arm up 45 degrees',
    'Stop all movement',
    'Enter teaching mode',
    'Record this pose as greeting',
    'Execute motion wave',
  ],

  // Expected responses
  expectedResponses: {
    movement: /moved|moving|looking/i,
    wave: /waving|hello/i,
    stop: /stopped|halted/i,
    teaching: /teaching mode|record poses/i,
    error: /cannot|failed|error/i,
  },

  // Test character
  testCharacter: {
    name: 'TestRobot',
    bio: ['I am a test robot for E2E testing'],
    system: 'You are a helpful robot assistant for testing purposes.',
    plugins: ['@elizaos/plugin-robot'],
    settings: {
      USE_MOCK_ROBOT: 'true',
      MOCK_SIMULATE_DELAY: 'true',
      MOCK_DEFAULT_DELAY: '50',
      ROBOT_UPDATE_RATE: '10',
      IMU_UPDATE_RATE: '50',
      MAX_JOINT_VELOCITY: '2.0',
      MAX_JOINT_ACCELERATION: '5.0',
      FALL_DETECTION_THRESHOLD: '15.0',
      TEMPERATURE_LIMIT: '80.0',
    },
  },
};

export default testConfig;
