import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { UserModule } from "src/user/user.module";
import { S3Controller } from "./s3.controller";
import { S3Service } from "./s3.service";

@Module({
  imports: [AuthModule, UserModule],
  controllers: [S3Controller],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
