import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { multerConfig } from "src/common/multer/multer.config";
import { GetFileDestination, GetUser, GetUserInformation } from "../auth/decorators/get-user.decorator";
import { ApiResponseDto } from "../shared/dto/base-response.dto";
import { Roles } from "./decorators/roles.decorator";
import { CreateUserAddressDto } from "./dto/create-user-address.dto";
import { GetUsersQueryDto } from "./dto/get-user.query.dto";
import { UpdateUserProfileDto } from "./dto/update-profile.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User, USER_STATUS } from "./entities/user.entity";
import { UserRoles } from "./enums/role.enum";
import { AccountActivatedGuard } from "./guards/account-activation.guard";
import { UserService } from "./user.service";
import { UserAddressService } from "./userAddress.service";

/**
 * UserController is responsible for handling incoming requests specific to User and returning responses to the client.
 * It creates a route - "/user"
 */
@Controller("users")
@ApiTags("User")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "In case user is not logged in" })
export class UserController {
  constructor(
    private readonly _userService: UserService,
    private readonly _userAddressService: UserAddressService
  ) {}

 
  @Get("all")
  @ApiOperation({ summary: "Get all users with role USER (paginated + searchable)" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 10 })
  @UseGuards(JwtAuthenticationGuard)
  @ApiQuery({ name: "search", required: false, description: "Search by first or last name" })
  async getAllUsers(@Query() query: GetUsersQueryDto) {
    return this._userService.getUserFilters(query);
  }
  // @Get("all")
  // @ApiOperation({
  //   description: "Api to fetch details of all users.",
  //   summary: "Api to fetch details of all users.",
  // })
  // @ApiOkResponse({ description: "Get list of all users in Database", type: CountApiResponseDto<User[]>, isArray: true })
  // async getAllUsers(): Promise<CountApiResponseDto<User[]>> {
  //   const users = await this._userService.getAllUsers();

  //   return { status: "success", count: users.length, data: users };
  // }

  /**
   * Get API - "/me" - Get data about current logged in user
   * @param user user information of the current logged in user.
   * @returns returns the user object.
   * @throws UnauthorizedException with message in case user is not logged in.
   */
  @Get("me")
  @UseGuards(JwtAuthenticationGuard)
  @ApiOperation({
    description: "Api to fetch details of logged in user.",
    summary: "Api to fetch details of logged in user.",
  })
  @ApiOkResponse({ description: "Get data about current logged in user", type: ApiResponseDto<User> })
  async getUser(@GetUser() user: User): Promise<ApiResponseDto<User>> {
    const userInfo = await this._userService.getUserById(user.id);
    return { status: "success", data: userInfo };
  }

  /**
   * Patch API - "/update-me" - it updates user details as per the request body.
   * @param user user information of the current logged in user.
   * @param updateUserDto contains request body data.
   * @returns returns the updated user object and response status.
   * @throws UnauthorizedException in case user is not logged in.
   * @throws ForbiddenException if the account is not activated.
   */
  @Patch("update-me")
  @UseGuards(AccountActivatedGuard)
  @ApiOperation({
    description: "Api to update user details.",
    summary: "Api to update user details.",
  })
  @ApiOkResponse({ description: "Update User Data", type: ApiResponseDto<User> })
  @ApiForbiddenResponse({ description: "If the account is not activated" })
  async updateUserDetails(
    @Body() updateUserDto: UpdateUserDto,
    @GetUser() user: User
  ): Promise<ApiResponseDto<User>> {
    const updatedUser = await this._userService.updateUserData(updateUserDto, user);

    return { status: "success", data: updatedUser };
  }
  @Patch("upload-image")
  @UseGuards(JwtAuthenticationGuard)
  @UseInterceptors(FileInterceptor("image", multerConfig))
  @ApiOperation({
    description: "Api to update user Profile Picture",
    summary: "Api to update user Profile Picture.",
  })
  @ApiOkResponse({ description: "Update User Data", type: ApiResponseDto<User> })
  @ApiForbiddenResponse({ description: "If the account is not activated" })
  async updateProfilePicture(@GetUser() user: User, @GetFileDestination() fileDestination: string) {
    console.log(fileDestination);
    await this._userService.updateImage({ imageUrl: fileDestination, user });

    return { status: "success", data: null, message: "Image updated successfully", statusCode: 200 };
  }

  /**
   * Get API - "/:id" - Get data about an user
   * @param id user profile information about an user
   * @returns returns the user object.
   * @throws UnauthorizedException with message in case user is not logged in.
   */
  @Get(":id")
  @ApiOperation({
    description: "Api to fetch profile details of an user",
    summary: "Api to fetch profile details of an user",
  })
  @ApiOkResponse({ description: "Get data about current logged in user", type: ApiResponseDto<User> })
  async getUserById(@Param("id") id: string): Promise<ApiResponseDto<User>> {
    const user = await this._userService.getUserById(id);

    return { status: "success", data: user };
  }
  @Get(":id/profile")
  @ApiOperation({
    description: "Api to fetch profile details of an user",
    summary: "Api to fetch profile details of an user",
  })
  @ApiOkResponse({ description: "Get data about current logged in user", type: ApiResponseDto<User> })
  async getUserProfile(@Param("id") id: string): Promise<ApiResponseDto<User>> {
    const user = await this._userService.getUserById(id, ["reviews", "products"]);

    return { status: "success", data: user };
  }

  @Patch("profile")
  @UseGuards(JwtAuthenticationGuard)
  @UseInterceptors(FileInterceptor("image", multerConfig))
  async updateProfile(
    @GetUser() user: User,
    @Request() req,
    @Body() updateDto: UpdateUserProfileDto
    // @GetFileDestination() fileDestination: string
  ) {
    if (req.file) {
      const length = req.file.path.split("/").length;
      updateDto.image = req.file.path.split("/").slice(1, length).join("/");
    }
    const updatedUser = await this._userService.updateProfile(user.id, updateDto);
    return {
      message: "Profile updated successfully",
      data: updatedUser,
      status: "success",
      statuscode: 200,
    };
  }

  @Patch("drop-off/address")
  @UseGuards(JwtAuthenticationGuard)
  async updateUserDropOffAddress(
    @GetUser() user: User,
    @GetUserInformation() userInfo: User,
    @Body() dto: CreateUserAddressDto
  ) {
    return await this._userAddressService.createAddress(userInfo, dto);
  }
  @Get("drop-off/address")
  @UseGuards(JwtAuthenticationGuard)
  async getUserDropOffAddress(@GetUser() user: User) {
    return await this._userAddressService.findByUserId(user.id);
  }
}
