import { Test } from "@nestjs/testing";
import { MailService } from "../../src/mail/mail.service";
// import { mailServiceMock, mockUser, userRepositoryMock } from "../../test/__mocks__/mocks";
import { UserRepository } from "./repositories/user.repository";
import { UserService } from "./user.service";

describe("UserService", () => {
  let userService: UserService;
  let userRepository: UserRepository;
  let mailService: MailService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: userRepositoryMock,
        },
        {
          provide: MailService,
          useValue: mailServiceMock,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userRepository = module.get<UserRepository>(UserRepository);
    mailService = module.get<MailService>(MailService);
    jest.clearAllMocks();
  });

  describe("updateUserData", () => {
    it("should be update user data", async () => {
      userRepositoryMock.findOne?.mockReturnValue(mockUser);
      userRepositoryMock.save?.mockReturnValue(mockUser);

      console.log(mockUser);
      const data = await userService.updateUserData({ fullName: "fullname" }, mockUser);

      console.log(data);
      console.log(mockUser);

      expect(data).toEqual(mockUser);
    });
  });
});
