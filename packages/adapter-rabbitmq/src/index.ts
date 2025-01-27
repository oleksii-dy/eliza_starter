import amqp, { Channel, Connection } from 'amqplib';

// RabbitMQ configuration (can be modified if needed)
const RABBITMQ_URL: string = 'amqp://localhost'; // RabbitMQ connection URL
const QUEUE_NAME: string = 'message_queue'; // Default queue name

class RabbitMQService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;

  // Connect to RabbitMQ and create a channel
  private connectToRabbitMQ(callback: (error: Error | null, channel: Channel | null) => void): void {
    if (this.connection && this.channel) {
      console.log('Using existing RabbitMQ connection and channel.');
      return callback(null, this.channel); // If there is already a connection, return the current channel
    }

    // Connect to RabbitMQ
    amqp.connect(RABBITMQ_URL).then(conn => {
      this.connection = conn;

      // Create a channel
      return this.connection.createChannel();
    }).then(ch => {
      this.channel = ch;

      // Ensure the queue exists
      this.channel.assertQueue(QUEUE_NAME, { durable: true });

      console.log('Connected to RabbitMQ and channel created.');
      callback(null, this.channel);
    }).catch(error => {
      callback(error, null);
    });
  }

  // Send a message to the RabbitMQ queue
  public sendToQueue(message: string, callback: (error: Error | null) => void): void {
    this.connectToRabbitMQ((err, ch) => {
      if (err) {
        return callback(err);
      }

      // Send the message to the queue
      ch!.sendToQueue(QUEUE_NAME, Buffer.from(message), { persistent: true });

      console.log(`Message sent to queue: ${message}`);
      callback(null);
    });
  }

  // Consume messages from the queue and process them
  public consumeQueue(callback: (message: string, done: () => void) => void): void {
    this.connectToRabbitMQ((err, ch) => {
      if (err) {
        return callback('Error: ' + err.message, () => {}); // Return error if any
      }

      ch!.consume(QUEUE_NAME, (msg) => {
        if (msg !== null) {
          const message = msg.content.toString();
          console.log(`Message received: ${message}`);

          // Call the callback to process the message
          callback(message, () => {
            // Acknowledge the message after processing
            ch!.ack(msg);
          });
        }
      }, { noAck: false });
    });
  }

  // Close the RabbitMQ connection
  public closeConnection(): void {
    if (this.connection) {
      this.connection.close();
      console.log('RabbitMQ connection closed.');
    }
  }
}

export default RabbitMQService;
