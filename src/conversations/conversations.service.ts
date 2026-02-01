import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Messages } from "src/messages/entities/messages.entity";
import { ParticipantsService } from "src/participants/participants.service";
import { SocketService } from "src/socket/socket.service";
import { UserService } from "src/user/user.service";
import { DataSource, Repository } from "typeorm";
import { Conversations } from "./entities/conversations.entity";
@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversations)
    private conversationRepo: Repository<Conversations>,
    @InjectRepository(Messages) private messageRepo: Repository<Messages>,
    private readonly participantService: ParticipantsService,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
    private readonly socketService: SocketService
  ) {}

  // async getConversationId(conversationId: number) {
  //   return await this.conversationRepo.findOneByOrFail({ id: conversationId });
  // }
  // async createConversation({ product, users }: { product: Product; users: User[] }) {
  //   console.log(product);
  //   const conversation = this.conversationRepo.create({
  //     name: `${product.product_name} (${users.map((u) => u.first_name).join(" - ")})`,
  //     image: `${product.images[0].image}`,
  //     product,
  //   });
  //   console.log(conversation);
  //   return await this.conversationRepo.save(conversation);
  // }
  // async updatedConversation({
  //   conversation_id,
  //   conversation,
  //   message,
  // }: {
  //   conversation_id: number;
  //   conversation?: Partial<Conversations>;
  //   message: Messages;
  // }) {
  //   const chat = await this.getConversationId(conversation_id);
  //   if (!chat) {
  //     throw new NotFoundException("Conversation not found");
  //   }
  //   if (message && conversation_id) {
  //     chat.lastmsg = message;
  //   }
  //   if (conversation) {
  //     if (conversation.image) {
  //       chat.image = conversation.image;
  //     }
  //     if (conversation.name) {
  //       chat.name = conversation.name;
  //     }
  //     if (conversation.lastmsg) {
  //       chat.lastmsg = conversation.lastmsg;
  //     }
  //   }
  //   return await this.conversationRepo.save(chat);
  // }
  // async offerStatusHandle({
  //   offer,
  //   existingConversation,
  //   offerType,
  // }: {
  //   offer: Offer;
  //   existingConversation: Conversations;
  //   offerType: OfferStatus;
  // }) {
  //   if (offerType === OfferStatus.PENDING) {
  //     const msg = this.messageRepo.create({
  //       sender_id: offer.buyer_id,
  //       isRead: false,
  //       msg: `Current Price : ${existingConversation.product.selling_price} \n Offer Price : ${offer.price}`,
  //       offer_id: offer.id,
  //       offer: offer,
  //       type: "offer",
  //       conversation: existingConversation,
  //     });
  //     await this.messageRepo.save(msg);
  //     delete msg.offer.buyer;
  //     delete msg.offer.seller;
  //     delete msg.offer.product;
  //     console.log("Existing Conversation", existingConversation);
  //     this.socketService.handleMessageDelivery({
  //       senderId: offer.buyer_id,
  //       receiverId: offer.seller_id,
  //       conversation_id: existingConversation.id,
  //       message: msg,
  //     });
  //   } else if (offerType === OfferStatus.ACCEPTED) {
  //     console.log(offerType);
  //     const msg = this.messageRepo.create({
  //       sender_id: offer.seller_id,
  //       isRead: false,
  //       msg: `Offer Price : ${offer.price} is accepted`,
  //       offer_id: offer.id,
  //       offer: offer,
  //       type: "offer",
  //       conversation: existingConversation,
  //     });
  //     await this.messageRepo.save(msg);
  //     // console.log(msg)
  //     this.socketService.handleMessageDelivery({
  //       senderId: offer.buyer_id,
  //       receiverId: offer.seller_id,
  //       conversation_id: existingConversation.id,
  //       message: msg,
  //     });
  //   } else {
  //     console.log(offerType);
  //     const msg = this.messageRepo.create({
  //       sender_id: offer.seller_id,
  //       isRead: false,
  //       msg: `Sorry , Offer Price : ${offer.price} is rejected .`,
  //       offer_id: offer.id,
  //       offer: offer,
  //       type: "offer",
  //       conversation: existingConversation,
  //     });
  //     await this.messageRepo.save(msg);
  //     this.socketService.handleMessageDelivery({
  //       senderId: offer.buyer_id,
  //       receiverId: offer.seller_id,
  //       conversation_id: existingConversation.id,
  //       message: msg,
  //     });
  //   }
  // }

  // async getOrCreate({
  //   productId,
  //   userIds,
  //   offer,
  //   offerType,
  // }: {
  //   productId: number;
  //   userIds: string[];
  //   offer: Offer;
  //   offerType: OfferStatus;
  // }): Promise<Conversations> {
  //   try {
  //     // const existing = await this.participantService.checkChatAlreadyExist({
  //     //   product_id: productId,
  //     //   user_ids: userIds,
  //     // });
  //     // console.log(existing)
  //     // Case: Conversation already exists
  //     // if (existing.length > 1) {
  //     //   const existingConversation = await this.conversationRepo.findOne({
  //     //     where: { product: { id: productId } },
  //     //     relations: ["participants", "product"],
  //     //   });
  //     //   // console.log(existingConversation)
  //     //   // console.warn("Existing Conversation")
  //     //   await this.offerStatusHandle({ offer, existingConversation, offerType });
  //     //   return existingConversation;
  //     // }

  //     const conversations = await this.conversationRepo.find({
  //       where: { product: { id: productId } },
  //       relations: ["participants", "participants.user", "product"],
  //     });

  //     // Find conversation that has exactly the same participants
  //     const existingConversation = conversations.find((conv) => {
  //       const participantIds = conv.participants.map((p) => p.user.id).sort();
  //       return participantIds.join(",") === userIds.sort().join(",");
  //     });

  //     if (existingConversation) {
  //       await this.offerStatusHandle({ offer, existingConversation, offerType });
  //       return existingConversation;
  //     }

  //     // Case: New conversation - use transaction
  //     return await this.dataSource.transaction(async (manager) => {
  //       const product = await this.productService.getProduct(productId);
  //       if (!product) {
  //         throw new BadRequestException("No Product Found with that reference!");
  //       }

  //       this.productService.checkProductStatus(product.status);

  //       const users = await this.userService.getMultipleUserByIds(userIds);
  //       // Create conversation using transactional entity manager
  //       const savedConversation = await manager.save(Conversations, {
  //         product,
  //         name: `${product.product_name} (${users.map((u) => u.first_name).join(" - ")})`,
  //         image: product.images[0]?.image || null,
  //         lastmsg: null,
  //       });

  //       // Add participants
  //       await this.participantService.addMultiple(savedConversation, users, product, manager);
  //       // Save message
  //       const msg = await manager.create(Messages, {
  //         sender_id: offer.buyer_id,
  //         isRead: false,
  //         msg: `Current Price : ${product.selling_price} \n Offer Price : ${offer.price}`,
  //         type: "offer",
  //         offer_id: offer.id,
  //         offer: offer,
  //         conversation: savedConversation,
  //       });
  //       savedConversation.lastmsg = msg;
  //       await manager.save(msg);
  //       // console.log(msg)
  //       await manager.save(Conversations, savedConversation);
  //       // await this.updatedConversation({conversation_id:savedConversation.id , message:msg ,conversation:{lastmsg:msg}})
  //       this.socketService.handleMessageDelivery({
  //         senderId: offer.buyer_id,
  //         receiverId: offer.seller_id,
  //         conversation_id: savedConversation.id,
  //         message: msg,
  //       });

  //       // await this.mailService.sendOfferConfirmation(buyer);

  //       return savedConversation;
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     throw new BadRequestException("Error in fetching existing conversation");
  //   }
  // }
  // async getAllConversations(user_id: string, term: string, page: number, limit: number) {
  //   try {
  //     // Calculate skip and take for pagination
  //     const skip = (page - 1) * limit;
  //     const take = limit;

  //     // Fetch conversations with necessary relations and apply pagination
  //     const [conversations, total] = await this.conversationRepo
  //       .createQueryBuilder("conversation")
  //       .leftJoinAndSelect("conversation.participants", "participant")
  //       .leftJoinAndSelect("conversation.product", "product")
  //       .leftJoinAndSelect("product.images", "productImages")
  //       .leftJoin("participant.user", "user") // Join with user but don't auto-select full user
  //       .leftJoinAndSelect("conversation.lastmsg", "lastmsg") // Join with last message
  //       .addSelect([
  //         "user.id",
  //         "user.first_name",
  //         "user.last_name",
  //         "user.image",
  //         "user.email",
  //         "user.isActive",
  //       ]) // Only select necessary fields from user
  //       .orderBy("conversation.created_at", "DESC")
  //       .where("user.id = :user_id", { user_id }) // Filter conversations where user.id is not equal to provided user_id
  //       .andWhere(
  //         new Brackets((qb) => {
  //           qb.where("conversation.name ILIKE :term", { term: `%${term}%` })
  //             .orWhere("user.first_name ILIKE :term", { term: `%${term}%` })
  //             .orWhere("user.last_name ILIKE :term", { term: `%${term}%` });
  //         })
  //       )
  //       .skip(skip) // Apply pagination
  //       .take(take)
  //       .cache(true)
  //       .getManyAndCount();

  //     // Process the conversations to include only other participants (exclude logged-in user)

  //     // Prepare the response object
  //     const response = {
  //       message: "Conversations retrieved successfully",
  //       statusCode: 200,
  //       data: conversations, // Include the filtered conversations
  //       pagination: pagination({ page, limit, total }), // Ensure pagination details
  //     };

  //     return response;
  //   } catch (error) {
  //     // Handle any unexpected errors and provide a descriptive message
  //     console.error("Error fetching conversations:", error);
  //     throw new Error("Unable to retrieve conversations at this time.");
  //   }
  // }

  // async directConversation({
  //   dto,
  //   user,
  // }: {
  //   dto: CreateDirectConversationDto;
  //   user: User;
  // }): Promise<ResponseInterface<Conversations>> {
  //   const queryRunner = this.dataSource.createQueryRunner();

  //   await queryRunner.connect();
  //   await queryRunner.startTransaction();

  //   try {
  //     const { productId, userId } = dto;

  //     if (user.id === userId) {
  //       throw new ForbiddenException("same user can't create any conversation");
  //     }

  //     const participantIds = [userId, user.id];

  //     // ✅ 1. Check for existing conversation with same product and same 2 users
  //     const existingConversations = await this.conversationRepo
  //       .createQueryBuilder("conversation")
  //       .leftJoinAndSelect("conversation.participants", "participants")
  //       .leftJoinAndSelect("participants.user", "user")
  //       .where("conversation.product = :productId", { productId })
  //       .getMany();

  //     for (const conv of existingConversations) {
  //       const participantUserIds = conv.participants.map((p) => p.user.id);
  //       if (
  //         participantUserIds.length === 2 &&
  //         participantUserIds.includes(user.id) &&
  //         participantUserIds.includes(userId)
  //       ) {
  //         // ✅ Return existing conversation
  //         return {
  //           message: "conversation created successfully",
  //           status: "success",
  //           statusCode: 200,
  //           data: await this.conversationRepo.findOne({
  //             where: { id: conv.id },
  //             relations: ["participants", "participants.user", "product"],
  //           }),
  //         };
  //       }
  //     }

  //     // 2. Fetch Product
  //     const product = await queryRunner.manager.findOne(Product, {
  //       where: { id: productId },
  //     });
  //     if (!product) throw new Error("Product not found");

  //     // 3. Fetch Users
  //     const users = await queryRunner.manager.find(User, {
  //       where: { id: In(participantIds) },
  //     });

  //     if (users.length !== participantIds.length) {
  //       throw new Error("One or more users not found");
  //     }

  //     // 4. Create Conversation
  //     const conversation = queryRunner.manager.create(Conversations, {
  //       name: `${product.product_name} (${users[0].first_name} - ${users[1].first_name})`,
  //       image: null,
  //       product,
  //     });

  //     const savedConversation = await queryRunner.manager.save(conversation);

  //     // 5. Create Participants
  //     const participants = users.map((user) =>
  //       queryRunner.manager.create(ConversationParticipant, {
  //         conversation: savedConversation,
  //         user,
  //       })
  //     );

  //     await queryRunner.manager.save(ConversationParticipant, participants);

  //     // 6. Commit
  //     await queryRunner.commitTransaction();

  //     // 7. Return with relations
  //     return {
  //       message: "conversation created successfully",
  //       status: "success",
  //       statusCode: 201,
  //       data: await this.conversationRepo.findOne({
  //         where: { id: savedConversation.id },
  //         relations: ["participants", "participants.user", "product"],
  //       }),
  //     };
  //   } catch (err) {
  //     await queryRunner.rollbackTransaction();
  //     throw err;
  //   } finally {
  //     await queryRunner.release();
  //   }
  // }
}
