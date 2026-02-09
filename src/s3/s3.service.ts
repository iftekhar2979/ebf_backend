import {
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  ListBucketsCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import mime from "mime-types";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { User } from "src/user/entities/user.entity";
import { Logger } from "winston";
import { PrimaryPaths } from "./enums/primary-path.enum";

@Injectable()
export class S3Service {
  private s3: S3Client;

  constructor(
    private readonly configService: ConfigService,
    @InjectLogger() private readonly logger: Logger
  ) {
    this.s3 = new S3Client({
      endpoint: this.configService.get<string>("AWS_ENDPOINT"),
      region: this.configService.get<string>("AWS_REGION"),
      credentials: {
        accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY_ID"),
        secretAccessKey: this.configService.get<string>("AWS_SECRET_ACCESS_KEY"),
      },
      forcePathStyle: true,
    });
  }

  async testConnection() {
    try {
      const result = await this.s3.send(new ListBucketsCommand({}));
      this.logger.log("MinIO Connection Successful! Buckets:", result.Buckets);
      return result.Buckets;
    } catch (error) {
      this.logger.error("Failed to connect to MinIO:", error);
      throw error;
    }
  }

  async getPreSignedUrl(
    fileName: string,
    primaryPath: PrimaryPaths,
    expiresIn: number = 300,
    field: string,
    user: User
  ) {
    this.logger.log(`Generating pre-signed URL for file ${fileName}`, S3Service.name);

    // Get today's date in the required format
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "/");

    // Extract the original file name (without extension) and file extension
    const fileNameArr = fileName.split(".");
    const originalFileName = fileNameArr[0].replace(/[^a-zA-Z0-9]/g, "_");
    const contentType = mime.lookup(fileName) || "application/octet-stream"; // Use mime-types to determine the MIME type

    const imageName = `${primaryPath}/${date}/${originalFileName}-${Date.now()}.${fileNameArr[fileNameArr.length - 1]}`;

    // Log the content type for debugging
    console.log("Content Type:", contentType);

    const params: PutObjectCommandInput = {
      Bucket: this.configService.get<string>("AWS_PUBLIC_BUCKET_NAME"), // MinIO bucket name
      Key: imageName,
      ContentType: contentType, // Use the proper MIME type
      ContentDisposition: "inline",
      Metadata: {
        user_id: user.id,
        field: field,
        source: "webhook",
      },
    };

    // Generate the pre-signed URL for the file upload
    const command = new PutObjectCommand(params);
    const url = await getSignedUrl(this.s3, command, { expiresIn });
    // Return the pre-signed URL and other details
    return {
      url: this.removeCredentialFromUrl(url),
      key: imageName,
      method: "PUT",
      expiresIn: `${expiresIn}s`,
    };
  }
  removeCredentialFromUrl(url: string): string {
    const urlObj = new URL(url); // Create a URL object
    const searchParams = urlObj.searchParams; // Get the query parameters

    // Remove 'X-Amz-Credential' from the query parameters
    searchParams.delete("X-Amz-Credential");

    // Rebuild the URL without the 'X-Amz-Credential' query parameter
    urlObj.search = searchParams.toString();

    return urlObj.toString();
  }

  async deleteObject(imageName: string): Promise<boolean> {
    this.logger.log(`Deleting file ${imageName}`, S3Service.name);

    try {
      const params: DeleteObjectCommandInput = {
        Bucket: this.configService.get<string>("AWS_PUBLIC_BUCKET_NAME"), // MinIO bucket name
        Key: imageName,
      };

      const command = new DeleteObjectCommand(params);
      const result = await this.s3.send(command);

      const isSuccess = result.DeleteMarker === true || result.$metadata?.httpStatusCode === 204;

      if (isSuccess) {
        this.logger.log(`Successfully deleted ${imageName}`, S3Service.name);
        return true;
      } else {
        this.logger.warn(`Deletion of ${imageName} may not have been successful`, S3Service.name);
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete object ${imageName}: ${error.message}`,
        error.stack,
        S3Service.name
      );

      throw new S3ServiceException({
        message: `Failed to delete file: ${error.message}`,
        name: "S3DeleteObjectError",
        $fault: "client",
        $metadata: error.$metadata || {},
      });
    }
  }
}
