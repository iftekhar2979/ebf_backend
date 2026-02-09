import { BullModule } from "@nestjs/bull";
import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "src/auth/auth.module";
import { Conversations } from "src/conversations/entities/conversations.entity";
import { Messages } from "src/messages/entities/messages.entity";
import { ParticipantsModule } from "src/participants/participants.module";
import { RedisModule } from "src/redis/redis.module";
import { UserModule } from "src/user/user.module";
import { SocketController } from "./socket.controller";
import { SocketGateway } from "./socket.gateway";
import { SocketService } from "./socket.service";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Messages, Conversations]),
    AuthModule,
    UserModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get<string>("JWT_SECRET") as any,
          signOptions: {
            expiresIn: configService.get<string>("EXPIRES_IN") as any,
          },
        };
      },
    }),
    //  forwardRef(() => MessagesModule),
    // MessagesModule,
    // ConversationsModule,
    BullModule.registerQueue({ name: "product" }, { name: "notifications" }),
    ParticipantsModule,
    RedisModule,
  ],
  providers: [SocketGateway, SocketService],
  controllers: [SocketController],
  exports: [SocketGateway, SocketService],
})
export class SocketModule {}
