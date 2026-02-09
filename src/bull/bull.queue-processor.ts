import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable } from "@nestjs/common";

@Processor("Product-image") // Use the same name as the registered queue
@Injectable()
export class BullQueueProcessor {
  @Process("job") // This listens for jobs in the queue
  async handleJob(job: Job) {
    console.log("Processing job:", job.id);
    // You can access the data sent to the queue via job.data
    console.log("Job data:", job.data);

    // Simulating job processing (e.g., a task like sending an email, etc.)
    await this.doSomeWork(job.data);
  }

  // Simulating some work (e.g., a task that takes time)
  async doSomeWork(data: any) {
    console.log("Doing some work with:", data);
    // Here, you would implement your actual task logic
  }
}
