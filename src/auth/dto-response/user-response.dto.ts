import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";

export class UserResponseDto {
  /**
   * Status of the response
   */
  @ApiProperty({ description: "Status of the response" })
  status: string;

  /**
   * User data after signing up
   */
  @ApiProperty({ description: "User data after signing up" })
  data: User;

  /**
   * Token to be used to logging in the user
   */
  @ApiProperty({ description: "Token to be used to logging in the user" })
  token: string;
}
