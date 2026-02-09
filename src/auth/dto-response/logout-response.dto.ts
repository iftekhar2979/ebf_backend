import { ApiProperty } from "@nestjs/swagger";

export class LogoutResponseDto {
  /**
   * Status of the response
   */
  @ApiProperty({ description: "Status of the response" })
  status: string;

  /**
   * Token for user
   */
  @ApiProperty({ description: "Token for user", default: null })
  token: string;
}
