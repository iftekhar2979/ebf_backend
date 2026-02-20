import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { CART_ADD_JOB, CART_QUEUE, CART_REMOVE_JOB, CART_UPDATE_JOB } from "src/carts/ carts.queue";
// import { CART_ADD_JOB, CART_QUEUE, CART_REMOVE_JOB, CART_UPDATE_JOB } from "src/carts/carts.queue";
import { CartService } from "src/carts/carts.service";
import { StatsService } from "src/products/stats/stats.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Logger } from "winston";

@Processor(CART_QUEUE, {
  concurrency: 10,
})
export class CartWorker extends WorkerHost {
  constructor(
    private readonly cartService: CartService,
    private readonly statService: StatsService,
    @InjectLogger() private readonly logger: Logger
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case CART_ADD_JOB: {
        const data = job.data;
        await this.cartService.persistAddItem(data);
        this.statService
          .incrementStats({ productId: data.productId, carts: data.quantity })
          .catch((e) => this.logger.error("Stat cart increment failed", e));
        break;
      }

      case CART_UPDATE_JOB: {
        await this.cartService.persistUpdateItem(job.data);
        break;
      }

      case CART_REMOVE_JOB: {
        const data = job.data;
        await this.cartService.persistRemoveItem(data);
        this.statService
          .incrementStats({ productId: data.productId, carts: -data.quantity })
          .catch((e) => this.logger.error("Stat cart decrement failed", e));
        break;
      }

      default:
        this.logger.warn(`[CartWorker] Unknown job: ${job.name}`);
    }
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, err: Error) {
    this.logger.error(`[CartWorker] Job ${job.id} (${job.name}) failed`, {
      error: err.message,
      data: job.data,
      attemptsMade: job.attemptsMade,
    });
  }
}
