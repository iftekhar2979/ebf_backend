import { S3Client } from "@aws-sdk/client-s3";
import multerS3 from "multer-s3";
import { ConfigService } from "@nestjs/config";

const configService = new ConfigService();
import { diskStorage } from "multer";
import { extname } from "path";

export const multerConfig = {
  storage: diskStorage({
    destination: `public/uploads/${new Date().toISOString().split("T")[0].replace(/-/g, "/")}`,
    filename: (req, file, callback) => {
      //  const date =
      console.log("ON MULTER", file);
      const uniqueSuffix = Math.round(Math.random() * 1e9);
      callback(null, file.fieldname + "-" + uniqueSuffix + extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, callback) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "audio/mpeg",
      "audio/wav",
      "video/mp4",
      "video/webm",
      "video/ogg",
      "application/octet-stream",
    ];
    console.log(file);
    if (allowedMimes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error("Invalid file type. Only image, audio, and video files are allowed"), false);
    }
  },
};

export const s3 = new S3Client({
  region: configService.get<string>("AWS_REGION") || "us-east-1",
  credentials: {
    accessKeyId: configService.get<string>("AWS_ACCESS_KEY_ID") || "access_key",
    secretAccessKey: configService.get<string>("AWS_SECRET_ACCESS_KEY") || "secret_key",
  },
  endpoint: configService.get<string>("AWS_ENDPOINT") || "http://172.17.0.4:9000", // Optional if using S3-compatible storage (like MinIO)
  forcePathStyle: true, // Required for some S3-compatible services
});

console.log("AWS Access Key:", configService.get<string>("AWS_ACCESS_KEY_ID"));
console.log("AWS Secret:", configService.get<string>("AWS_SECRET_ACCESS_KEY"));

export const multerS3Config = multerS3({
  s3: s3, // 🔹 Pass the defined `s3` object here
  bucket: configService.get<string>("AWS_S3_BUCKET_NAME") || "mybucket",
  acl: "public-read",
  metadata: (req, file, callback) => {
    // console.log("📂 Metadata received:", req);
    callback(null, { fieldName: file.fieldname });
  },
  key: (req, file, callback) => {
    console.log(req);
    // Get today's date in the required format
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "/");
    const uniqueFileName = `${date}/${file.originalname}-${Date.now()}`;
    callback(null, uniqueFileName);
  },
});
