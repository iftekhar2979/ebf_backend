import { Controller, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { GetUser } from "../../auth/decorators/get-user.decorator";
import { User } from "../../user/entities/user.entity";
import { ViewsService } from "./views.service";
// import { AuthGuard } from "@nestjs/passport"; // Uncomment if auth guard is used

@Controller("reels/:reelId/views")
export class ViewsController {
  constructor(private readonly viewsService: ViewsService) {}

  @Post()
//   @UseGuards(AuthGuard('jwt')) 
@UseGuards(JwtAuthenticationGuard)
  async trackView(
    @Param('reelId', ParseIntPipe) reelId: number,
    @GetUser() user: User
  ) {
    const userId = user?.id
    await this.viewsService.trackView(reelId, userId);
    return { success: true, message: 'View tracked' };
  }
}
