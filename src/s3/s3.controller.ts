import { Controller, Delete, Get, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { User } from "src/user/entities/user.entity";
import { PreSignedUrlDTO } from "./dto/pre-signed-url.dto";
import { S3Service } from "./s3.service";

@ApiTags("S3")
// @UseGuards(JwtAuthGuard)
// @ApiBearerAuth()
@Controller("s3")
//  @UseGuards(JwtAuthGuard, AccountActivatedGuard)
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Get("test-connection")
  async testConnection() {
    return await this.s3Service.testConnection();
  }

  @Get("pre-signed-url")
  @ApiOperation({
    summary: "Generate S3 Pre-Signed URL",
    description:
      "Generates a pre-signed URL for accessing an S3 object. The URL can be used for uploading or downloading a file from S3 with a specified expiration time.",
  })
  @ApiOkResponse({ description: "Get S3 pre-signed URL" })
  async getPreSignedUrl(@Query() preSignedUrlDto: PreSignedUrlDTO, @GetUser() user: User) {
    const { fileName, primaryPath, expiresIn, field } = preSignedUrlDto;
    const result = await this.s3Service.getPreSignedUrl(fileName, primaryPath, expiresIn, field, { ...user });
    return { status: "success", data: result };
  }

  @Delete("delete/:key")
  @ApiOperation({
    summary: "Delete S3 Object",
    description:
      "Deletes an object from S3 based on the provided key. Returns a success status if the deletion is successful, otherwise indicates failure.",
  })
  @ApiOkResponse({ description: "Delete S3 object" })
  async delete(@Param("key") key: string) {
    const result = await this.s3Service.deleteObject(key);

    return result === true
      ? { status: "success", data: result }
      : { status: "failed", data: "File Not Deleted" };
  }
}
