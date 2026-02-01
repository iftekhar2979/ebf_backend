import { Test } from "@nestjs/testing";
// import {
//     token,
//     authServiceMock,
//     createUserStub,
//     mockUser,
//     req,
//     mockLoginPassportLocalResponse,
//     updateMyPasswordStub,
// } from "../../test/__mocks__/mocks";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let authService: AuthService;
  let authController: AuthController;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe("defined", () => {
    it("should be defined controller and service", () => {
      expect(authController).toBeDefined();
      expect(authService).toBeDefined();
    });
  });

  describe("signup", () => {
    let result;
    beforeEach(async () => {
      result = await authController.signup(createUserStub(), req);
    });
    it("should be called with authService.signup", () => {
      expect(authService.signup).toBeCalledWith(createUserStub(), req);
    });
    it("should be caree user and status,user and token", async () => {
      expect(result).toEqual({
        status: "success",
        user: mockUser,
        token: token,
      });
    });
  });

  describe("activateAccount", () => {
    let result;
    beforeEach(async () => {
      result = await authController.activateAccount(token);
    });

    it("should be called with authService.avtivateAccount", () => {
      expect(authService.activateAccount).toBeCalledWith(token);
    });
    it("should activate user account", () => {
      expect(result).toEqual({ status: "success", message: "Account Activated successfully" });
    });
  });

  describe("loginPassportLocal", () => {
    let result;
    beforeEach(async () => {
      result = await authController.loginPassportLocal(req);
    });

    it("should be called with authService.signToken", () => {
      expect(authService.signToken).toBeCalledWith(mockUser);
    });

    it("should login  user account locally", () => {
      expect(result).toEqual(mockLoginPassportLocalResponse());
    });
  });

  // describe("logingoogle", () => {
  //     let result;
  //     beforeEach(async () => {
  //         result = await authController.loginGoogle(req);
  //     });

  //     it("should be called with authService.loginGoogle", () => {
  //         expect(authService.loginGoogle).toBeCalledWith();
  //     });

  //     it("should login  user account hrough google", () => {
  //         expect(result).toEqual(mockLoginPassportLocalResponse());
  //     });
  // });

  describe("loginGoogleRedirect", () => {
    let result;
    beforeEach(async () => {
      result = await authController.loginGoogleRedirect(req);
    });

    it("should be called with authService.loginGoogle", () => {
      expect(authService.loginGoogle).toBeCalledWith(req);
    });

    it("should login  user through google", () => {
      expect(result).toEqual(mockLoginPassportLocalResponse());
    });
  });

  describe("logout", () => {
    it("should logout to user", async () => {
      let result = await authController.logout();
      expect(result).toEqual({ status: "success", token: null });
    });
  });

  describe("forgotPassword", () => {
    let result;
    beforeEach(async () => {
      result = await authController.forgotPassword({ email: mockUser.email }, req);
    });

    it("should be called with authService.forgotPassword", () => {
      expect(authService.forgotPassword).toBeCalledWith(mockUser.email, req);
    });

    it("should sent password reset email to the user ", () => {
      expect(result).toEqual({
        status: "success",
        message: "Password reset email sent successfully",
      });
    });
  });

  describe("verifyToken", () => {
    let result;
    beforeEach(async () => {
      result = await authController.verifyToken(token);
    });

    it("should be called with authService.forgotPassword", () => {
      expect(authService.verifyToken).toBeCalledWith(token);
    });

    it("should verify token for user", () => {
      expect(result).toEqual({
        status: "success",
        message: "valid token",
      });
    });
  });

  describe("resetPassword", () => {
    let result;
    beforeEach(async () => {
      result = await authController.resetPassword(token, {
        password: mockUser.password,
        passwordConfirm: mockUser.password,
      });
    });

    it("should be called with authService.forgotPassword", () => {
      expect(authService.resetPassword).toBeCalledWith(token, {
        password: mockUser.password,
        passwordConfirm: mockUser.password,
      });
    });

    it("should reset password for user", () => {
      expect(result).toEqual({
        status: "success",
        user: mockUser,
        token,
      });
    });
  });

  describe("updateMyPassword", () => {
    let result;
    beforeEach(async () => {
      result = await authController.updateMyPassword(updateMyPasswordStub, mockUser);
    });

    it("should be called with authService.forgotPassword", () => {
      expect(authService.updateMyPassword).toBeCalledWith(updateMyPasswordStub, mockUser);
    });

    it("should update password for user", () => {
      expect(result).toEqual({
        status: "success",
        user: mockUser,
        token,
      });
    });
  });

  describe("deleteMyAccoount", () => {
    let result;
    beforeEach(async () => {
      result = await authController.deleteMyAccount(mockUser);
    });

    it("should be called with authService.deleteMyAccount", () => {
      expect(authService.deleteMyAccount).toBeCalledWith(mockUser);
    });

    it("should delete user account", () => {
      expect(result).toEqual({ status: "success", message: "User Deleted Successfully" });
    });
  });

  describe("sendAccountActivationToken", () => {
    let result;
    beforeEach(async () => {
      result = await authController.sendAccountActivationToken(mockUser, req);
    });

    it("should be called with authService.sendAccountActivationToken");
    it("should send activation mail to the user", () => {
      expect(result).toEqual({ status: "success", message: "Activation mail sent successfully!" } || "");
    });
  });
});
