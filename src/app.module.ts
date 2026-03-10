import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { WinstonModule } from "nest-winston";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { QueueModule } from "./bull/bull.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { TimeoutInterceptor } from "./common/interceptors/timeout.interceptor";
import { winstonLoggerConfig } from "./configs/winston.config";
import { PostgreSQLDatabaseModule } from "./database/postgresql.module";
import { HealthModule } from "./health/health.module";
import { MailModule } from "./mail/mail.module";
import { OtpModule } from "./otp/otp.module";
import { S3Module } from "./s3/s3.module";
import { SearchModule } from "./search/search.module";
import { LoggerMiddleware } from "./shared/middlewares/logger.middleware";
import { SseModule } from "./sse/sse.module";
import { UserModule } from "./user/user.module";
import { envSchema } from "./utils/env.validation";

import { StripeModule } from "./stripe/stripe.module";
// import { StripController } from './strip/strip.controller';
import { CacheModule } from "@nestjs/cache-manager";
import * as redisStore from "cache-manager-ioredis";
import { RedisModule } from "./redis/redis.module";
// import { BullQueueProcessor } from './bull-queue.processor';
import { BullModule } from "@nestjs/bull";
// import { ImageProcessor } from "./bull/processors/ProductQueue";
import { PushNotificationProccessor } from "./bull/processors/pushNotificationQueue";
import { FirebaseModule } from "./firebase/firebase.module";
import { GeminiModule } from "./gemini/gemini.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ProductsModule } from "./products/products.module";
import { ReelsModule } from "./reels/reels.module";
import { SeederService } from "./seeder/seeder.service";
import { SettingsModule } from "./settings/settings.module";
import { SocketModule } from "./socket/socket.module";

import { AuthQueueProcessor } from "./bull/processors/AuthenticationQueue";
import { BoostQueueProcessor } from "./bull/processors/Boost.queue.processor";
import { EventQueueProcessor } from "./bull/processors/Event.queue.processor";
import { ProductQueueProcessor } from "./bull/processors/product/productQueue";
import { ReelsViewProcessor } from "./bull/processors/ReelsViewQueue";
import { CartsModule } from "./carts/carts.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { BoostsModule } from "./products/boosts/boosts.module";
import { CachesModule } from "./products/caches/caches.module";
import { EventsModule } from "./products/events/events.module";
import { FeedModule } from "./products/feed/feed.module";
import { RankingsModule } from "./products/rankings/rankings.module";
import { StatsModule } from "./products/stats/stats.module";
import { ViewsModule } from "./products/views/views.module";
import { ReelViewsModule } from "./reels/views/views.module";
import { ReviewsModule } from "./user/shops/reviews/reviews.module";
import { WishlistsModule } from "./wishlists/wishlists.module";
/**
 * It is the root module for the application in we import all feature modules and configure modules and packages that are common in feature modules. Here we also configure the middlewares.
 *
 * Here, feature modules imported are - DatabaseModule, AuthModule, MailModule and UserModule.
 * other modules are :
 *      {@link ConfigModule} - enables us to access environment variables application wide.
 *      {@link TypeOrmModule} - it is an ORM and enables easy access to database.
 */

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      prefix: "",
      host: process.env.REDIS_IP || "localhost", // Use environment variable or default to localhost
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379, // Use environment variable or default to 6379
      ttl: 600,
      max: 100,
    }),

    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_IP || "localhost", // Use environment variable for Redis connection
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379, // Default Redis port
      },
    }),
    BullModule.registerQueue({
      name: "myQueue", // Name of your queue
    }),

    ConfigModule.forRoot({
      // envFilePath: [`.env.stage.dev`],
      isGlobal: true,
      validationSchema: envSchema,

      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
      // validationOptions: { allowUnknown: false, abortEarly: true },
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: +config.get<string>("THROTTLE_TTL"),
          limit: +config.get<string>("THROTTLE_LIMIT"),
        },
      ],
    }),
    WinstonModule.forRoot(winstonLoggerConfig),
    PostgreSQLDatabaseModule,
    AuthModule,
    MailModule,
    UserModule,
    HealthModule,
    S3Module,
    SseModule,
    OtpModule,
    SearchModule,
    FirebaseModule,
    StripeModule,
    RedisModule,
    QueueModule,
    GeminiModule,
    SettingsModule,
    SocketModule,
    NotificationsModule,
    ReelsModule,
    ProductsModule,
    CartsModule,
    BoostsModule,
    ReviewsModule,
    EventsModule,
    WishlistsModule,
    OrdersModule,
    CachesModule,
    StatsModule,
    PaymentsModule,
    FeedModule,
    ViewsModule,
    ReelViewsModule,
    RankingsModule,
  ],
  controllers: [AppController, ],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // BullQueueProcessor,
    // ImageProcessor,
    ProductQueueProcessor,
    PushNotificationProccessor,
    SeederService,
    BoostQueueProcessor,
    EventQueueProcessor,
    ReelsViewProcessor,
    AuthQueueProcessor,
    
    // ProductBoostgSer,vice,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
