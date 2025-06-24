// Mock implementation of roslib for testing without ROS2
import { mock } from 'bun:test';

export class Ros {
  private listeners: { [event: string]: Function[] } = {};
  private isConnected = false;

  constructor(options: { url: string }) {
    // Mock constructor
  }

  on(event: string, listener: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);

    // Auto-connect for testing
    if (event === 'connection' && !this.isConnected) {
      setTimeout(() => {
        this.isConnected = true;
        this.emit('connection');
      }, 100);
    }
  }

  close(): void {
    this.isConnected = false;
    this.emit('close');
  }

  getTopics(
    callback: (topics: { topics: string[]; types: string[] }) => void,
    failedCallback?: (error: Error) => void
  ): void {
    // Mock topics
    callback({
      topics: ['/joint_states', '/cmd_vel', '/robot_status'],
      types: ['sensor_msgs/JointState', 'geometry_msgs/Twist', 'std_msgs/String'],
    });
  }

  getServices(
    callback: (services: string[]) => void,
    failedCallback?: (error: Error) => void
  ): void {
    // Mock services
    callback(['/set_joint_position', '/get_robot_state', '/emergency_stop']);
  }

  private emit(event: string, ...args: any[]): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach((listener) => listener(...args));
    }
  }
}

export class Topic {
  private callbacks: Function[] = [];
  public name: string;
  public messageType: string;

  constructor(options: { ros: Ros; name: string; messageType: string }) {
    this.name = options.name;
    this.messageType = options.messageType;
  }

  subscribe(callback: (message: any) => void): void {
    this.callbacks.push(callback);
  }

  unsubscribe(): void {
    this.callbacks = [];
  }

  publish(message: Message): void {
    // Mock publish - trigger callbacks for testing
    this.callbacks.forEach((cb) => cb(message));
  }
}

export class Service {
  public name: string;
  public serviceType: string;

  constructor(options: { ros: Ros; name: string; serviceType: string }) {
    this.name = options.name;
    this.serviceType = options.serviceType;
  }

  callService(
    request: ServiceRequest,
    callback: (response: any) => void,
    failedCallback?: (error: Error) => void
  ): void {
    // Mock service call
    setTimeout(() => {
      callback({ success: true, message: 'Mock service response' });
    }, 50);
  }
}

export class Message {
  [key: string]: any;

  constructor(values: any) {
    Object.assign(this, values);
  }
}

export class ServiceRequest {
  [key: string]: any;

  constructor(values: any) {
    Object.assign(this, values);
  }
}
