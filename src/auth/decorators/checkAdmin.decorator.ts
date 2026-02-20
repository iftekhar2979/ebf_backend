import { BadRequestException, createParamDecorator, ExecutionContext } from "@nestjs/common";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";

export const GetUserRole = createParamDecorator((role: UserRoles, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const user = req.user;

  if (user && user.roles.includes(role)) {
    return true; // You can return true to indicate that role validation passed
  }

  throw new BadRequestException("You are not allowed to use the resource");
});
