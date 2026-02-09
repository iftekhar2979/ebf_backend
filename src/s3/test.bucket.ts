// test-minio-connection.ts
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3"; // AWS SDK v3
import { ConfigService } from "@nestjs/config";

// Get ConfigService to access environment variables
const configService = new ConfigService();

// Initialize the MinIO client with credentials and endpoint
const s3 = new S3Client({
  endpoint: configService.get<string>("MINIO_ENDPOINT") || "http://localhost:9000", // MinIO endpoint
  region: configService.get<string>("AWS_REGION") || "us-east-1", // MinIO region
  credentials: {
    accessKeyId: configService.get<string>("MINIO_ACCESS_KEY"), // MinIO access key from .env
    secretAccessKey: configService.get<string>("MINIO_SECRET_KEY"), // MinIO secret key from .env
  },
  forcePathStyle: true, // MinIO requires path-style URLs
});

async function testConnection() {
  try {
    // Test the connection by listing all buckets
    const result = await s3.send(new ListBucketsCommand({}));
    console.log("Connection successful! Buckets:", result.Buckets);
  } catch (error) {
    console.error("Error connecting to MinIO:", error);
  }
}

// Call the test function
testConnection();
