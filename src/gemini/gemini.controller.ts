import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { GeminiService } from "./gemini.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";

@Controller("product")
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post("analyze")
  @HttpCode(200)
  @UseGuards(JwtAuthenticationGuard)
  @UseInterceptors(FileInterceptor("image"))
  async analyzeProductImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No image uploaded");
    }
    try {
      return {
        status: "success",
        statusCode: 200,
        data: await this.geminiService.analyzeTheProductImage(file.buffer, file.mimetype),
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
