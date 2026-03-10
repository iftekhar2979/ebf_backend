import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { RedisService } from "src/redis/redis.service";
import { UserService } from "src/user/user.service";
import { WebhookService } from "./webhook.service";

describe("WebhookService", () => {
  let service: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {},
        },
        {
          provide: "BullQueue_uploadQueue",
          useValue: {},
        },
        {
          provide: "BullQueue_leads",
          useValue: {},
        },
        {
          provide: UserService,
          useValue: {},
        },
        {
          provide: "winston",
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
