import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Authentication guard for JWT Strategy
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
