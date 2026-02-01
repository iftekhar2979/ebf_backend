import { INestApplication } from "@nestjs/common";

declare global {
  var app: INestApplication | undefined;
}
