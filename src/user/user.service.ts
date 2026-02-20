import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateAdminDto } from "src/auth/dto/create-user.dto";
import { RedisService } from "src/redis/redis.service";
import { pagination } from "src/shared/utils/pagination";
import { argon2hash } from "src/utils/hashes/argon2";
import { DataSource, Repository } from "typeorm";
import { MailService } from "../mail/mail.service";
import { InjectLogger } from "../shared/decorators/logger.decorator";
import { GetUsersQueryDto } from "./dto/get-user.query.dto";
import { UpdateUserProfileDto } from "./dto/update-profile.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";
import { UserRoles } from "./enums/role.enum";
import { ShopsService } from "./shops/shops.service";
import { ShopSignupDto } from "./shops/dtos/Signup.dto";

/**
 * This service contain contains methods and business logic related to user.
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private _userRepository: Repository<User>,
    // @InjectRepository(Verification) private _verificationRepo: Repository<Verification>,
    @InjectLogger() private readonly _logger: Logger,
    private readonly _redisService: RedisService,
    private readonly _mailService: MailService,
    private _dataSource: DataSource,
    private _shopService: ShopsService
  ) {}

  async createUser(userData: Partial<User>): Promise<{ data: Partial<User>; ok: boolean; message: string }> {
    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const userExists = await this._userRepository.findOne({ where: { email: userData.email } });
    if (userExists) {
      throw new BadRequestException("User with this email already exists");
    }
    const hashedPassword = await argon2hash(userData.password);
    const newUser = this._userRepository.create({
      ...userData,
      password: hashedPassword,
    });
    return {
      ok: true,
      data: await this._userRepository.save(newUser),
      message: "User created successfully",
    };
  }
  async getUserFilters(query: GetUsersQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const qb = this._userRepository.createQueryBuilder("user");

    qb.where(":role = ANY (user.roles)", { role: UserRoles.USER });
    // Search by first_name or last_name
    if (search) {
      qb.andWhere(`(user.first_name ILIKE :search OR user.last_name ILIKE :search)`, {
        search: `%${search}%`,
      });
    }
    if (query.status) {
      qb.where("(user.status ILIKE :status)", { status: query.status });
    }

    // Pagination
    qb.take(take).skip(skip);

    // Order by creation date
    qb.orderBy("user.createdAt", "DESC");

    const [users, total] = await qb.getManyAndCount();

    return {
      message: "users retrived successfully",
      ok: true,
      statusCode: 200,
      data: users,
      pagination: pagination({ page: Number(page), limit: Number(limit), total }),
    };
  }

  async getAllUsers(): Promise<User[]> {
    this._logger.log("getting all users data", UserService.name);
    const users = await this._userRepository.find();

    return users;
  }
  async getTotalUsersCount(): Promise<number> {
    this._logger.log("Getting total user count");

    const count = await this._userRepository.count({});

    return count;
  }
  async createSuperAdmin(body: CreateAdminDto): Promise<string> {
    //  let { password } = body;
    body.password = await argon2hash(body.password);
    // console.log(body)
    const result = await this._userRepository.insert(body);
    const user = await this._userRepository.findOne({ where: { id: result.identifiers[0].id } });

    return "Admin Created Successfully";
  }
  async updateProfile(userId: string, updateDto: UpdateUserProfileDto): Promise<User> {
    const user = await this._userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Apply updates
    Object.assign(user, updateDto);

    return this._userRepository.save(user);
  }

  async updateUser(user_id: string, query: { fcm?: string }) {
    return await this._userRepository.update(user_id, query);
  }
  async getUserById(id: string, relations?: string[]): Promise<User> {
    const client = this._redisService.getClient();
    const relationKey = relations ? relations.sort().join(",") : "no-relations"; // .sort() ensures key consistency
    const cacheKey = `user:${id}:${relationKey}`;

    // 1. Try to get from Redis
    const cachedUser = await client.get(cacheKey);
    if (cachedUser) {
      return JSON.parse(cachedUser); // Deserialize string to Object
    }

    // 2. If not in cache, query the DB
    const query: any = { where: { id } };
    if (relations) {
      query.relations = relations;
    }

    const user = await this._userRepository.findOne(query);

    // 3. Save to Redis
    if (user) {
      // Serialize Object to string
      await client.set(cacheKey, JSON.stringify(user), { EX: 3600 });
    }

    return user;
  }
  async getUser(id: string) {
    return await this._userRepository.findOneByOrFail({ id });
  }
  async getUserByEmail(email: string) {
    return await this._userRepository.findOne({ where: { email } });
  }
  async getMultipleUserByIds(userIds: string[]) {
    return await this._userRepository.findByIds(userIds);
  }

  async updateUserData(updateUserDto: UpdateUserDto, user: User) {
    let isUpdated: boolean = false;

    this._logger.log(`Checking if user exists`, UserService.name);
    const currentUser = await this._userRepository.findOne({ where: { id: user.id } });

    if (!currentUser) throw new NotFoundException("User Not Found");

    this._logger.log(`Attempting to update user data`, UserService.name);
    Object.keys(currentUser).forEach((key) => {
      if (updateUserDto[key] !== undefined && currentUser[key] !== updateUserDto[key]) {
        currentUser[key] = updateUserDto[key];
        isUpdated = true;
        this._logger.log(
          `Updated ${key} from ${currentUser[key]} to ${updateUserDto[key]}`,
          UserService.name
        );
      }
    });

    if (!isUpdated) {
      this._logger.log(`User didn't update any data`, UserService.name);
      return user;
    }

    this._logger.log(`Save Updated User`, UserService.name);
    await this._userRepository.save(currentUser);

    this._logger.log("Sending update Confirmation Mail", UserService.name);
    this._mailService.sendConfirmationOnUpdatingUser(user);

    return currentUser;
  }
  async updateImage({ imageUrl, user }: { imageUrl: string; user: User }) {
    this._logger.log(`Updating user image`, UserService.name);
    const updatedUser = await this._userRepository.update(user.id, { image: imageUrl });

    if (!updatedUser) {
      throw new NotFoundException("User not found");
    }

    this._logger.log(`Image updated successfully`, UserService.name);
    return { message: "Image uploaded successfully", ok: true, data: null };
  }
  async updateUserUpdatedTimeAndOfflineStatus({ user_id }: { user_id: string; user?: Partial<User> }) {
    this._logger.log(`Updating user Active Status`, UserService.name);
    const updatedUser = await this._userRepository.update(user_id, { is_active: false });

    if (!updatedUser) {
      throw new NotFoundException("User not found");
    }

    return updatedUser;
  }
  signUpShops(signUp: ShopSignupDto) {
    return this._shopService.signup(signUp);
  }
}
