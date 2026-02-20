import { Body, Controller, Get, Headers, HttpException, HttpStatus, Post, Query } from "@nestjs/common";

// import { ConfigService } from 'aws-sdk';

import { ConfigService } from "@nestjs/config";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import Stripe from "stripe";
import { Logger } from "winston";
import { WebhookService } from "./webhook.service";

@Controller("webhook")
export class WebhookController {
  constructor(
    private readonly _webhookService: WebhookService,
    private readonly _configService: ConfigService,

    @InjectLogger() private readonly _logger: Logger
  ) {}

  //   @Post('payment')
  // @UseGuards(JwtAuthenticationGuard)
  // async createPaymentIntent(
  //   @GetUser() user : User,
  //   @Body() body:RechargeDto
  // ) {
  //   const {  amount } = body;
  //   const paymentIntent = await this.stripeService.createPaymentIntent(
  //     amount,
  //     user,
  //   );
  //   return { paymentIntent };
  // }

  // Webhook handler for Stripe events
  @Post("stripe")
  async handleStripeWebhook(@Body() rawBody: Buffer, @Headers("stripe-signature") signature: string) {
    console.log(signature);
    const endpointSecret = this._configService.get<string>("STRIPE_WEBHOOK_SECRET");
    // console.log(endpointSecret)
    try {
      // Use stripe.webhooks.constructEvent directly to verify the event
      const event = Stripe.webhooks.constructEvent(
        rawBody, // Raw body from the request
        signature,
        endpointSecret
      );
      // Handle the event based on the event type
      // console.log(event.data.object)
      switch (event.type) {
        case "checkout.session.completed":
          const session = event.data.object as any;
          console.log(session);
          const { user, amount, email, name } = session.metadata;

          // console.log(session.metadata)
          // await this.walletService.rechargeWallet({userId:user.id, amount,paymentMethod:"Stripe"})
          // Perform necessary actions after successful payment
          break;

        case "checkout.session.async_payment_failed":
          const invoice = event.data.object;
          throw new HttpException("Webhook event verification failed", HttpStatus.BAD_REQUEST);

        // Handle other event types here...

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (err) {
      console.error("Error processing webhook:", err);
      throw new HttpException("Webhook event verification failed", HttpStatus.BAD_REQUEST);
    }
  }

  @Get("facebook")
  verifyFacebookWebhook(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") token: string,
    @Query("hub.challenge") challenge: string
  ) {
    // MUST match exactly what you put in the Facebook Developer Portal
    const VERIFY_TOKEN = "1qazxsw2";

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      // Return the challenge as a raw string
      return challenge;
    } else {
      console.log("VERIFICATION_FAILED");
      // This is why you are seeing the 403 error
      throw new HttpException("Verification failed", HttpStatus.FORBIDDEN);
    }
  }

  @Post("minio")
  async handleMinIOWebhook(@Body() event: WebhookEvent) {
    console.log("Received MinIO webhook event");

    const record = event.Records[0];
    const eventName = record.eventName;
    const bucketName = record.s3.bucket.name;
    const objectKey = record.s3.object.key;
    const objectSize = record.s3.object.size;
    const eventTime = record.eventTime;
    const sourceIP = record.requestParameters.sourceIPAddress;

    this._logger.log(`Time: ${eventTime} Event: ${eventName} Object: ${objectKey}`, WebhookController.name);
    this._logger.log(`USER FIELD DATA: ${JSON.stringify(record.s3.object?.userMetadata)}`, "Webhook");
    // Process based on event type
    if (eventName === "s3:ObjectCreated:Put") {
      await this._webhookService.handleFileUpload(bucketName, {
        key: objectKey,
        field: record.s3.object?.userMetadata["x-amz-meta-field"],
        user_id: record.s3.object?.userMetadata["x-amz-meta-user_id"],
      });
    } else if (eventName === "s3:ObjectRemoved:Delete") {
      await this._webhookService.handleFileDelete(bucketName, objectKey);
    }

    return { status: "received" };
  }
}
