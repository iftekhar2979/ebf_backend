import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config"; // Correct import
import { User } from "src/user/entities/user.entity";

import Stripe from "stripe";

@Injectable()
export class StripeService {
  private stripe: Stripe;
  public baseUrl: string;

  constructor(
    private configService: ConfigService
    // private readonly subscriptionService: SubscriptionService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>("STRIPE_SECRET_KEY"), {
      apiVersion: "2025-08-27.basil", // Specify Stripe API version you're using
    });
    this.baseUrl = this.configService.get<string>("BASE_URL");
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
}
