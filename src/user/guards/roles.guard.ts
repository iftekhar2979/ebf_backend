import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRoles as Role } from "../enums/role.enum";
import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * Role Guard to restrict access to APIs that should be accessible to certain user roles only.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * it checks if user is allowed access to the requested API.
   * @param context execution context for current request.
   * @returns true if user is allowed otherwise false
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // console.log(user);

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
