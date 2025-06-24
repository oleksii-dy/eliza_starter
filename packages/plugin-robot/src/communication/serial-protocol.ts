import { logger } from '@elizaos/core';
import { ServoCommand, ServoCommandType } from '../types';

export class SerialProtocol {
  private port: any = null;
  private SerialPortClass: any = null;
  private isConnected = false;
  private commandQueue: ServoCommand[] = [];
  private processing = false;
  private responseCallbacks: Map<string, (data: Buffer) => void> = new Map();
  private responseBuffer: Buffer = Buffer.alloc(0);

  constructor(
    private portPath: string = '/dev/ttyUSB0',
    private baudRate: number = 115200
  ) {}

  async connect(): Promise<void> {
    try {
      // Dynamically import SerialPort
      if (!this.SerialPortClass) {
        try {
          const serialportModule = await import('serialport');
          this.SerialPortClass = serialportModule.SerialPort;
        } catch (_error) {
          throw new Error('SerialPort module not installed. Run: npm install serialport');
        }
      }

      this.port = new this.SerialPortClass({
        path: this.portPath,
        baudRate: this.baudRate,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        autoOpen: false,
      });

      await new Promise<void>((resolve, reject) => {
        this.port!.open((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      this.isConnected = true;
      this.startProcessingQueue();

      this.port.on('data', this.handleData.bind(this));
      this.port.on('error', this.handleError.bind(this));
      this.port.on('close', this.handleClose.bind(this));

      logger.info(`[SerialProtocol] Connected to ${this.portPath} at ${this.baudRate} baud`);
    } catch (_error) {
      logger._error('[SerialProtocol] Failed to connect:', _error);
      throw _error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.port && this.isConnected) {
      this.isConnected = false;
      await new Promise<void>((resolve) => {
        this.port!.close(() => {
          resolve();
        });
      });
      this.port = null;
      logger.info('[SerialProtocol] Disconnected');
    }
  }

  async sendCommand(command: ServoCommand): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Serial port not connected');
    }

    // Add checksum
    const packet = this.buildPacket(command);
    command.checksum = this.calculateChecksum(packet);

    // Queue the command
    this.commandQueue.push(command);
  }

  private buildPacket(command: ServoCommand): Buffer {
    const packet = Buffer.alloc(10); // Max packet size
    let index = 0;

    // Header
    packet[index++] = command.header[0];
    packet[index++] = command.header[1];

    // Servo ID
    packet[index++] = command.servoId;

    // Command type
    packet[index++] = command.command;

    // Command-specific data
    switch (command.command) {
      case ServoCommandType.MOVE:
        if (command.position !== undefined) {
          packet.writeUInt16LE(command.position, index);
          index += 2;
        }
        if (command.speed !== undefined) {
          packet.writeUInt16LE(command.speed, index);
          index += 2;
        }
        break;

      case ServoCommandType.SET_SPEED:
        if (command.speed !== undefined) {
          packet.writeUInt16LE(command.speed, index);
          index += 2;
        }
        break;

      case ServoCommandType.SET_TORQUE:
        if (command.torque !== undefined) {
          packet.writeUInt16LE(command.torque, index);
          index += 2;
        }
        break;

      case ServoCommandType.READ_POSITION:
      case ServoCommandType.ENABLE:
      case ServoCommandType.DISABLE:
        // No additional data
        break;
    }

    return packet.slice(0, index);
  }

  private calculateChecksum(packet: Buffer): number {
    let sum = 0;
    for (let i = 2; i < packet.length; i++) {
      sum += packet[i];
    }
    return ~sum & 0xff;
  }

  private async startProcessingQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    while (this.isConnected) {
      if (this.commandQueue.length > 0) {
        const command = this.commandQueue.shift()!;
        await this.sendPacket(command);
        // Small delay between commands
        await new Promise((resolve) => setTimeout(resolve, 10));
      } else {
        // Check queue every 10ms
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    this.processing = false;
  }

  private async sendPacket(command: ServoCommand): Promise<void> {
    const packet = this.buildPacket(command);
    const fullPacket = Buffer.concat([packet, Buffer.from([command.checksum || 0])]);

    await new Promise<void>((resolve, reject) => {
      this.port!.write(fullPacket, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    logger.debug(
      `[SerialProtocol] Sent command to servo ${command.servoId}: ${ServoCommandType[command.command]}`
    );
  }

  private handleData(data: Buffer): void {
    // Append to response buffer
    this.responseBuffer = Buffer.concat([this.responseBuffer, data]);

    // Process complete packets
    while (this.responseBuffer.length >= 7) {
      // Minimum response size
      // Check for valid header
      if (this.responseBuffer[0] !== 0x55 || this.responseBuffer[1] !== 0x55) {
        // Remove invalid byte and continue
        this.responseBuffer = this.responseBuffer.slice(1);
        continue;
      }

      // Extract packet info
      const servoId = this.responseBuffer[2];
      const command = this.responseBuffer[3];

      // Determine packet length based on command
      let packetLength = 7; // Default
      if (command === ServoCommandType.READ_POSITION) {
        packetLength = 8; // Position response includes 2 bytes for position
      }

      if (this.responseBuffer.length < packetLength) {
        // Wait for more data
        break;
      }

      // Extract packet
      const packet = this.responseBuffer.slice(0, packetLength);
      this.responseBuffer = this.responseBuffer.slice(packetLength);

      // Verify checksum
      const checksum = packet[packetLength - 1];
      const calculated = this.calculateChecksum(packet.slice(0, -1));

      if (checksum !== calculated) {
        logger.warn(`[SerialProtocol] Invalid checksum for servo ${servoId}`);
        continue;
      }

      // Handle response
      const callbackKey = `${servoId}-${command}`;
      const callback = this.responseCallbacks.get(callbackKey);

      if (callback) {
        callback(packet);
        this.responseCallbacks.delete(callbackKey);
      } else {
        logger.debug(
          `[SerialProtocol] Unexpected response from servo ${servoId}: ${ServoCommandType[command]}`
        );
      }
    }
  }

  private handleError(error: Error): void {
    logger.error('[SerialProtocol] Serial port error:', error);
  }

  private handleClose(): void {
    logger.info('[SerialProtocol] Serial port closed');
    this.isConnected = false;
  }

  // Utility methods for common operations
  async moveServo(servoId: number, position: number, speed?: number): Promise<void> {
    await this.sendCommand({
      header: [0x55, 0x55],
      servoId,
      command: ServoCommandType.MOVE,
      position: Math.max(0, Math.min(1000, position)), // Clamp to valid range
      speed: speed !== undefined ? Math.max(0, Math.min(1000, speed)) : undefined,
    });
  }

  async enableServo(servoId: number): Promise<void> {
    await this.sendCommand({
      header: [0x55, 0x55],
      servoId,
      command: ServoCommandType.ENABLE,
    });
  }

  async disableServo(servoId: number): Promise<void> {
    await this.sendCommand({
      header: [0x55, 0x55],
      servoId,
      command: ServoCommandType.DISABLE,
    });
  }

  async setServoSpeed(servoId: number, speed: number): Promise<void> {
    await this.sendCommand({
      header: [0x55, 0x55],
      servoId,
      command: ServoCommandType.SET_SPEED,
      speed: Math.max(0, Math.min(1000, speed)),
    });
  }

  async setServoTorque(servoId: number, torque: number): Promise<void> {
    await this.sendCommand({
      header: [0x55, 0x55],
      servoId,
      command: ServoCommandType.SET_TORQUE,
      torque: Math.max(0, Math.min(1000, torque)),
    });
  }

  async readServoPosition(servoId: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseCallbacks.delete(`${servoId}-${ServoCommandType.READ_POSITION}`);
        reject(new Error(`Timeout reading position from servo ${servoId}`));
      }, 100); // 100ms timeout

      this.responseCallbacks.set(`${servoId}-${ServoCommandType.READ_POSITION}`, (packet) => {
        clearTimeout(timeout);

        // Extract position from packet
        // Packet format: [0x55, 0x55, servoId, command, posLow, posHigh, checksum]
        const posLow = packet[4];
        const posHigh = packet[5];
        const position = (posHigh << 8) | posLow;

        logger.debug(`[SerialProtocol] Servo ${servoId} position: ${position}`);
        resolve(position);
      });

      // Send read command
      this.sendCommand({
        header: [0x55, 0x55],
        servoId,
        command: ServoCommandType.READ_POSITION,
      }).catch(reject);
    });
  }

  isReady(): boolean {
    return this.isConnected;
  }
}
