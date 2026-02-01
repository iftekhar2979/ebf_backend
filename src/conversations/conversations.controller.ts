import {
  Controller
} from "@nestjs/common";
import { ConversationsService } from "./conversations.service";

@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversationService: ConversationsService) {}

  // @Get()
  // @UseGuards(JwtAuthenticationGuard)
  // async getConversations(
  //   @GetUser() user: User,
  //   @Query("page") page: number = 1, // Default to page 1
  //   @Query("limit") limit: number = 10, // Default to limit 10
  //   @Query("term") term: string = ""
  // ) {
  //   // Call the repository method to get paginated conversations
  //   return this.conversationService.getAllConversations(user.id, term, page, limit);
  // }

  // @Post("")
  // @UseGuards(JwtAuthenticationGuard)
  // // @ApiOperation({ summary: 'Create or get existing direct conversation' })
  // // @ApiResponse({ status: 201, description: 'Conversation returned', type: Conversations })
  // async createDirectConversation(
  //   @Body() dto: CreateDirectConversationDto,
  //   @GetUser() user: User,
  //   @Response() res
  // ): Promise<ResponseInterface<Conversations>> {
  //   const conversation = await this.conversationService.directConversation({ dto, user });

  //   if (conversation.statusCode === 201) {
  //     // New conversation created, return 201
  //     return res.status(HttpStatus.CREATED).json(conversation);
  //   } else {
  //     // Existing conversation found, return 200
  //     return res.status(HttpStatus.OK).json(conversation);
  //   }
  // }
}
