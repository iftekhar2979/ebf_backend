import { ApiProperty } from "@nestjs/swagger";

export class MessageResponseDto {
  /**
   * Status of the response
   */
  @ApiProperty({ description: "Status of the response" })
  status: string;

  /**
   * Message for the account activation
   */
  @ApiProperty({ description: "Message for the account activation" })
  message: string;
}
