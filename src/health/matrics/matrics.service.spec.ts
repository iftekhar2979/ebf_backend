import { Test, TestingModule } from "@nestjs/testing";
import { MatricsService } from "./matrics.service";

describe("MatricsService", () => {
  let service: MatricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatricsService],
    }).compile();

    service = module.get<MatricsService>(MatricsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
