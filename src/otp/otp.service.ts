import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Otp, OtpType } from "./entities/otp.entity";
import { MoreThan, Repository } from "typeorm";

@Injectable()
export class OtpService {
  constructor(@InjectRepository(Otp) private otpRepository: Repository<Otp>) {}
  generateOtp(length: number = 6): string {
    let otp = "";

    // Generate a random number for each digit of the OTP
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10); // Generates a random digit (0-9)
    }

    return otp;
  }

  async createOtp(userId: string, type: OtpType): Promise<Otp> {
    await this.otpRepository.delete({ user_id: userId });

    const otp = this.generateOtp(4);
    const newOtp = this.otpRepository.create({
      otp,
      user_id: userId,
      type: type,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    });
    // console.log(newOtp)

    return await this.otpRepository.save(newOtp);
  }
  async validateOtp(user_id: string, otp: string, type: OtpType): Promise<Otp | null> {
    const currentTime = new Date();
    const verification = await this.otpRepository.findOne({
      where: { user_id: user_id, otp: otp, type: type, expiresAt: MoreThan(currentTime) },
    });
    if (!verification) {
      return null; // OTP is invalid or expired
    }
    return verification; // OTP is valid
  }

  async findOtpByUserId(user_id: string): Promise<Otp | null> {
    return await this.otpRepository.findOne({
      where: { user_id: user_id },
    });
  }

  async updateOtpAttempts(user_id: string, attempts: number): Promise<void> {
    await this.otpRepository.update({ user_id }, { attempts });
  }
  async removeOtpByUserId(user_id: string): Promise<void> {
    await this.otpRepository.delete({ user_id });
  }
}
