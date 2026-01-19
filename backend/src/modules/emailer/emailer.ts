import nodemailer, { Transporter } from "nodemailer";
import { Submission } from "../../types";
import * as dotenv from "dotenv";

dotenv.config();

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private transporter: Transporter;
  private fromEmail: string;
  private fromName: string;
  private baseUrl: string;

  constructor(config?: EmailConfig) {
    const emailConfig = config || {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    };

    this.fromEmail = process.env.FROM_EMAIL || emailConfig.auth.user;
    this.fromName = process.env.FROM_NAME || "Document Approval System";
    this.baseUrl = process.env.BASE_URL || "http://localhost:3000";

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendApprovalEmailWithTokens(
    submission: Submission,
    recipientEmail: string,
    approveToken: string,
    rejectToken: string,
  ): Promise<void> {
    const approveUrl = `${this.baseUrl}/api/email/approve?token=${approveToken}`;
    const rejectUrl = `${this.baseUrl}/api/email/reject?token=${rejectToken}`;

    const subject = `New Document Submission: ${submission.title}`;

    const html = this.createApprovalEmailHTML(
      submission,
      approveUrl,
      rejectUrl,
    );

    const text = this.createApprovalEmailText(
      submission,
      approveUrl,
      rejectUrl,
    );

    await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });
  }

  async sendApprovalEmail(
    submission: Submission,
    recipientEmail: string,
  ): Promise<void> {
    const approveUrl = `${this.baseUrl}/api/approve?post_id=${submission.id}`;
    const rejectUrl = `${this.baseUrl}/api/reject?post_id=${submission.id}`;

    const subject = `New Document Submission: ${submission.title}`;

    const html = this.createApprovalEmailHTML(
      submission,
      approveUrl,
      rejectUrl,
    );

    const text = this.createApprovalEmailText(
      submission,
      approveUrl,
      rejectUrl,
    );

    await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });
  }

  async sendRejectionEmail(
    submission: Submission,
    recipientEmail: string,
  ): Promise<void> {
    const subject = `Document Rejected: ${submission.title}`;

    const html = this.createRejectionEmailHTML(submission);

    const text = this.createRejectionEmailText(submission);

    await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });
  }

  async sendApprovalConfirmationEmail(
    submission: Submission,
    recipientEmail: string,
  ): Promise<void> {
    const subject = `Document Approved: ${submission.title}`;

    const html = this.createApprovalConfirmationHTML(submission);

    const text = this.createApprovalConfirmationText(submission);

    await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } catch (error) {
      throw new Error(
        `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private createApprovalEmailHTML(
    submission: Submission,
    approveUrl: string,
    rejectUrl: string,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Approval Request</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .submission-info { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .submission-info h2 { margin-top: 0; color: #667eea; font-size: 20px; }
    .submission-info p { margin: 10px 0; }
    .label { font-weight: bold; color: #666; }
    .content-preview { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; max-height: 200px; overflow: hidden; }
    .actions { text-align: center; margin: 30px 0; }
    .button { display: inline-block; padding: 14px 32px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; transition: all 0.3s; }
    .button-approve { background: #10b981; color: white; }
    .button-approve:hover { background: #059669; }
    .button-reject { background: #ef4444; color: white; }
    .button-reject:hover { background: #dc2626; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee; }
    .image-ref { background: #e0e7ff; padding: 10px; border-radius: 4px; margin: 10px 0; }
    @media only screen and (max-width: 600px) {
      .container { margin: 0; border-radius: 0; }
      .header { border-radius: 0; }
      .button { display: block; margin: 10px 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 New Document Submission</h1>
    </div>
    <div class="content">
      <p>A new document has been submitted and requires your approval.</p>
      
      <div class="submission-info">
        <h2>${this.escapeHtml(submission.title)}</h2>
        <p><span class="label">Submission ID:</span> ${submission.id}</p>
        <p><span class="label">Submitted:</span> ${new Date(submission.createdAt).toLocaleString()}</p>
        ${submission.writerEmail ? `<p><span class="label">Writer:</span> ${this.escapeHtml(submission.writerEmail)}</p>` : ""}
        ${submission.embeddedImages && submission.embeddedImages.length > 0 ? `<div class="image-ref"><span class="label">📷 Contains ${submission.embeddedImages.length} embedded image(s)</span></div>` : ""}
      </div>

      ${submission.imageReference ? `<div style="text-align: center; margin: 20px 0;"><img src="${submission.imageReference}" alt="Submission Image" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #ddd;" /></div>` : ""}
      
      ${submission.embeddedImages && submission.embeddedImages.length > 0 ? `<div style="margin: 20px 0;">${submission.embeddedImages.map((img, idx) => `<div style="text-align: center; margin: 15px 0;"><img src="${img}" alt="Embedded Image ${idx + 1}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #ddd;" /></div>`).join("")}</div>` : ""}

      <div class="content-preview">
        <p><strong>Content Preview:</strong></p>
        <p>${this.escapeHtml(submission.content.substring(0, 300))}${submission.content.length > 300 ? "..." : ""}</p>
      </div>

      <div class="actions">
        <a href="${approveUrl}" class="button button-approve">✓ Approve</a>
        <a href="${rejectUrl}" class="button button-reject">✗ Reject</a>
      </div>

      <p style="color: #666; font-size: 14px; text-align: center;">
        Click the buttons above to approve or reject this submission.
      </p>
    </div>
    <div class="footer">
      <p>This is an automated email from the Document Approval System.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private createApprovalEmailText(
    submission: Submission,
    approveUrl: string,
    rejectUrl: string,
  ): string {
    return `
NEW DOCUMENT SUBMISSION
=======================

A new document has been submitted and requires your approval.

Title: ${submission.title}
Submission ID: ${submission.id}
Submitted: ${new Date(submission.createdAt).toLocaleString()}
${submission.writerEmail ? `Writer: ${submission.writerEmail}` : ""}
${submission.imageReference ? `Image: ${submission.imageReference}` : ""}

CONTENT PREVIEW:
${submission.content.substring(0, 300)}${submission.content.length > 300 ? "..." : ""}

ACTIONS:
--------
Approve: ${approveUrl}
Reject: ${rejectUrl}

---
This is an automated email from the Document Approval System.
Please do not reply to this email.
    `;
  }

  private createRejectionEmailHTML(submission: Submission): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Rejected</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .submission-info { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Document Rejected</h1>
    </div>
    <div class="content">
      <p>Your document submission has been reviewed and rejected.</p>
      
      <div class="submission-info">
        <h2>${this.escapeHtml(submission.title)}</h2>
        <p><strong>Submission ID:</strong> ${submission.id}</p>
        <p><strong>Submitted:</strong> ${new Date(submission.createdAt).toLocaleString()}</p>
        <p><strong>Rejected:</strong> ${new Date(submission.updatedAt).toLocaleString()}</p>
      </div>

      <p>Please review your submission and consider resubmitting with the necessary improvements.</p>
    </div>
    <div class="footer">
      <p>This is an automated email from the Document Approval System.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private createRejectionEmailText(submission: Submission): string {
    return `
DOCUMENT REJECTED
=================

Your document submission has been reviewed and rejected.

Title: ${submission.title}
Submission ID: ${submission.id}
Submitted: ${new Date(submission.createdAt).toLocaleString()}
Rejected: ${new Date(submission.updatedAt).toLocaleString()}

Please review your submission and consider resubmitting with the necessary improvements.

---
This is an automated email from the Document Approval System.
    `;
  }

  private createApprovalConfirmationHTML(submission: Submission): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Approved</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .submission-info { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Document Approved</h1>
    </div>
    <div class="content">
      <p>Congratulations! Your document submission has been approved.</p>
      
      <div class="submission-info">
        <h2>${this.escapeHtml(submission.title)}</h2>
        <p><strong>Submission ID:</strong> ${submission.id}</p>
        <p><strong>Submitted:</strong> ${new Date(submission.createdAt).toLocaleString()}</p>
        <p><strong>Approved:</strong> ${new Date(submission.updatedAt).toLocaleString()}</p>
      </div>

      <p>Your document is now published and visible to the audience.</p>
    </div>
    <div class="footer">
      <p>This is an automated email from the Document Approval System.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private createApprovalConfirmationText(submission: Submission): string {
    return `
DOCUMENT APPROVED
=================

Congratulations! Your document submission has been approved.

Title: ${submission.title}
Submission ID: ${submission.id}
Submitted: ${new Date(submission.createdAt).toLocaleString()}
Approved: ${new Date(submission.updatedAt).toLocaleString()}

Your document is now published and visible to the audience.

---
This is an automated email from the Document Approval System.
    `;
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }

  close(): void {
    this.transporter.close();
  }
}
