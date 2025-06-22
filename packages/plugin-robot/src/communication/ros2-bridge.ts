import { EventEmitter } from 'events';
import { JointState, RobotState, RobotMode, RobotStatus, IMUData } from '../types';
import { logger } from '@elizaos/core';

// Mock ROSLIB implementation for when real roslib is not available
class MockRos extends EventEmitter {
  constructor(options: any) {
    super();
    logger.info('[MockROS] Creating mock ROS connection:', options);
    setTimeout(() => this.emit('connection'), 100);
  }
  
  connect() {
    setTimeout(() => this.emit('connection'), 100);
  }
  
  close() {
    this.emit('close');
  }
  
  getTopics(callback: Function, errorCallback: Function) {
    callback({ topics: ['mock_topic_1', 'mock_topic_2'] });
  }
  
  getServices(callback: Function, errorCallback: Function) {
    callback(['mock_service_1', 'mock_service_2']);
  }
}

class MockTopic {
  constructor(options: any) {
    logger.debug('[MockROS] Creating mock topic:', options);
  }
  
  subscribe(callback: Function) {
    logger.debug('[MockROS] Mock subscribe');
    // Simulate some joint state data
    if (this.constructor.name.includes('jointState')) {
      setTimeout(() => {
        callback({
          name: ['joint1', 'joint2'],
          position: [0, 0],
          velocity: [0, 0],
          effort: [0, 0]
        });
      }, 1000);
    }
  }
  
  publish(message: any) {
    logger.debug('[MockROS] Mock publish:', message);
  }
  
  unsubscribe() {
    logger.debug('[MockROS] Mock unsubscribe');
  }
}

class MockService {
  constructor(options: any) {
    logger.debug('[MockROS] Creating mock service:', options);
  }
  
  callService(request: any, successCallback: Function, errorCallback: Function) {
    logger.debug('[MockROS] Mock service call:', request);
    successCallback({ success: true });
  }
}

class MockMessage {
  constructor(data: any) {
    return data;
  }
}

class MockServiceRequest {
  constructor(data: any) {
    return data;
  }
}

// Define ROSLIB interface for type safety
interface ROSLIB_Interface {
  Ros: typeof MockRos;
  Topic: typeof MockTopic;
  Service: typeof MockService;
  Message: typeof MockMessage;
  ServiceRequest: typeof MockServiceRequest;
}

// Default to mock implementation
let ROSLIB: ROSLIB_Interface = {
  Ros: MockRos,
  Topic: MockTopic,
  Service: MockService,
  Message: MockMessage,
  ServiceRequest: MockServiceRequest
};

// Flag to track if real roslib has been loaded
let roslibLoaded = false;
let roslibLoadPromise: Promise<void> | null = null;

// Function to load real roslib if available
async function loadRoslib(): Promise<void> {
  if (roslibLoaded || roslibLoadPromise) {
    return roslibLoadPromise || Promise.resolve();
  }

  roslibLoadPromise = (async () => {
    try {
      const roslib = await import('roslib');
      // @ts-ignore - Real roslib has compatible interface
      ROSLIB = roslib.default || roslib;
      roslibLoaded = true;
      logger.info('[ROS2Bridge] Using real roslib implementation');
    } catch (error) {
      logger.warn('[ROS2Bridge] roslib not available, using mock implementation');
    }
  })();

  return roslibLoadPromise;
}

export interface ROS2Config {
  url: string;
  jointStateTopic?: string;
  jointCommandTopic?: string;
  imuTopic?: string;
  statusTopic?: string;
  emergencyStopTopic?: string;
}

export class ROS2Bridge extends EventEmitter {
  private ros: any = null;
  private connected = false;
  private topics: Map<string, any> = new Map();
  private subscribers: Map<string, any> = new Map();
  private services: Map<string, any> = new Map();
  
  constructor(private config: ROS2Config) {
    super();
  }

  async connect(): Promise<void> {
    // Ensure roslib is loaded before connecting
    await loadRoslib();

    return new Promise((resolve, reject) => {
      this.ros = new ROSLIB.Ros({
        url: this.config.url || 'ws://localhost:9090',
      });

      this.ros.on('connection', () => {
        logger.info('[ROS2Bridge] Connected to ROS 2');
        this.connected = true;
        this.setupTopics();
        resolve();
      });

      this.ros.on('error', (error: any) => {
        logger.error('[ROS2Bridge] Connection error:', error);
        reject(error);
      });

      this.ros.on('close', () => {
        logger.info('[ROS2Bridge] Connection closed');
        this.connected = false;
        this.emit('disconnected');
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.ros && this.connected) {
      // Unsubscribe from all topics
      this.subscribers.forEach((topic) => {
        topic.unsubscribe();
      });
      this.subscribers.clear();
      
      // Close connection
      this.ros.close();
      this.ros = null;
      this.connected = false;
    }
  }

  private setupTopics(): void {
    // Joint state subscriber
    if (this.config.jointStateTopic) {
      const jointStateTopic = new ROSLIB.Topic({
        ros: this.ros!,
        name: this.config.jointStateTopic,
        messageType: 'sensor_msgs/JointState',
      });

      jointStateTopic.subscribe((message: any) => {
        const jointStates: JointState[] = [];
        for (let i = 0; i < message.name.length; i++) {
          jointStates.push({
            name: message.name[i],
            position: message.position[i],
            velocity: message.velocity?.[i],
            effort: message.effort?.[i],
          });
        }
        this.emit('jointStates', jointStates);
      });

      this.subscribers.set('jointStates', jointStateTopic);
    }

    // Joint command publisher
    if (this.config.jointCommandTopic) {
      const jointCommandTopic = new ROSLIB.Topic({
        ros: this.ros!,
        name: this.config.jointCommandTopic,
        messageType: 'trajectory_msgs/JointTrajectory',
      });

      this.topics.set('jointCommand', jointCommandTopic);
    }

    // IMU subscriber
    if (this.config.imuTopic) {
      const imuTopic = new ROSLIB.Topic({
        ros: this.ros!,
        name: this.config.imuTopic,
        messageType: 'sensor_msgs/Imu',
      });

      imuTopic.subscribe((message: any) => {
        const imuData: IMUData = {
          timestamp: Date.now(),
          accelerometer: {
            x: message.linear_acceleration.x,
            y: message.linear_acceleration.y,
            z: message.linear_acceleration.z,
          },
          gyroscope: {
            x: message.angular_velocity.x,
            y: message.angular_velocity.y,
            z: message.angular_velocity.z,
          },
          orientation: {
            x: message.orientation.x,
            y: message.orientation.y,
            z: message.orientation.z,
            w: message.orientation.w,
          },
        };
        this.emit('imuData', imuData);
      });

      this.subscribers.set('imu', imuTopic);
    }

    // Emergency stop publisher
    if (this.config.emergencyStopTopic) {
      const emergencyStopTopic = new ROSLIB.Topic({
        ros: this.ros!,
        name: this.config.emergencyStopTopic,
        messageType: 'std_msgs/Bool',
      });

      this.topics.set('emergencyStop', emergencyStopTopic);
    }
  }

  // Send joint commands
  async sendJointCommand(joints: { [name: string]: number }, duration: number = 1.0): Promise<void> {
    if (!this.connected || !this.topics.has('jointCommand')) {
      throw new Error('Not connected or joint command topic not configured');
    }

    const jointNames = Object.keys(joints);
    const positions = Object.values(joints);

    const trajectory = new ROSLIB.Message({
      header: {
        stamp: {
          secs: Math.floor(Date.now() / 1000),
          nsecs: (Date.now() % 1000) * 1000000,
        },
        frame_id: 'base_link',
      },
      joint_names: jointNames,
      points: [{
        positions: positions,
        velocities: new Array(positions.length).fill(0),
        accelerations: new Array(positions.length).fill(0),
        effort: new Array(positions.length).fill(0),
        time_from_start: {
          secs: Math.floor(duration),
          nsecs: (duration % 1) * 1e9,
        },
      }],
    });

    this.topics.get('jointCommand')!.publish(trajectory);
    logger.debug('[ROS2Bridge] Sent joint command for', jointNames.length, 'joints');
  }

  // Send emergency stop
  async sendEmergencyStop(stop: boolean): Promise<void> {
    if (!this.connected || !this.topics.has('emergencyStop')) {
      throw new Error('Not connected or emergency stop topic not configured');
    }

    const message = new ROSLIB.Message({
      data: stop,
    });

    this.topics.get('emergencyStop')!.publish(message);
    logger.warn('[ROS2Bridge] Emergency stop:', stop);
  }

  // Call a ROS service
  async callService(serviceName: string, serviceType: string, request: any): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to ROS 2');
    }

    const service = new ROSLIB.Service({
      ros: this.ros!,
      name: serviceName,
      serviceType: serviceType,
    });

    return new Promise((resolve, reject) => {
      service.callService(
        new ROSLIB.ServiceRequest(request),
        (response) => {
          resolve(response);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  // Subscribe to a custom topic
  subscribeTopic(topicName: string, messageType: string, callback: (message: any) => void): void {
    if (!this.connected) {
      throw new Error('Not connected to ROS 2');
    }

    const topic = new ROSLIB.Topic({
      ros: this.ros!,
      name: topicName,
      messageType: messageType,
    });

    topic.subscribe(callback);
    this.subscribers.set(topicName, topic);
  }

  // Publish to a custom topic
  publishTopic(topicName: string, messageType: string, message: any): void {
    if (!this.connected) {
      throw new Error('Not connected to ROS 2');
    }

    let topic = this.topics.get(topicName);
    if (!topic) {
      topic = new ROSLIB.Topic({
        ros: this.ros!,
        name: topicName,
        messageType: messageType,
      });
      this.topics.set(topicName, topic);
    }

    topic.publish(new ROSLIB.Message(message));
  }

  // Get current robot state
  async getRobotState(): Promise<RobotState | null> {
    // This would typically be assembled from various topics
    // For now, return a placeholder
    return null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Utility method to list available topics
  async listTopics(): Promise<string[]> {
    if (!this.connected) {
      throw new Error('Not connected to ROS 2');
    }

    return new Promise((resolve, reject) => {
      this.ros!.getTopics(
        (topics) => {
          resolve(topics.topics);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  // Utility method to list available services
  async listServices(): Promise<string[]> {
    if (!this.connected) {
      throw new Error('Not connected to ROS 2');
    }

    return new Promise((resolve, reject) => {
      this.ros!.getServices(
        (services) => {
          resolve(services);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }
} 