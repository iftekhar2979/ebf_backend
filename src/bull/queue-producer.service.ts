import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";

/**
 * Enterprise Queue Producer Service.
 * Provides a standardized way to dispatch jobs with consistent logging and metadata.
 */
@Injectable()
export class QueueProducerService {
  private readonly logger = new Logger(QueueProducerService.name);

  constructor(
    @InjectQueue("enterprise_task_queue") private readonly mainQueue: Queue
  ) {}

  /**
   * Dispatch a high-priority task.
   */
  async dispatchTask<T>(jobName: string, data: T, options: any = {}) {
    try {
      this.logger.log(`Dispatching job ${jobName} with data: ${JSON.stringify(data)}`);
      
      const job = await this.mainQueue.add(jobName, data, {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
        ...options,
      });

      return { jobId: job.id };
    } catch (error) {
      this.logger.error(`Failed to dispatch job ${jobName}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Batch dispatch multiple tasks (optimized for scale).
   */
  async dispatchBulk<T>(jobs: Array<{ name: string; data: T; options?: any }>) {
    try {
      this.logger.log(`Dispatching ${jobs.length} jobs in bulk...`);
      const bulkJobs = jobs.map(j => ({
        name: j.name,
        data: j.data,
        opts: {
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
          ...j.options
        }
      }));
      
      await this.mainQueue.addBulk(bulkJobs);
    } catch (error) {
      this.logger.error(`Failed to dispatch bulk jobs: ${error.message}`, error.stack);
      throw error;
    }
  }
}
