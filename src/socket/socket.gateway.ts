// socket.gateway.ts
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { RedisService } from "src/redis/redis.service";
import { SocketService } from "./socket.service";

@WebSocketGateway({
  cors: {
    origin: ["https://home4500.merinasib.shop", "http://localhost:4500"], // ⚠️ removed trailing space!
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  afterInit() {
    console.log("✅ Socket.IO server initialized");
  }

  constructor(
    private readonly _socketService: SocketService,
    private readonly _redisService: RedisService
  ) {}

  // handleConnection(client: Socket): void {
  //   console.log("Client connected:", client.id);
  //   this._socketService.handleConnection(client, this.server); // pass server
  // }
  async handleConnection(socket: Socket) {
    const userId = socket.handshake.query.userId as string;
    if (!userId) return socket.disconnect(true);
    // ✅ ONLY this line is needed for routing
    socket.join(`user:3002`);
    console.log(`✅ ${userId} joined room user:${userId}`);
    // 🔥 Store in Redis: userId → socket.id
    await (await this._redisService.getClient()).set(`socket_user:${userId}`, socket.id);
    console.log(`🟢 ${userId} is online (socket: ${socket.id})`);

    // Optional: broadcast to others
    socket.broadcast.emit("user-online", { userId });
  }
  handleDisconnect(client: Socket): void {
    this._socketService.handleDisconnection(client);
  }
  // @SubscribeMessage("message")
  // async handleMessage(@MessageBody() data: any) {
  //   console.log('📩 Received "message" via @SubscribeMessage:', data);
  //   return await this._socketService.handleIncomingMessage(data, this.server);
  // }

  @SubscribeMessage("message")
  handleMessage(@MessageBody() data: any) {
    this.server.to(`user:3002`).emit("message", data);
  }

  // async handleMessage(client: Socket, @MessageBody() data: any) {
  //   // console.log(client);
  //   // console.log('📩 Received "message" event:', data);
  //   return await this._socketService.handleMessage(client, this.server, data);
  // }
}
