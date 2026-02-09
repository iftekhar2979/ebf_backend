import { BadRequestException, createParamDecorator, ExecutionContext } from "@nestjs/common";
import { User } from "../../user/entities/user.entity";
import path from "node:path";

/**
 * Decorator
 * Returns the current logged in user data
 */
export const GetUser = createParamDecorator((data: unknown, ctx: ExecutionContext): User => {
  const req = ctx.switchToHttp().getRequest();
  // req.user.password = undefined;
  return req.user;
});
export const GetUserInformation = createParamDecorator((data: unknown, ctx: ExecutionContext): User => {
  const req = ctx.switchToHttp().getRequest();
  // req.user.password = undefined;
  return req.userInfo;
});
export const GetReceiver = createParamDecorator((data: unknown, ctx: ExecutionContext): User => {
  const req = ctx.switchToHttp().getRequest();
  // req.user.password = undefined;
  return req.receiver;
});
export const GetConversation = createParamDecorator((data: unknown, ctx: ExecutionContext): User => {
  const req = ctx.switchToHttp().getRequest();
  // req.user.password = undefined;
  return req.conversation;
});
export const GetFileDestination = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest();
  const file = req.file;
  if (!file) {
    throw new BadRequestException("File not found in request");
  }
  const length = file.path.split("/").length;
  return file.path.split("/").slice(1, length).join("/");
});
function fileDestinations({ images }: { images: Express.Multer.File[] }): string[] {
  console.log(images);
  if (!images) {
    return [];
  }
  return images.map((file) => {
    // Normalize to the OS-specific format
    const normalized = path.normalize(file.path);

    // Split correctly using OS separator (\ for Windows, / for Linux/Mac)
    const parts = normalized.split(path.sep);

    // Remove the first folder (e.g., "public")
    return parts.slice(1).join("/"); // Use "/" for URLs
  });
}
export const GetFilesDestination = createParamDecorator((data: unknown, ctx: ExecutionContext): string[] => {
  const req = ctx.switchToHttp().getRequest();
  const file = req.files;
  if (!file) {
    throw new BadRequestException("File not found in request");
  }
  // console.log("file",file.images)
  const image = fileDestinations({ images: file.images });
  // console.log(image)
  return image;
});
export const GetOptionalFilesDestination = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const file = req.files;
  // console.log("Files", req.files);
  if (!file) {
    throw new BadRequestException("File not found in request");
  }
  if (!file.images || file.images.length === 0) {
    return [];
  } else {
    // console.log(file);
    return fileDestinations({ images: file.images });
  }
});
