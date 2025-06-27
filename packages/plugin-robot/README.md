# @elizaos/plugin-robot

Comprehensive robot control plugin for the AiNex humanoid robot, providing motion control, vision integration, teaching by demonstration, and simulation support.

## Features

- **24 DOF Humanoid Control**: Full control of all joints via serial protocol
- **ROS 2 Integration**: Seamless connection to ROS 2 for simulation and distributed control
- **Vision System**: Integrated camera control with object detection and person tracking
- **Teaching by Demonstration**: Record and replay robot motions
- **Safety Features**: Joint limits, velocity limits, emergency stop
- **Simulation Support**: Gazebo integration for testing without hardware
- **RL Training**: Reinforcement learning environment for policy development

## Installation

```bash
npm install @elizaos/plugin-robot
```

## Configuration

### Environment Variables

```env
# Robot Hardware Configuration
ROBOT_SERIAL_PORT=/dev/ttyUSB0        # Serial port for servo communication
ROBOT_BAUD_RATE=115200                 # Baud rate for serial communication

# ROS 2 Configuration
ROS_WEBSOCKET_URL=ws://localhost:9090  # ROS 2 bridge WebSocket URL
USE_SIMULATION=false                    # Use Gazebo simulation instead of real hardware

# Vision Configuration (optional)
VISION_CAMERA_NAME="USB Camera"         # Camera device name
VISION_MODE=BOTH                        # OFF, CAMERA, SCREEN, or BOTH
ENABLE_FACE_RECOGNITION=true            # Enable face recognition features

# Safety Configuration
MAX_JOINT_VELOCITY=2.0                  # Maximum joint velocity (rad/s)
MAX_JOINT_ACCELERATION=5.0              # Maximum joint acceleration (rad/s²)
```

## Usage

### Basic Setup

```typescript
import { elizaos } from '@elizaos/core';
import robotPlugin from '@elizaos/plugin-robot';

// Register the plugin
elizaos.registerPlugin(robotPlugin);

// The plugin will automatically start the robot service
```

### Available Actions

#### 1. Robot Command Action

Direct control of robot joints and modes.

```
User: "Move the robot head yaw to 30 degrees"
Agent: "🎯 Moving head_yaw to 0.52 radians"

User: "Emergency stop!"
Agent: "🛑 Emergency stop activated! All robot movements halted."

User: "Set robot to manual mode"
Agent: "🤖 Robot mode set to: MANUAL"
```

#### 2. Teaching Action

Record and replay robot demonstrations.

```
User: "Start teaching the robot"
Agent: "🎓 Teaching mode activated! Move the robot to desired positions..."

User: "Record this pose as standing position"
Agent: "📸 Recorded pose: 'standing position'"

User: "Save this motion as wave hello"
Agent: "💾 Motion saved: 'wave hello'"

User: "Execute motion wave hello"
Agent: "🎬 Executing motion: 'wave hello'"
```

#### 3. Vision Actions

Integrated vision capabilities for scene understanding.

```
User: "What do you see?"
Agent: "Looking through the camera, I see a room with 2 people..."

User: "Take a photo"
Agent: "📷 I've captured an image from the camera"
```

## Robot Architecture

### Hardware Specifications

- **24 DOF**: 2 head, 8 per arm, 6 per leg
- **Servos**: HX-35H/HX-35HM high-voltage serial bus servos
- **Control**: Raspberry Pi 5 with STM32-based HAT
- **Camera**: 2-DOF camera rig with 120° FOV wide-angle camera

### Joint Naming Convention

```
Head: head_yaw, head_pitch
Arms: [left/right]_shoulder_[pitch/roll], [left/right]_elbow_pitch,
      [left/right]_wrist_[yaw/pitch], [left/right]_gripper
Legs: [left/right]_hip_[yaw/roll/pitch], [left/right]_knee_pitch,
      [left/right]_ankle_[pitch/roll]
```

### Serial Protocol

Communication with servos uses a binary protocol:

- Header: `0x55 0x55`
- Servo ID: 1-24
- Command types: MOVE, READ_POSITION, SET_SPEED, etc.
- Checksum validation

## ROS 2 Integration

### Topics

- `/joint_states` - Current joint positions (sensor_msgs/JointState)
- `/ainex_joint_commands` - Joint commands (trajectory_msgs/JointTrajectory)
- `/imu/data` - IMU sensor data (sensor_msgs/Imu)
- `/emergency_stop` - Emergency stop command (std_msgs/Bool)
- `/ainex_camera/image_compressed` - Compressed camera feed

### Launch Simulation

```bash
# Terminal 1: Start Gazebo with robot model
ros2 launch ainex_gazebo ainex_world.launch.py

# Terminal 2: Start ROS 2 WebSocket bridge
ros2 launch rosbridge_server rosbridge_websocket_launch.xml

# Terminal 3: Start ElizaOS with simulation mode
USE_SIMULATION=true npm start
```

## Safety Features

1. **Joint Limits**: Hardware and software limits on all joints
2. **Velocity Limiting**: Maximum joint velocities enforced
3. **Emergency Stop**: Hardware and software E-stop capabilities
4. **Fall Detection**: IMU-based fall detection and recovery
5. **Temperature Monitoring**: Joint temperature tracking
6. **Watchdog Timer**: Automatic stop on communication loss

## Development

### Project Structure

```
plugin-robot/
├── src/
│   ├── services/          # Core services
│   │   ├── robot-service.ts
│   │   └── vision-service.ts
│   ├── actions/           # Robot actions
│   │   ├── command-action.ts
│   │   └── teach-action.ts
│   ├── providers/         # State providers
│   │   └── state-provider.ts
│   ├── communication/     # Communication layer
│   │   ├── serial-protocol.ts
│   │   └── ros2-bridge.ts
│   └── control/           # Control algorithms
│       └── safety-monitor.ts
├── scripts/               # Setup and deployment
├── urdf/                  # Robot models
└── config/                # Configuration files
```

### Testing

```bash
# Run unit tests
npm test

# Run E2E tests with simulation
USE_SIMULATION=true npm run test:e2e

# Run specific test suite
npm test -- --grep "robot control"
```

### Building URDF Model

```bash
# Generate URDF from CAD models
python scripts/generate-urdf.py

# Validate URDF
check_urdf urdf/ainex-humanoid.urdf
```

## Troubleshooting

### Robot Not Connecting

1. Check serial port permissions: `sudo chmod 666 /dev/ttyUSB0`
2. Verify baud rate matches servo configuration
3. Ensure servos are powered on

### ROS 2 Connection Issues

1. Verify rosbridge is running: `ros2 node list`
2. Check WebSocket URL in configuration
3. Ensure ROS_DOMAIN_ID matches if using multiple machines

### Vision Not Working

1. Check camera permissions
2. Install required tools:
   - macOS: `brew install imagesnap`
   - Linux: `sudo apt-get install fswebcam`
   - Windows: Install ffmpeg

## Examples

### Basic Control Script

```typescript
// Get robot service
const robotService = runtime.getService('ROBOT');

// Move to home position
await robotService.moveJoint('head_yaw', 0);
await robotService.moveJoint('head_pitch', 0);

// Execute saved motion
await robotService.executeMotion('wave_hello');
```

### Teaching New Motion

```typescript
// Enter teaching mode
await robotService.setMode(RobotMode.TEACHING);

// Record poses
await robotService.recordPose('start');
// ... manually move robot ...
await robotService.recordPose('middle');
// ... manually move robot ...
await robotService.recordPose('end');

// Save motion
await robotService.saveMotion('custom_gesture', 'A custom gesture');
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## License

MIT
