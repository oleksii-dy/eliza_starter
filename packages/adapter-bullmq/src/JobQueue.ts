import { Queue } from "bullmq";

export class JobQueue {
  private queue: Queue;

  constructor(queueName: string, redisUrl: string) {
    this.queue = new Queue(queueName, { connection: { url: redisUrl } });
  }

  async addJob(jobName: string, data: any, options?: any) {
    return await this.queue.add(jobName, data, options);
  }

  async scheduleJob(jobName: string, data: any, cronExpression: string) {
    return await this.queue.add(jobName, data, {
      repeat: { pattern: cronExpression },
    });
  }
}
