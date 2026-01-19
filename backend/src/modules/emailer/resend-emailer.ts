import { Resend } from "resend";
import { Submission } from "../../types";
import * as dotenv from "dotenv";

dotenv.config();

export class ResendEmailService {
  private resend: Resend;
  private fromEmail: string;
  private fromName: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.RESEND_API_KEY || "";
    this.resend = new Resend(key);
    
    this.fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";
    this.fromName = process.env.FROM_NAME || "Document Approval System";
    this.baseUrl = process.env.BASE_URL || "http://localhost:3000";
  }

  async verifyConnection(): Promise<boolean> {
    try {
      // Resend doesn't have a verify method, but we can check if API key is set
      return !!process.env.RESEND_API_KEY;
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
    const html = this.createApprovalEmailHTML(submission, approveUrl, rejectUrl);

    await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
    });
  }

  async sendApprovalConfirmationEmail(
    submission: Submission,
    recipientEmail: string,
  ): Promise<void> {
    const subject = `Document Approved: ${submission.title}`;
    const html = this.createApprovalConfirmationHTML(submission);

    await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
    });
  }

  async sendRejectionEmail(
    submission: Submission,
    recipientEmail: string,
  ): Promise<void> {
    const subject = `Document Rejected: ${submission.title}`;
    const html = this.createRejectionEmailHTML(submission);

    await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
    });
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (error) {
      throw new Error(
        `Failed to send email via Resend: ${error instanceof Error ? error.message : "Unknown error"}`,
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
      .button { display: block; margin: 10px 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📝 New Document Submission</h1>
    </div>
    <div class="content">
      <p>Hello Manager,</p>
      <p>A new document has been submitted for your review and approval.</p>
      
      <div class="submission-info">
        <h2>${submission.title}</h2>
        <p><span class="label">Submitted by:</span> ${submission.writerEmail || "Writer"}</p>
        <p><span class="label">Submitted on:</span> ${new Date(submission.createdAt).toLocaleString()}</p>
        <p><span class="label">Status:</span> ${submission.status}</p>
      </div>

      <h3>Content Preview:</h3>
      <div class="content-preview">
        ${submission.content.substring(0, 500)}${submission.content.length > 500 ? "..." : ""}
      </div>

      ${
        submission.imageReference
          ? `
      <div class="image-ref">
        <span class="label">📎 Image Reference:</span> ${submission.imageReference}
      </div>
      `
          : ""
      }

      <div class="actions">
        <a href="${approveUrl}" class="button button-approve">✅ Approve</a>
        <a href="${rejectUrl}" class="button button-reject">❌ Reject</a>
      </div>

      <p style="color: #666; font-size: 14px;">
        Click the buttons above to review and take action on this submission. 
        You can also log into the dashboard to review all pending submissions.
      </p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Document Approval System.</p>
      <p>© ${new Date().getFullYear()} Document Approval System</p>
    </div>
  </div>
</body>
</html>
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
    .success-banner { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .success-banner h2 { color: #155724; margin: 0 0 10px 0; font-size: 22px; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Document Approved!</h1>
    </div>
    <div class="content">
      <div class="success-banner">
        <h2>Congratulations!</h2>
        <p>Your document has been approved.</p>
      </div>
      
      <p>Hello,</p>
      <p>Great news! Your document "<strong>${submission.title}</strong>" has been approved by the manager.</p>
      
      <p><strong>Approved on:</strong> ${new Date(submission.updatedAt).toLocaleString()}</p>
      
      <p>Your content is now ready for publication.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Document Approval System</p>
    </div>
  </div>
</body>
</html>
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
    .rejection-banner { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .rejection-banner h2 { color: #721c24; margin: 0 0 10px 0; font-size: 22px; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Document Rejected</h1>
    </div>
    <div class="content">
      <div class="rejection-banner">
        <h2>Document Not Approved</h2>
        <p>Your submission requires revisions.</p>
      </div>
      
      <p>Hello,</p>
      <p>Your document "<strong>${submission.title}</strong>" has been rejected by the manager.</p>
      
      <p><strong>Rejected on:</strong> ${new Date(submission.updatedAt).toLocaleString()}</p>
      
      <p>Please review the feedback and make the necessary changes before resubmitting.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Document Approval System</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
