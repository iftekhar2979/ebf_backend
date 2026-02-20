import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { ElasticsearchModule } from "@nestjs/elasticsearch";
import { ConfigModule, ConfigService } from "@nestjs/config";
// import { ConfigService } from 'aws-sdk';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        node: "https://localhost:9200", // e.g., "https://localhost:9200"
        auth: {
          username: "elastic",
          password: "zLOt2va9_fUKmX0kN3xD",
        },
        tls: {
          rejectUnauthorized: false, // required if using self-signed certs
        },
      }),
    }),
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
