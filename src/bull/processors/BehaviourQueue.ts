import { Processor } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";

@Processor("behaviour") // Processor listening to 'ProductQueue'
@Injectable()
export class UserBehaviour {}
