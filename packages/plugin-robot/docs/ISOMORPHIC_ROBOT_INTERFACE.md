# Isomorphic Robot Interface Design

## Overview

The isomorphic robot interface provides a unified API for controlling robots regardless of whether they are:
- **Real Hardware**: Physical AiNex robot connected via serial/USB
- **Simulation**: Gazebo simulation with ROS2 integration

This design allows Eliza to issue the same natural language commands and receive consistent responses, making the system truly hardware-agnostic.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Eliza Agent Runtime                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Natural Language: "Move your right arm up 45 degrees"      │
│                           ↓                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              RobotServiceV2                          │   │
│  │  - Natural language parsing                          │   │
│  │  - Command creation                                  │   │
│  │  - History tracking                                  │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           IRobotInterface (Abstract)                 │   │
│  │  - executeCommand(RobotCommand): ExecutionResult     │   │
│  │  - Common state management                           │   │
│  │  - Event emission                                    │   │
│  └──────────────┬─────────────────┬────────────────────┘   │
│                 ↓                 ↓                         │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │  RealRobotAdapter    │  │  SimulationAdapter   │       │
│  │  - Serial protocol   │  │  - ROS2 bridge       │       │
│  │  - Servo control     │  │  - Gazebo interface  │       │
│  │  - Hardware safety   │  │  - URDF model        │       │
│  └──────────────────────┘  └──────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. RobotCommand Structure

```typescript
interface RobotCommand {
  id: string;
  type: RobotCommandType;
  natural_language: string;
  parameters?: {
    target?: string;        // "left arm", "head"
    direction?: string;     // "up", "forward", "left"
    amount?: number;        // 30 degrees, 0.5 meters
    speed?: number;         // 0-1 normalized
    duration?: number;      // milliseconds
    pose?: string;          // named pose
    motion?: string;        // named motion sequence
    position?: { x, y, z }; // 3D position
    orientation?: { x, y, z, w }; // Quaternion
  };
  constraints?: {
    maintain_balance?: boolean;
    avoid_collisions?: boolean;
    respect_limits?: boolean;
    smooth_motion?: boolean;
  };
  metadata?: {
    timestamp: number;
    source: string;
    confidence?: number;
    user_id?: string;
    context?: any;
  };
}
```

### 2. Command Types

```typescript
enum RobotCommandType {
  // Basic motion
  MOVE_JOINT = 'MOVE_JOINT',
  MOVE_TO_POSE = 'MOVE_TO_POSE',
  EXECUTE_MOTION = 'EXECUTE_MOTION',
  STOP = 'STOP',
  
  // Advanced motion
  WALK = 'WALK',
  TURN = 'TURN',
  REACH = 'REACH',
  GRASP = 'GRASP',
  RELEASE = 'RELEASE',
  
  // Head/perception
  LOOK_AT = 'LOOK_AT',
  TRACK = 'TRACK',
  SCAN = 'SCAN',
  
  // Gestures
  WAVE = 'WAVE',
  POINT = 'POINT',
  NOD = 'NOD',
  SHAKE_HEAD = 'SHAKE_HEAD',
  
  // System
  SET_MODE = 'SET_MODE',
  CALIBRATE = 'CALIBRATE',
  RESET = 'RESET',
  EMERGENCY_STOP = 'EMERGENCY_STOP',
  
  // Teaching
  START_TEACHING = 'START_TEACHING',
  STOP_TEACHING = 'STOP_TEACHING',
  RECORD_POSE = 'RECORD_POSE',
  SAVE_MOTION = 'SAVE_MOTION',
}
```

### 3. Execution Result

```typescript
interface ExecutionResult {
  success: boolean;
  command_id: string;
  executed_at: number;
  completed_at?: number;
  state?: RobotState;
  error?: string;
  warnings?: string[];
  duration?: number;
  actual_vs_planned?: {
    position_error?: number;
    timing_error?: number;
  };
  metadata?: any;
}
```

## Natural Language Processing

The system parses natural language commands into structured RobotCommand objects:

### Examples:

1. **"Move your right arm up 45 degrees"**
   ```typescript
   {
     type: 'MOVE_JOINT',
     parameters: {
       target: 'right_arm',
       direction: 'up',
       amount: 45,
       speed: 0.5
     }
   }
   ```

2. **"Wave hello"**
   ```typescript
   {
     type: 'WAVE',
     parameters: {
       speed: 0.5
     }
   }
   ```

3. **"Walk forward 2 meters slowly"**
   ```typescript
   {
     type: 'WALK',
     parameters: {
       direction: 'forward',
       amount: 2.0,
       speed: 0.3
     }
   }
   ```

4. **"Look at position (1, 0, 1.5)"**
   ```typescript
   {
     type: 'LOOK_AT',
     parameters: {
       position: { x: 1, y: 0, z: 1.5 }
     }
   }
   ```

## Implementation Details

### Real Robot Adapter

- **Communication**: Serial protocol (115200 baud)
- **Protocol**: Binary with 0x55 0x55 header
- **Servo Mapping**: 24-27 servos with unique IDs
- **Safety**: Hardware torque limits, position constraints
- **Update Rate**: 10Hz state updates, 20Hz control

### Simulation Adapter

- **Communication**: ROS2 via WebSocket (roslib)
- **Topics**: 
  - `/joint_states` (subscribe)
  - `/joint_trajectory_controller/joint_trajectory` (publish)
  - `/emergency_stop` (publish)
  - `/imu/data` (subscribe)
- **Model**: URDF with accurate kinematics
- **Physics**: Gazebo simulation with contact dynamics

## Usage

### Configuration

```env
# For Real Robot
USE_SIMULATION=false
ROBOT_SERIAL_PORT=/dev/ttyUSB0
ROBOT_BAUD_RATE=115200

# For Simulation
USE_SIMULATION=true
ROS_WEBSOCKET_URL=ws://localhost:9090
JOINT_STATE_TOPIC=/joint_states
JOINT_COMMAND_TOPIC=/joint_trajectory_controller/joint_trajectory
```

### In ElizaOS Agent

```typescript
// The service automatically selects the right adapter
const robotService = runtime.getService<RobotServiceV2>(RobotServiceType.ROBOT);

// Execute natural language command
const result = await robotService.executeNaturalLanguageCommand(
  "Move your right arm up 45 degrees"
);

if (result.success) {
  console.log("Command executed successfully");
} else {
  console.log("Command failed:", result.error);
}
```

### In Actions

```typescript
const handler: Handler = async (runtime, message, state, options, callback) => {
  const robotService = runtime.getService<RobotServiceV2>(RobotServiceType.ROBOT);
  
  const result = await robotService.executeNaturalLanguageCommand(
    message.content.text
  );
  
  await callback({
    text: result.success 
      ? "Command executed successfully" 
      : `Failed: ${result.error}`,
    actions: ['ROBOT_COMMAND'],
  });
};
```

## Benefits

1. **Hardware Agnostic**: Same code works for real robot and simulation
2. **Natural Language**: No need to learn robot-specific commands
3. **Safety Built-in**: Automatic limit checking and emergency stop
4. **Extensible**: Easy to add new command types
5. **Debugging**: Can develop/test in simulation before hardware
6. **State Tracking**: Full visibility into robot state
7. **Event-Driven**: React to robot state changes

## Future Enhancements

1. **Policy Learning**: Train policies in simulation, deploy to hardware
2. **Multi-Robot**: Control multiple robots with same interface
3. **Cloud Integration**: Remote robot control via cloud bridge
4. **AR/VR**: Visualize robot state in augmented reality
5. **Behavior Trees**: Complex behavior composition
6. **Force Feedback**: Haptic feedback for teaching mode

## Example Conversation

```
User: "Wave hello to everyone"
Eliza: "I'm waving hello! 👋"
[Robot executes wave gesture]

User: "Now point at the coffee cup on the table"
Eliza: "I'm pointing at the coffee cup."
[Robot uses vision to locate cup and points]

User: "Pick it up carefully"
Eliza: "I'll carefully pick up the coffee cup."
[Robot executes grasp sequence with force feedback]

User: "Great! Now hand it to me"
Eliza: "Here's your coffee cup."
[Robot extends arm toward user]
```

## Conclusion

The isomorphic robot interface bridges the gap between natural language and robot control, providing a seamless experience whether working with hardware or simulation. This design enables rapid development, safe testing, and intuitive human-robot interaction within the ElizaOS ecosystem. 