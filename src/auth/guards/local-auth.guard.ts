import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Authentication guard for Local passport Strategy
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {
  //     constructor(
  //          private readonly jwtService: JwtService, // Inject JwtService
  //     private readonly userService: UserService, // Inject UserService
  //     ){
  //         super();
  //     }
  // async  canActivate(context: ExecutionContext) {
  //     const request = context.switchToHttp().getRequest();
  //     // console.log(request.headers);
  //     const authHeader = request.headers['authorization'];
  //     if (authHeader) {
  //       const token = authHeader.split(' ')[1];
  //       console.log('JWT Token from header:', token);  // Log the token
  //       if (!token) {
  //         console.log('Invalid JWT token format');
  //         throw new UnauthorizedException('Invalid JWT token format');
  //       }
  //       try{
  //         console.log(process.env.JWT_SECRET) // Log the secret for debugging
  //         // Verify the JWT token
  //         const payload =  this.jwtService.verify(token);
  //         // console.log('Decoded user from JWT:', user); // Log the decoded user
  //         const user = await this.userService.getUserById(payload.id);
  //         if (!user) {
  //           console.log('Invalid JWT token');
  //           throw new UnauthorizedException('Session expired');
  //         }
  //         console.log(user)
  //         request.user = user; // Attach the user to the request object
  //       }catch (error) {
  //         console.error('JWT verification error:', error);
  //         throw new UnauthorizedException('Session expired ');
  //       }
  //     //   const user = this.hand
  //       // Optionally, you can add more checks here to verify the token format or expiration.
  //     } else {
  //       console.log('No Authorization header found');
  //     }
  //     // Continue with the normal guard behavior
  //     // return super.canActivate(context);
  //   }
  //   handleRequest(err, user, info, context) {
  //     if (err || !user) {
  //       throw new UnauthorizedException('Invalid JWT token');
  //     }
  //     return user;
  //   }
}
