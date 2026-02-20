import { Controller } from "@nestjs/common";
// import { MessageEligabilityGuard } from "./decorators/message-eligability.guard";

@Controller("messages")
export class MessagesController {
  // constructor(
  //   private readonly _messagesService: MessagesService
  //   // private readonly socketService:SocketService
  // ) {}
  // @Get(":id")
  // @UseGuards(JwtAuthenticationGuard)
  // async getMessages(
  //   @GetReceiver() receiver: User,
  //   @GetConversation() conversation: Conversations,
  //   @Param("id") conversationId: number,
  //   @Query("page") page: number = 1,
  //   @Query("limit") limit: number = 10
  // ) {
  //   const response = await this._messagesService.getMessages({
  //     conversationId,
  //     receiver,
  //     conversation,
  //     page,
  //     limit,
  //   });
  //   return response;
  // }
  // @Post("file")
  // @UseGuards(JwtAuthenticationGuard, MessageEligabilityGuard)
  // @UseInterceptors(
  //   FileFieldsInterceptor(
  //     [
  //       { name: "images", maxCount: 6 }, // You can limit the number of files here
  //     ],
  //     multerConfig
  //   )
  // )
  // async sendFile(
  //   @GetReceiver() receiver: User,
  //   @Body() body: { conversationId: string },
  //   @GetUser() user: User,
  //   @UploadedFiles() files: { images?: Express.Multer.File[] }
  //   //  @GetReceiver() receiver:User,
  // ) {
  //   if (!receiver) {
  //     throw new BadRequestException("Receiver not found!");
  //   }
  //   const conversationId = body.conversationId;
  //   const response = await this._messagesService.sendFileAsMessageWithRest({
  //     conversation_id: parseFloat(conversationId),
  //     user,
  //     receiver,
  //     file: files.images,
  //   });
  //   return response;
  // }
}
