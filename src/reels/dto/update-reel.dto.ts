import { PartialType } from "@nestjs/swagger";
import { CreateReelDto } from "./create-reel.dto";

export class UpdateReelDto extends PartialType(CreateReelDto) {}
