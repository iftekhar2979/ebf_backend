import { OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";

/**
 * Enterprise Base Processor for BullMQ.
 * Provides standardized logging, error handling, and lifecycle management for background jobs.
 */
export abstract class BaseProcessor {
  protected abstract readonly logger: Logger;

  @OnWorkerEvent("active")
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} of type ${job.name}...`);
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`Completed job ${job.id} of type ${job.name}.`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, error: Error) {
    this.logger.error(`Failed job ${job.id} of type ${job.name}: ${error.message}`, error.stack);
    // Here logic for dead-letter queue or custom alerting could be added
  }

  @OnWorkerEvent("error")
  onError(error: Error) {
    this.logger.error(`Worker error: ${error.message}`, error.stack);
  }

  /**
   * Abstract process method to be implemented by child classes.
   */
  abstract process(job: Job): Promise<any>;
}
