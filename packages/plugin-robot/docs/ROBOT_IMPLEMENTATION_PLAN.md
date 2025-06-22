# AiNex Robot Control Plugin Implementation Plan

## Overview
Transform the existing vision plugin into a comprehensive robot control system for the AiNex humanoid robot, integrating with ROS 2, Gazebo simulation, and real hardware control.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ElizaOS Robot Plugin                       │
├─────────────────────────────────────────────────────────────┤
│  Services           │  Actions            │  Providers       │
│  - RobotService     │  - CommandAction    │  - StateProvider │
│  - SimulationService│  - GotoAction       │  - SensorProvider│
│  - VisionService    │  - TeachAction      │  - StatusProvider│
│  - RLService        │  - RecoverAction    │                  │
├─────────────────────────────────────────────────────────────┤
│                    Communication Layer                        │
│  - ROS 2 Bridge (roslibjs)                                  │
│  - WebSocket Server                                          │
│  - Serial Protocol (for real robot)                         │
├─────────────────────────────────────────────────────────────┤
│  Simulation         │  Real Robot         │  RL Environment  │
│  - Gazebo          │  - Raspberry Pi 5   │  - OpenAI Gym    │
│  - ros2_control    │  - STM32 HAT        │  - Stable Baselines│
│  - URDF Model      │  - Servo Control    │  - ONNX Export   │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Core Robot Service & Infrastructure
1. **Transform base plugin structure**
   - Rename from vision to robot plugin
   - Update package.json with robot dependencies
   - Create robot-specific types and interfaces

2. **Create RobotService**
   - Servo control interface (24 DOF)
   - Serial communication protocol
   - Joint state management
   - Safety features (limits, emergency stop)

3. **ROS 2 Bridge Implementation**
   - WebSocket connection via roslibjs
   - Topic publishers/subscribers
   - Service clients
   - Action clients

### Phase 2: Actions & Control
1. **CommandAction**
   - Direct joint control
   - Pose execution
   - Motion sequences

2. **GotoAction**
   - Navigation to positions
   - Path planning integration
   - Obstacle avoidance

3. **TeachAction**
   - Record demonstrations
   - Playback sequences
   - Save/load motions

4. **RecoverAction**
   - Fall detection
   - Safe recovery sequences
   - Error handling

### Phase 3: Simulation Integration
1. **SimulationService**
   - Gazebo connection
   - URDF model loading
   - Physics simulation control

2. **URDF Generation**
   - Convert CAD models
   - Joint definitions
   - Collision meshes
   - Inertial properties

3. **ros2_control Integration**
   - Hardware interface
   - Controllers configuration
   - Launch files

### Phase 4: Vision Integration
1. **Adapt existing VisionService**
   - Camera rig control (2 DOF)
   - Object tracking for manipulation
   - Person following
   - Visual servoing

2. **Enhanced Perception**
   - 3D pose estimation
   - Object grasping points
   - Environment mapping

### Phase 5: RL Training Environment
1. **RLService**
   - OpenAI Gym environment
   - Reward functions
   - State/action spaces
   - Episode management

2. **Training Infrastructure**
   - Stable Baselines 3 integration
   - Curriculum learning
   - Sim-to-real transfer
   - ONNX model export

### Phase 6: Deployment & Safety
1. **Deployment Scripts**
   - Raspberry Pi 5 setup
   - Service installation
   - Auto-start configuration

2. **Safety Systems**
   - Joint limit enforcement
   - Collision detection
   - Emergency stop
   - Watchdog timers

## File Structure

```
packages/plugin-robot/
├── src/
│   ├── index.ts                 # Main plugin export
│   ├── types.ts                 # Robot-specific types
│   ├── config.ts                # Configuration management
│   ├── errors.ts                # Error types
│   │
│   ├── services/
│   │   ├── robot-service.ts     # Main robot control
│   │   ├── simulation-service.ts # Gazebo integration
│   │   ├── vision-service.ts    # Adapted vision
│   │   ├── rl-service.ts        # RL training
│   │   └── safety-service.ts    # Safety monitoring
│   │
│   ├── actions/
│   │   ├── command-action.ts    # Direct control
│   │   ├── goto-action.ts       # Navigation
│   │   ├── teach-action.ts      # Learning by demo
│   │   ├── recover-action.ts    # Fall recovery
│   │   └── vision-actions.ts    # Vision-based actions
│   │
│   ├── providers/
│   │   ├── state-provider.ts    # Joint states
│   │   ├── sensor-provider.ts   # Sensor data
│   │   ├── status-provider.ts   # System status
│   │   └── vision-provider.ts   # Visual context
│   │
│   ├── communication/
│   │   ├── ros2-bridge.ts       # ROS 2 connection
│   │   ├── serial-protocol.ts   # Hardware protocol
│   │   ├── websocket-server.ts  # Remote control
│   │   └── message-types.ts     # Protocol definitions
│   │
│   ├── control/
│   │   ├── servo-controller.ts  # Servo management
│   │   ├── kinematics.ts        # IK/FK calculations
│   │   ├── motion-planner.ts    # Trajectory planning
│   │   └── safety-monitor.ts    # Limit checking
│   │
│   ├── simulation/
│   │   ├── gazebo-interface.ts  # Gazebo connection
│   │   ├── urdf-generator.ts    # URDF creation
│   │   └── physics-config.ts    # Simulation settings
│   │
│   ├── rl/
│   │   ├── gym-environment.ts   # OpenAI Gym env
│   │   ├── reward-functions.ts  # Reward design
│   │   ├── training-manager.ts  # Training loops
│   │   └── model-export.ts      # ONNX conversion
│   │
│   └── tests/
│       ├── unit/                 # Unit tests
│       ├── integration/          # Integration tests
│       └── e2e/                  # End-to-end tests
│
├── scripts/
│   ├── setup-robot.sh           # Robot setup
│   ├── setup-simulation.sh      # Gazebo setup
│   ├── train-rl.py             # RL training
│   ├── deploy-pi.sh            # Pi deployment
│   └── generate-urdf.py        # URDF generation
│
├── config/
│   ├── robot-config.yaml        # Robot parameters
│   ├── ros2-topics.yaml         # ROS 2 config
│   ├── servo-limits.yaml        # Safety limits
│   └── rl-config.yaml          # Training config
│
├── urdf/
│   ├── ainex-humanoid.urdf      # Robot model
│   ├── meshes/                  # 3D meshes
│   └── launch/                  # ROS 2 launch files
│
└── models/
    ├── pretrained/              # Pretrained RL models
    └── checkpoints/             # Training checkpoints
```

## Key Implementation Details

### 1. Serial Protocol Implementation
```typescript
interface ServoCommand {
  header: [0x55, 0x55];
  servoId: number;
  command: CommandType;
  position?: number;
  speed?: number;
  torque?: number;
}
```

### 2. ROS 2 Topics
- `/ainex_joint_commands` - Joint position commands
- `/joint_states` - Current joint positions
- `/ainex_camera/image_compressed` - Camera feed
- `/ainex_status` - Robot status
- `/emergency_stop` - Safety command

### 3. Safety Features
- Joint limit checking
- Velocity limiting
- Collision detection
- Fall detection via IMU
- Emergency stop button
- Watchdog timer

### 4. RL State/Action Space
- **State**: Joint positions, velocities, IMU data, camera features
- **Actions**: Joint velocity commands or position targets
- **Rewards**: Task-specific (walking, manipulation, etc.)

## Testing Strategy

1. **Unit Tests**
   - Servo protocol encoding/decoding
   - Kinematics calculations
   - Safety limit checking

2. **Integration Tests**
   - ROS 2 communication
   - Simulation control
   - Vision integration

3. **E2E Tests**
   - Full control loops
   - RL training episodes
   - Sim-to-real transfer

## Deployment Process

1. **Development**: Test in Gazebo simulation
2. **Training**: Train RL policies in simulation
3. **Validation**: Test on real robot with safety limits
4. **Deployment**: Deploy to Raspberry Pi 5
5. **Monitoring**: Remote monitoring and updates

## Success Criteria

- [ ] Robot responds to all joint commands within 50ms
- [ ] Simulation runs at real-time factor > 0.8
- [ ] Vision processing at 10+ FPS
- [ ] RL policies transfer to real robot
- [ ] Safety systems prevent damage
- [ ] Remote control works over WiFi
- [ ] All tests pass with >80% coverage 