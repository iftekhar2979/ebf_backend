import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Authentication guard for Google Strategy
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {}
