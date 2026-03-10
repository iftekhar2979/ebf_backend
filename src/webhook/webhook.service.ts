import { InjectQueue } from "@nestjs/bullmq";
import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { RedisService } from "src/redis/redis.service";
import { S3_Field } from "src/s3/enums/primary-path.enum";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { User } from "src/user/entities/user.entity";
import { UserService } from "src/user/user.service";
import Stripe from "stripe";
import { Logger } from "winston";
import { AgencyUpdateData } from "./types/aws_webhook";

@Injectable()
export class WebhookService {
  private stripe: Stripe;
  public baseUrl: string;

  constructor(
    private _configService: ConfigService,
    @InjectLogger() private readonly _logger: Logger,
    private readonly _redisService: RedisService,
    @InjectQueue("uploadQueue") private readonly _uploadQueue: Queue,
    @InjectQueue("leads") private readonly _leadQueue: Queue,
    private readonly _userService: UserService
  ) {
    this.stripe = new Stripe(this._configService.get<string>("STRIPE_SECRET_KEY"), {
      apiVersion: "2025-08-27.basil",
    });
    this.baseUrl = this._configService.get<string>("BASE_URL");
  }

  async createPaymentIntent(amount: number, user: User): Promise<string> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "GBP",
              product_data: {
                name: `Recharge ${amount}`,
                description: `Recharge the wallet for phurcase and product boosting`,
              },
              unit_amount: amount * 100,
            },
            quantity: 1,
          },
        ],
        metadata: {
          user_id: user.id,
          amount: amount,
          email: user.email,
          name: user.first_name,
        },
        mode: "payment",
        customer_email: user.email,
        success_url: `${this.baseUrl}/html-response/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.baseUrl}/html-response/cancel`,
      });
      return session.url;
    } catch (error) {
      console.error("Error creating payment intent:", error.message);
      throw new BadGatewayException(`Failed to create payment : ${error.message}`);
    }
  }

  async findMetaData(payment: string): Promise<any> {
    const session = await this.stripe.checkout.sessions.retrieve(payment);
    if (!session.metadata) {
      console.error("Metadata not found in session.");
    }
    return session.metadata;
  }

  async getPaymentIntent(paymentIntend: string) {
    return await this.stripe.paymentIntents.retrieve(paymentIntend);
  }

  async paymentIntentList() {
    return await this.stripe.paymentIntents.list({ limit: 10 });
  }

  async handleFileUpload(bucket: string, payload: { user_id: string; field: string; key: string }) {
    const { user_id, field, key } = payload;
    const client = this._redisService.getClient();
    const cacheKey = `s3_batch:${user_id}`;
    const jobId = `flush:${user_id}`;
    const pushData: AgencyUpdateData = { user_id };

    switch (field) {
      case S3_Field.User_Profile:
        pushData["image"] = key;
        break;
      case S3_Field.Agency_Nid_Front:
        pushData["nid_front"] = key;
        break;
      case S3_Field.Agency_Nid_Back:
        pushData["nid_back"] = key;
        break;
      case S3_Field.Agency_Tax_Front:
        pushData["tax_id_front"] = key;
        break;
      case S3_Field.Agency_Tax_Back:
        pushData["tax_id_back"] = key;
        break;
      case S3_Field.Agency_Driving_License_Front:
        pushData["driving_license_front"] = key;
        break;
      case S3_Field.Agency_Driving_License_Back:
        pushData["driving_license_back"] = key;
        break;
    }

    // 1. Buffer the data in Redis (ioredis hset supports objects)
    await client.hset(cacheKey, pushData as any);

    // 2. Check property count
    const allFields = await client.hgetall(cacheKey);
    const count = Object.keys(allFields).length;

    if (count >= 5) {
      const existingJob = await this._uploadQueue.getJob(jobId);
      if (existingJob) await existingJob.remove();
      await this._uploadQueue.add("process-bulk", { user_id }, { jobId });
    } else {
      await this._uploadQueue.add("process-bulk", { pushData }, { delay: 3000 });
    }
  }

  async handleFileDelete(bucket: string, key: string) {
    console.log(`File deleted: ${bucket}/${key}`);
  }

  async seedLeads() {}
}
