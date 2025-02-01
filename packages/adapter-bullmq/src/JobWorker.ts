import { Worker, Job } from "bullmq";

interface JobHandler {
  (job: Job): Promise<void>;
}

export class JobWorker {
  private worker: Worker;
  private handlers: Map<string, JobHandler>;

  constructor(queueName: string, redisUrl: string) {
    this.handlers = new Map();

    this.worker = new Worker(queueName, this.processJob.bind(this), {
      connection: { url: redisUrl },
      concurrency: 5,
    });

    this.worker.on("failed", (job, err) => {
      console.error(`[Job Failed] ${job?.name}:`, err);
    });

    this.worker.on("completed", (job) => {
      console.log(`[Job Completed] ${job?.name}`);
    });

    console.log(`[Worker] Listening on queue: ${queueName}`);
  }

  public registerJob(jobName: string, handler: JobHandler) {
    this.handlers.set(jobName, handler);
  }

  private async processJob(job: Job) {
    const handler = this.handlers.get(job.name);
    if (!handler) {
      console.warn(`[Warning] No handler for job: ${job.name}`);
      return;
    }

    try {
      await handler(job);
    } catch (error) {
      console.error(`[Error] Job ${job.name} failed:`, error);
      throw error;
    }
  }
}
