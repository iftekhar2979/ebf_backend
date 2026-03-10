import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { OtpService } from "src/otp/otp.service";
import { RedisService } from "src/redis/redis.service";
import { DataSource } from "typeorm";
import { MailService } from "../mail/mail.service";
import { User } from "../user/entities/user.entity";
import { Verification } from "../user/entities/verification.entity";
import { AuthService } from "./auth.service";

const mockUser = {
  id: "uuid-123",
  email: "test@example.com",
  password: "hashedPassword",
  roles: [],
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn(),
            }),
          },
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: OtpService,
          useValue: {
            createOtp: jest.fn(),
            findOtpByUserId: jest.fn(),
            removeOtpByUserId: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendUserConfirmationMail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("secret"),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            incr: jest.fn(),
            setWithOptions: jest.fn(),
            getClient: jest.fn().mockReturnValue({
              get: jest.fn(),
            }),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
            }),
            transaction: jest.fn(),
          },
        },
        {
          provide: "BullQueue_otp",
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: "BullQueue_authentication",
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: "winston",
          useValue: {
            log: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
