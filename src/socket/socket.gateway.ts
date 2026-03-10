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
    origin: ["https://home4500.merinasib.shop", "http://localhost:4500"],
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

  async handleConnection(socket: Socket) {
    const userId = socket.handshake.query.userId as string;
    if (!userId) return socket.disconnect(true);
    
    // Join user room
    socket.join(`user:${userId}`);
    console.log(`✅ ${userId} joined room user:${userId}`);
    
    // 🔥 Store in Redis: userId → socket.id
    const client = this._redisService.getClient();
    await client.set(`socket_user:${userId}`, socket.id);
    console.log(`🟢 ${userId} is online (socket: ${socket.id})`);

    // Broadcast online status
    socket.broadcast.emit("user-online", { userId });
  }

  handleDisconnect(client: Socket): void {
    this._socketService.handleDisconnection(client);
  }

  @SubscribeMessage("message")
  handleMessage(@MessageBody() data: any) {
    // Note: room logic should be dynamic based on user/recipient
    this.server.to(`user:${data.recipientId || '3002'}`).emit("message", data);
  }
}
