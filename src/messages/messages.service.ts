import { Injectable } from "@nestjs/common";

@Injectable()
export class MessagesService {
  // constructor(
  //   @InjectRepository(Messages)
  //   private _messageRepo: Repository<Messages>,
  //   private readonly _conversationService: ConversationsService,
  //   private readonly _userService: UserService,
  //   private readonly _attachmentService: AttachmentService,
  //   private readonly _socketService: SocketService,
  //   @InjectLogger() private readonly _logger: Logger
  // ) {}
  // async sendMessage(dto: SendMessageDto): Promise<Messages> {
  //   try {
  //     const conversation = await this._conversationService.getConversationId(dto.conversation_id);
  //     const message = this._messageRepo.create({
  //       msg: dto.msg,
  //       type: dto.type ? dto.type : "text",
  //       sender: dto.sender,
  //       conversation,
  //       isRead: false,
  //     });
  //     this._logger.log("Message Service", message);
  //     const savedMessage = await this._messageRepo.save(message);
  //     if (dto.attachments?.length) {
  //       await this._attachmentService.addAttachments(savedMessage, dto.attachments);
  //       return this._messageRepo.findOneOrFail({
  //         where: { id: savedMessage.id },
  //         relations: ["attachments"],
  //       });
  //     }
  //     return savedMessage;
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }
  // async seenMessages({ conversation_id }: { conversation_id: number }) {
  //   const updateResult = await this._messageRepo
  //     .createQueryBuilder()
  //     .update(Messages)
  //     .set({ isRead: true })
  //     .where("conversation_id = :conversation_id", { conversation_id })
  //     .andWhere("isRead = false")
  //     .execute();
  //   return {
  //     message: `${updateResult.affected} message(s) marked as read`,
  //   };
  // }
  // async sendFileAsMessageWithRest({
  //   conversation_id,
  //   user,
  //   file,
  //   receiver,
  // }: {
  //   conversation_id: number;
  //   receiver: User;
  //   user: User;
  //   file: Express.Multer.File[];
  // }) {
  //   // console.log(this._socketService.connectedUsers);
  //   if (file.length < 1) {
  //     throw new BadRequestException("Please select a file to send");
  //   }
  //   // console.log(file);
  //   const images = file.map((singleFile) => {
  //     return {
  //       file_url: `${singleFile.destination.slice(7, singleFile.destination.length)}/${singleFile.filename}`,
  //       type: singleFile.mimetype,
  //     };
  //   });
  //   const msgType: "image" | "video" =
  //     images[0].type.includes("image") || images[0].type.includes("octet-stream") ? "image" : "video";
  //   const msg = await this.sendMessage({
  //     conversation_id,
  //     sender: user,
  //     attachments: images,
  //     type: msgType,
  //   });
  //   //  console.log("first")
  //   await this._conversationService.updatedConversation({ conversation_id, message: msg });
  //   const receiverSocket = this._socketService.getSocketByUserId(receiver.id);
  //   // console.log(this._socketService)
  //   const senderSocket = this._socketService.getSocketByUserId(user.id);
  //   if (receiverSocket) {
  //     receiverSocket.emit(`conversation-${conversation_id}`, msg);
  //   }
  //   if (senderSocket) {
  //     senderSocket.emit(`conversation-${conversation_id}`, msg);
  //   }
  //   return msg;
  // }
  // async getMessages({
  //   conversationId,
  //   conversation,
  //   receiver,
  //   page = 1,
  //   limit = 10,
  // }: {
  //   conversationId: number;
  //   receiver: Partial<User>;
  //   conversation: Conversations;
  //   page: number;
  //   limit: number;
  // }): Promise<
  //   ResponseInterface<{ receiver: Partial<User>; conversation: Conversations; messages: Messages[] }>
  // > {
  //   const [messages, total] = await this._messageRepo.findAndCount({
  //     where: { conversation: { id: conversationId } },
  //     relations: ["attachments", "offer"],
  //     order: { created_at: "DESC" },
  //     // skip: skip,
  //     // take: take,
  //   });
  //   const lastmsg = messages[messages.length - 1];
  //   // console.log(receiver, messages[messages.length-1].sender_id)
  //   if (receiver.id !== lastmsg.sender_id) {
  //     console.log("receiver and lastmsg sender are not same");
  //     await this.seenMessages({ conversation_id: conversationId });
  //   }
  //   // If no messages are found
  //   if (messages.length === 0) {
  //     throw new NotFoundException("No messages found for this conversation");
  //   }
  //   return {
  //     status: "success",
  //     message: "Messages retrived successfully",
  //     statusCode: 200,
  //     data: { receiver, conversation, messages },
  //     pagination: pagination({ page, limit, total }),
  //   };
  // }
}
