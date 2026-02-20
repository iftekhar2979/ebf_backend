import { Test, TestingModule } from "@nestjs/testing";
import { VarientsController } from "./varients.controller";

describe("VarientsController", () => {
  let controller: VarientsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VarientsController],
    }).compile();

    controller = module.get<VarientsController>(VarientsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
