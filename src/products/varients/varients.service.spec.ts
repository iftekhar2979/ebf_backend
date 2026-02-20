import { Test, TestingModule } from "@nestjs/testing";
import { VarientsService } from "./varients.service";

describe("VarientsService", () => {
  let service: VarientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VarientsService],
    }).compile();

    service = module.get<VarientsService>(VarientsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
