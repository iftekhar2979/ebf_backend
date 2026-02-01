import { Test } from "@nestjs/testing";
// import { mockUser, userServiceMock } from "../../test/__mocks__/mocks";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

describe("UserController", () => {
  let userService: UserService;
  let userController: UserController;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userServiceMock,
        },
      ],
    }).compile();

    userController = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);

    jest.clearAllMocks();
  });

  describe("define", () => {
    it("should be defined service and controller", () => {
      expect(userController).toBeDefined();
      expect(userService).toBeDefined();
    });
  });

  describe("getUser", () => {
    let result;
    beforeEach(async () => {
      result = await userController.getUser(mockUser);
    });
    it("shoud return user", () => {
      expect(result).toEqual(mockUser);
    });
  });

  describe("updateUserDetails", () => {
    let result;
    beforeEach(async () => {
      result = await userController.updateUserDetails({ fullName: "fullname" }, mockUser);
    });

    it("should called with userService.updateUserDetail", () => {
      expect(userService.updateUserData).toBeCalledWith({ fullName: "fullname" }, mockUser);
    });

    it("should update user details", () => {
      expect(result).toEqual({ status: "success", data: mockUser });
    });
  });
});
