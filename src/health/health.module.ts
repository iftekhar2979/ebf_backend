import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { MetricsService } from "./matrics.service";

@Module({
  imports: [TerminusModule.forRoot({ errorLogStyle: "pretty", logger: true })],
  controllers: [HealthController],
  providers: [MetricsService],
})
export class HealthModule {}
