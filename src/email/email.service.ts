import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT') ?? 587,
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendWithAttachment(options: {
    to: string | string[];
    subject: string;
    html: string;
    attachments?: { filename: string; content: Buffer; contentType: string }[];
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Vendor Marketplace" <${this.config.get<string>('SMTP_USER')}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      throw error;
    }
  }
}
