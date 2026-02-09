import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Server } from "socket.io";
import { Repository } from "typeorm";
// import mongoose, { Model, ObjectId } from 'mongoose';
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { Socket } from "socket.io";
import { Conversations } from "src/conversations/entities/conversations.entity";
import { Messages } from "src/messages/entities/messages.entity";
import { ParticipantsService } from "src/participants/participants.service";
import { UserService } from "src/user/user.service";

@Injectable()
// @UseGuards(WsJwtGuard)
export class SocketService {
  constructor(
    private readonly _userService: UserService,
    private readonly _jwtService: JwtService,
    @InjectRepository(Messages) private readonly _messageRepository: Repository<Messages>,
    @InjectRepository(Conversations) private readonly _conversationRepository: Repository<Conversations>,
    private readonly _participantService: ParticipantsService,
    @InjectQueue("notifications") private readonly _notificationQueue: Queue
  ) {}

  // async handleConnection(socket: Socket, server: Server): Promise<void> {
  //   try {
  //     // console.log(socket);
  //     // === 1. Authenticate ===
  //     // const token = socket.handshake.headers.authorization?.split(" ")[1];
  //     // if (!token) throw new UnauthorizedException("Missing token");

  //     // const payload = this._jwtService.verify(token);
  //     // const user = await this._userService.getUserById(payload.id);
  //     // if (!user?.first_name) throw new UnauthorizedException("Invalid user");

  //     // === 2. Join user room ===
  //     // socket.data.userId = user.id; // attach for later use
  //     // socket.join(`user:${user.id}`); // 🔑 critical for cross-server messaging

  //     // Optional: notify others user is online
  //     // socket.broadcast.emit("user-online", { userId: user.id });

  //     // === 3. Set up event listeners ===
  //     // socket.on("send-message", (data) => this.handleSendMessage(user.id, data, server));
  //     // socket.on("seen", (data) => this.handleMessageSeen(user.id, data.receiver_id, data.conversation_id));

  //     // === 4. WebRTC Signaling (now works across servers!) ===
  //     socket.on("offer", ({ to, offer }) => {
  //       // server.to(`user:${to}`).emit("offer", { from: user.id, offer });
  //     });

  //     socket.on("message", (data) => {
  //       server.to(`user:${data.to}`).emit("message", data);
  //     });
  //     socket.on("offer-answer", ({ to, answer }) => {
  //       // server.to(`user:${to}`).emit("offer-answer", { from: user.id, answer });
  //     });
  //     // socket.on("message", (data) => {
  //     //   server.to(`user:${data.to}`).emit("message", data);
  //     // });
  //     socket.on("ice-candidate", ({ to, candidate }) => {
  //       // server.to(`user:${to}`).emit("ice-candidate", { from: user.id, candidate });
  //     });
  //   } catch (error) {
  //     console.error("Auth failed:", error.message);
  //     socket.disconnect(true);
  //   }
  // }

  // async handleMessage(socket: Socket, server: Server, data: any): Promise<void> {
  //   console.log(socket);

  // }

  handleDisconnection(socket: Socket): void {
    const userId = socket.data?.userId;
    if (userId) {
      // Optional: notify others
      socket.broadcast.emit("user-offline", { userId });
      // No need to clean maps — we don’t store state!
    }
  }
  async handleIncomingMessage(data: any, server: Server) {
    console.log("💾 Saving message to DB:", data);

    // 2. Emit to receiver via ROOM (this uses Redis adapter automatically!)
    server.to(`user:${data.conversationId}`).emit("new-message", data);

    console.log(`📤 Emitted to room user:${data.conversationId}`);

    // 3. Optional: publish to Redis channel for other services (if needed)
    // But usually NOT needed — Socket.IO + Redis adapter handles inter-server sync

    return { status: "sent", messageId: data };
  }

  // async userActiveStatus(id: string, socket: Socket) {
  //   const friendsInfo = (await this.participantService.findMyFriends(id)) || [];
  //   console.log("USER CONNECTION", friendsInfo);
  //   friendsInfo.forEach((friend: User) => {
  //     if (this.connectedUsers.get(friend.id)) {
  //       socket.emit("active-users", {
  //         message: `${friend.first_name} is online now.`,
  //         isActive: true,
  //         id: friend.id,
  //       });
  //     }
  //   });
  // }
  // getSocketByUserId(userId: string): Socket | undefined {
  //   console.log(this.connectedUsers);
  //   const socketID = this.connectedUsers.get(userId)?.socketID;
  //   return socketID ? this.connectedClients.get(socketID) : undefined;
  // }
  joinRoom({ roomkey }: { roomkey: string }) {
    try {
      // this.io.join(roomkey);
    } catch (error) {
      console.log(error);
    }
  }
  sendToRoom(roomkey: string, event: string, value: any) {
    // this.io.to(roomkey).emit(event, value);
  }
  // async handleMessageDelivery({
  //   senderId,
  //   receiverId,
  //   conversation_id,
  //   message,
  // }: {
  //   senderId: string;
  //   receiverId: string;
  //   conversation_id: number;
  //   message: Messages;
  // }) {
  //   const receiverSocket = this.getSocketByUserId(receiverId);
  //   const senderSocket = this.getSocketByUserId(senderId);
  //   console.log(message.sender);
  //   const senderName = `${message?.sender?.first_name} ${message?.sender?.last_name}`;
  //   delete message.conversation;
  //   delete message.sender;
  //   if (receiverSocket) {
  //     receiverSocket.emit(`conversation-${conversation_id}`, message);
  //   } else {
  //     const user = await this.userService.getUserById(receiverId);
  //     if (user.fcm) {
  //       await this._notificationQueue.add("push_notifications", {
  //         token: user.fcm,
  //         title: ` ${senderName} messaged you `,
  //         body: `${message.msg}`,
  //       });
  //     }
  //   }
  //   if (senderSocket) {
  //     senderSocket.emit(`conversation-${conversation_id}`, message);
  //   }
  // }

  // async handleSendMessage(
  //   payload: User,
  //   data: { conversation_id: number; msg: string },
  //   socket: Socket
  // ): Promise<void> {
  //   try {
  //     console.log("Sending Message Event calll", data);
  //     if (!data.conversation_id || !data.msg || !payload.id) {
  //       throw new Error("Invalid message data!");
  //     }
  //     const conversation_id = data.conversation_id;
  //     const { sender, receiver, conversation } = await this.participantService.checkEligablity({
  //       conversation_id,
  //       user_id: payload.id,
  //     });
  //     if (!sender && !receiver) {
  //       throw new BadRequestException("You are not eligable for this chat .");
  //     }
  //     if (payload.id === receiver.id) {
  //       this.getSocketByUserId(sender.id).emit(
  //         `error`,
  //         "Message Delivered Failed!! Because Sender and Receiver are same"
  //       );
  //     }
  //     const message = this.messageRepository.create({
  //       sender,
  //       msg: data.msg,
  //       type: "text",
  //       conversation,
  //       isRead: false,
  //       conversation_id: conversation.id,
  //     });
  //     // console.log(message);
  //     this.handleMessageDelivery({
  //       senderId: sender.id,
  //       receiverId: receiver.id,
  //       conversation_id: conversation.id,
  //       message,
  //     });
  //     await this.messageRepository.save(message);
  //     conversation.lastmsg = message;
  //     await this.conversationRepository.save(conversation);
  //     socket.emit(`conversation-${conversation_id}`, message);
  //   } catch (error) {
  //     // console.log(error)
  //     console.error("Error handling send-message:", error.message);
  //     socket.emit(`error:${data.conversation_id}`, {
  //       message: "Failed to send message.",
  //     });
  //   }
  // }

  // activeSocket(id: string, message: string, payload: any): void {
  //   const senderSocket = this.getSocketByUserId(id.toString());
  //   if (senderSocket) {
  //     senderSocket.emit(message, payload);
  //   } else {
  //     console.log("Socket is not active");
  //   }
  // }
  // async handleMessageSeen(sender_id: string, receiver_id: string, conversation_id: number) {
  //   try {
  //     //   let lastMessage = await this.messageService.seenMessages({conversation_id})
  //     const lastMessage = await this.messageRepository
  //       .createQueryBuilder()
  //       .update(Messages)
  //       .set({ isRead: true })
  //       .where("conversation_id = :conversation_id", { conversation_id })
  //       .andWhere("isRead = false")
  //       .execute();
  //     this.activeSocket(sender_id, `seen-${conversation_id}`, {
  //       seen: true,
  //       seenBy: sender_id,
  //     });
  //     this.activeSocket(receiver_id, `seen-${conversation_id}`, {
  //       seen: true,
  //       seenBy: receiver_id,
  //     });
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }
}
