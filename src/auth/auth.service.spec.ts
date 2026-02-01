import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { UserRepository } from "../user/repositories/user.repository";
import { AuthService } from "./auth.service";
// import {
//     createUserStub,
//     mockUser,
//     userRepositoryMock,
//     token,
//     updateMyPasswordStub,
//     mailServiceMock,
// } from "../../test/__mocks__/mocks";
import { MailService } from "../mail/mail.service";
import { ConfigService } from "@nestjs/config";
import { BadRequestException } from "@nestjs/common";

describe("AuthService", () => {
  let authService: AuthService;
  let jwtService: JwtService;
  let mailService: MailService;
  let configService: ConfigService;
  let req: any = {
    get: jest.fn().mockReturnValue("https://www.google.com"),
    user: mockUser,
    protocol: "https",
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserRepository),
          useValue: userRepositoryMock,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue("cni8a74wt9bb8w67f8vqb7ty8obthbvs857et"),
            constructor: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: mailServiceMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("dev"),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
    jwtService = module.get<JwtService>(JwtService);
    mailService = module.get<MailService>(MailService);

    jest.clearAllMocks();
  });

  describe("signup", () => {
    it("should signup new user", async () => {
      userRepositoryMock.createUser.mockReturnValue({ user: mockUser, token });

      const data = await authService.signup(createUserStub(), req);

      expect(data).toBeDefined();
    });
  });

  describe("activateAccount", () => {
    it("should activate an user account", async () => {
      userRepositoryMock.findOne.mockReturnValue({ activeToken: token });
      userRepositoryMock.save.mockReturnValue(mockUser);

      const data = await authService.activateAccount(token);

      expect(data).toEqual(true);
    });
  });

  describe("loginPassportLocal", () => {
    it("should login through locally", async () => {
      const data = await authService.signToken(mockUser);

      expect(data).toEqual(mockUser.id);
    });
  });

  // describe('loginGoogle', ()=> {
  //     it('shold login through google', async () => {

  //     }
  // })

  describe("loginGoogle", () => {
    it("should redirect login through google", async () => {
      userRepositoryMock.createOrFindUserGoogle(mockUser);

      const data = await authService.loginGoogle(req);
      expect(data).toEqual({ user: mockUser, token: token });
    });
  });

  describe("forgotPassowrd", () => {
    it("should sent mail to user email for password reset", async () => {
      userRepositoryMock.createPasswordResetToken(mockUser);

      const data = await authService.forgotPassword(mockUser.email, req);
      expect(data).toEqual(true);
    });
  });

  describe("verifyToken", () => {
    it("should verify a token", async () => {
      userRepositoryMock.findOne?.(mockUser);

      const data = await authService.verifyToken(token);

      expect(data).toEqual("valid token");
    });
  });

  describe("resetPassword", () => {
    it("should reset user password", async () => {
      userRepositoryMock.findOne?.mockReturnValue(mockUser);
      userRepositoryMock.save?.mockReturnValue(mockUser);

      const data = await authService.resetPassword(token, {
        password: mockUser.password,
        passwordConfirm: mockUser.password,
      });
      expect(data).toEqual({ updatedUser: mockUser, newToken: token });
    });
  });

  describe("updateMyPassword", () => {
    it("should update user password", async () => {
      userRepositoryMock.save.mockReturnValue(mockUser);

      const data = await authService.updateMyPassword(updateMyPasswordStub, mockUser);

      expect(data).toEqual({ user: mockUser, token: token });
    });
  });

  // describe('deleteMyAccount', () => {
  //     it('should delete user account', async () => {
  //         const data = await authService.deleteMyAccount(mockUser)
  //         expect(data).toThrow(new BadRequestException(`Method not implemented`))
  //     })
  // })

  describe("sendAccountActivationMail", () => {
    it("should send account activation mail to user", async () => {
      userRepositoryMock.save?.mockReturnValue(mockUser);

      const data = await authService.sendAccountActivationMail(mockUser, req);

      expect(data).toEqual("success");
    });
  });
});
