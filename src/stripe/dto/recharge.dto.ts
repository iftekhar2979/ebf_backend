import { IsNumber, IsString, Max, Min } from "class-validator";

export class RechargeDto {
  @IsNumber()
  @Min(10, { message: "Minimum 10 Pounds required" })
  @Max(10000, { message: "Maximum 10000 recharge possible" })
  amount: number;
  @IsString()
  // @MinLength(5,{message:"Transection Id should has minimum 5 charachters"})
  // @MaxLength(30,{message:"Transection Id should has Maximum 15 charachters"})
  paymentId: string;
  @IsString()
  paymentMethod: "stripe" | "revenuecat";
}
export class WithDrawDto {
  @IsNumber()
  @Min(30, { message: "Minimum 10 Pounds required to withdraw" })
  @Max(10000, { message: "Maximum 10000 withdraw possible" })
  amount: number;
  // @IsString()
  // // @MinLength(5,{message:"Transection Id should has minimum 5 charachters"})
  // // @MaxLength(30,{message:"Transection Id should has Maximum 15 charachters"})
  // paymentId: string
  @IsString()
  paymentMethod: "stripe" | "revenuecat";
}
