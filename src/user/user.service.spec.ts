import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { RedisService } from "src/redis/redis.service";
import { DataSource, Repository } from "typeorm";
import { MailService } from "../mail/mail.service";
import { User } from "./entities/user.entity";
import { ShopsService } from "./shops/shops.service";
import { UserService } from "./user.service";

const mockUser = {
  id: "uuid-123",
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  roles: [],
  is_active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("UserService", () => {
  let userService: UserService;
  let userRepo: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockUser),
            save: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            create: jest.fn().mockImplementation((dto) => dto),
          },
        },
        {
          provide: "winston",
          useValue: {
            log: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendConfirmationOnUpdatingUser: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              release: jest.fn(),
            }),
          },
        },
        {
          provide: ShopsService,
          useValue: {},
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe("updateUserData", () => {
    it("should update user data", async () => {
      const updateDto = { first_name: "Jane" };
      const updatedUser = { ...mockUser, ...updateDto };
      
      jest.spyOn(userRepo, "findOne").mockResolvedValue(mockUser as any);
      jest.spyOn(userRepo, "save").mockResolvedValue(updatedUser as any);

      const result = await userService.updateUserData(updateDto, mockUser as any);

      expect(result.first_name).toBe("Jane");
      expect(userRepo.save).toHaveBeenCalled();
    });
  });
});
