import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User, USER_STATUS } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ShopProfile } from './entities/shop.entity';
import { ShopAddress } from './address/entities/address.entity';
import { argon2hash } from 'src/utils/hashes/argon2';
import { UserRoles } from '../enums/role.enum';
import { ShopSignupDto } from './dtos/Signup.dto';

@Injectable()
export class ShopsService {

     constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ShopProfile)
    private readonly shopProfileRepository: Repository<ShopProfile>,
    @InjectRepository(ShopAddress)
    private readonly shopAddressRepository: Repository<ShopAddress>,
    private readonly dataSource: DataSource,
  ) {}

  async signup(signupDto: ShopSignupDto) {
    // Start a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Check if user already exists
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email: signupDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // 2. Check if phone number already exists
      const existingPhone = await queryRunner.manager.findOne(User, {
        where: { phone: signupDto.phoneNumber },
      });

      if (existingPhone) {
        throw new ConflictException('User with this phone number already exists');
      }

      // 3. Validate opening and closing time
      if (!this.validateTimeRange(signupDto.openingTime, signupDto.closingTime)) {
        throw new BadRequestException('Closing time must be after opening time');
      }

      // 4. Hash the password
      const saltRounds = 10;
      const hashedPassword = await argon2hash(signupDto.password);

      // 5. Split name into first_name and last_name
      const nameParts = signupDto.name.trim().split(' ');
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(' ') || nameParts[0];

      // 6. Create User entity
      const user = queryRunner.manager.create(User, {
        first_name,
        last_name,
        email: signupDto.email,
        phone: signupDto.phoneNumber,
        password: hashedPassword,
        roles: [UserRoles.SHOP_OWNER], // Assuming SHOP_OWNER role exists
        status: USER_STATUS.NOT_VERIFIED,
        is_active: false,
      });

      const savedUser = await queryRunner.manager.save(User, user);

      // 8. Create ShopProfile
      const shopProfile = queryRunner.manager.create(ShopProfile, {
        userId: savedUser.id,
        contactNumber: signupDto.phoneNumber,
        openingTime: signupDto.openingTime,
        closingTime: signupDto.closingTime,
        facebookLink: signupDto.facebookLink,
        instagramLink: signupDto.instagramLink,
        banner: signupDto.banner,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], // Default all days
      });

      const savedShopProfile = await queryRunner.manager.save(ShopProfile, shopProfile);

      // 9. Create ShopAddress
      const shopAddress = queryRunner.manager.create(ShopAddress, {
        userId: savedUser.id,
        shopId: savedShopProfile.id,
        city: signupDto.city,
        area: signupDto.area,
        postalCode: signupDto.postalCode,
        latitude: signupDto.latitude,
        longitude: signupDto.longitude,
      });

      await queryRunner.manager.save(ShopAddress, shopAddress);

      // Commit the transaction
      await queryRunner.commitTransaction();

      // Return success response (exclude sensitive data)
      return {
        success: true,
        message: 'Shop registered successfully. Please verify your email.',
        data: {
          id: savedUser.id,
          email: savedUser.email,
          first_name: savedUser.first_name,
          last_name: savedUser.last_name,
          phone: savedUser.phone,
          status: savedUser.status,
          shopProfile: {
            id: savedShopProfile.id,
            contactNumber: shopProfile.contactNumber,
            openingTime: shopProfile.openingTime,
            closingTime: shopProfile.closingTime,
          },
          shopAddress: {
            city: shopAddress.city,
            area: shopAddress.area,
            postalCode: shopAddress.postalCode,
          },
        },
      };
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();

      // Re-throw known exceptions
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Log and throw generic error for unknown issues
      console.error('Signup error:', error);
      throw new InternalServerErrorException(
        'An error occurred during registration. Please try again.',
      );
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  /**
   * Validate that closing time is after opening time
   */
  private validateTimeRange(openingTime: string, closingTime: string): boolean {
    const [openHour, openMinute] = openingTime.split(':').map(Number);
    const [closeHour, closeMinute] = closingTime.split(':').map(Number);

    const openingMinutes = openHour * 60 + openMinute;
    const closingMinutes = closeHour * 60 + closeMinute;

    return closingMinutes > openingMinutes;
  }

  /**
   * Helper method to send verification email (implement as needed)
   */
  private async sendVerificationEmail(email: string, userId: string) {
    // TODO: Implement email sending logic
    // Generate verification token
    // Send email with verification link
    console.log(`Verification email should be sent to ${email} for user ${userId}`);
  }
}
