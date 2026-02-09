import { Process, Processor } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Job } from "bull";

import { MailService } from "src/mail/mail.service";

@Processor("email") // Processor listening to 'ProductQueue'
@Injectable()
export class EmailProcessor {
  constructor(private readonly _mailService: MailService) {}

  @Process("mails")
  async OrderConfirmation(job: Job) {
    console.log("Email", job.data);
  }
}
