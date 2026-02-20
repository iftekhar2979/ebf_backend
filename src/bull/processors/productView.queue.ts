import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "winston";
import { ViewsService } from "./../../products/views/views.service";
// import { PRODUCT_VIEW_FLUSH_JOB, PRODUCT_VIEW_QUEUE } from "./product-view.queue";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { PRODUCT_VIEW_FLUSH_JOB, PRODUCT_VIEW_QUEUE } from "../types/product.view.types";
// import { ViewsService } from "src/products/";
@Processor(PRODUCT_VIEW_QUEUE, {
  concurrency: 2, // only 2 flush workers to avoid DB hammering
})
export class ProductViewWorker extends WorkerHost {
  constructor(
    private readonly productViewService: ViewsService,
    @InjectLogger() private readonly logger: Logger
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case PRODUCT_VIEW_FLUSH_JOB:
        await this.productViewService.flushBuffer();
        break;

      case "aggregate_view_stats":
        // Handled by ProductStatWorker – no-op here, kept for routing clarity
        break;

      default:
        this.logger.warn(`[ProductViewWorker] Unknown job: ${job.name}`);
    }
  }
}
