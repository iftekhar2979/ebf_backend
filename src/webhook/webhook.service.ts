import { InjectQueue } from "@nestjs/bull";
import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config"; // Correct import
import { Queue } from "bull";
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
    // private readonly subscriptionService: SubscriptionService,
  ) {
    this.stripe = new Stripe(this._configService.get<string>("STRIPE_SECRET_KEY"), {
      apiVersion: "2025-08-27.basil", // Specify Stripe API version you're using
    });
    this.baseUrl = this._configService.get<string>("BASE_URL");
  }

  // Method to create a new payment intent
  // Create PaymentIntent or Checkout session
  async createPaymentIntent(amount: number, user: User): Promise<string> {
    try {
      // Create Checkout session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"], // Remove 'google_pay' as it is not a valid PaymentMethodType
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

      // Return the session URL
      return session.url;
    } catch (error) {
      console.error("Error creating payment intent:", error.message);
      throw new BadGatewayException(`Failed to create payment : ${error.message}`);
    }
  }

  async findMetaData(payment: string): Promise<any> {
    const session = await this.stripe.checkout.sessions.retrieve(payment);
    console.log(session);
    if (!session.metadata) {
      console.error("Metadata not found in session.");
    }
    return session.metadata;
  }
  async getPaymentIntent(paymentIntend: string) {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntend);
    return paymentIntent;
  }
  async paymentIntentList() {
    const paymentIntent = await this.stripe.paymentIntents.list({ limit: 10 });
    return paymentIntent;
  }
  async handleFileUpload(bucket: string, payload: { user_id: string; field: string; key: string }) {
    const { user_id, field, key } = payload;
    const client = this._redisService.getClient();
    const cacheKey = `s3_batch:${user_id}`;
    const jobId = `flush:${user_id}`;
    const pushData: AgencyUpdateData = {
      user_id,
    };
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
        pushData["driving_license_back"] = key; // Corrected from 'front'
        break;
      case S3_Field.User_Profile:
        pushData["image"] = key;
        break;

      default:
        // Optional: Handle cases where the field doesn't match
        break;
    }

    // 1. Buffer the data in Redis
    await client.hSet(cacheKey, pushData);

    // 2. Check property count
    const allFields = await client.hGetAll(cacheKey);
    const count = Object.keys(allFields).length;

    if (count >= 5) {
      console.log("Processed immediately");
      // Threshold reached: Process immediately
      const existingJob = await this._uploadQueue.getJob(jobId);
      if (existingJob) await existingJob.remove(); // Cancel the 5s timer

      await this._uploadQueue.add("process-bulk", { user_id }, { jobId });
    } else {
      console.log("Triggered after 1 seconds");
      await this._uploadQueue.add(
        "process-bulk",
        { pushData },
        {
          delay: 3000,
        }
      );
    }
  }
  // async handleMetaWebhhook({
  //   page_id,
  //   lead_id,
  //   form_id,
  //   leadInfo,
  //   field_data,
  // }: {
  //   page_id: string;
  //   lead_id: string;
  //   form_id: string;
  //   leadInfo: LeadgenLead;
  //   field_data: Field[];
  // }) {
  //   const destructedLeadsInfo = parseLeadInfo(leadInfo);
  //   await this._leadQueue.add("seed", {
  //     page_id,
  //     lead_id,
  //     form_id,
  //     destructedLeadsInfo,
  //     field_data,
  //   });
  //   console.log("LEADS INFORMATION", destructedLeadsInfo);
  // }

  async handleFileDelete(bucket: string, key: string) {
    // this.logger.log(`File deleted: ${bucket}/${key}`);
    console.log(`File deleted: ${bucket}/${key}`);
    // Add your custom logic here
  }
  async seedLeads() {}
}
