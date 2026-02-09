import { Module } from "@nestjs/common";
import { GeminiService } from "./gemini.service";
import { GeminiController } from "./gemini.controller";
import { AuthModule } from "src/auth/auth.module";
import { UserModule } from "src/user/user.module";

@Module({
  imports: [AuthModule, UserModule],
  providers: [GeminiService],
  controllers: [GeminiController],
})
export class GeminiModule {}
