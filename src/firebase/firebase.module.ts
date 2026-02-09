// import { UsersModule } from "src/users/users.module";
import { Global, Module } from "@nestjs/common";
import { FirebaseController } from "./firebase.controller";
import { FirebaseService } from "./firebase.service";
import { UserModule } from "src/user/user.module";
@Global()
@Module({
  imports: [UserModule],
  controllers: [FirebaseController],
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
