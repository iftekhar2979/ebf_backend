import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";

/**
 * Account Activation guard to restrict access for activated accounts.
 */
@Injectable()
export class AccountActivatedGuard implements CanActivate {
  /**
   * it checks if user is active
   * @param context execution context for current request.
   * @returns true if user is active otherwise false
   */
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    console.log("user", user);
    if (user.active) return true;

    throw new ForbiddenException("Please activate your account");
  }
}
