import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { UserModule } from "src/user/user.module";
import { WebhookController } from "./webhook.controller";
import { WebhookService } from "./webhook.service";

// @Global()
@Module({
  imports: [
    // TypeOrmModule.forFeature()
    UserModule,
    AuthModule,
    BullModule.registerQueue({ name: "uploadQueue" }, { name: "leads" }),
    // WalletsModule
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
