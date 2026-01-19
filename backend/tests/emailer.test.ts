import { EmailService } from "../src/modules/emailer/emailer";
import { Submission, SubmissionStatus } from "../src/types";

const mockSendMail = jest
  .fn()
  .mockResolvedValue({ messageId: "test-message-id" });
const mockVerify = jest.fn().mockResolvedValue(true);
const mockClose = jest.fn();

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    verify: mockVerify,
    sendMail: mockSendMail,
    close: mockClose,
  })),
}));

describe("Email Service", () => {
  let emailService: EmailService;
  let mockSubmission: Submission;

  beforeEach(() => {
    mockSendMail.mockClear();
    mockVerify.mockClear();
    mockClose.mockClear();

    mockSendMail.mockResolvedValue({ messageId: "test-message-id" });
    mockVerify.mockResolvedValue(true);

    emailService = new EmailService({
      host: "smtp.test.com",
      port: 587,
      secure: false,
      auth: {
        user: "test@test.com",
        pass: "test-password",
      },
    });

    mockSubmission = {
      id: "test-123",
      title: "Test Article",
      content:
        "This is a test article content with enough text to demonstrate the email preview functionality.",
      status: SubmissionStatus.Pending,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      writerEmail: "writer@test.com",
      imageReference: "https://example.com/image.jpg",
    };
  });

  afterEach(() => {
    emailService.close();
  });

  describe("Initialization", () => {
    test("should create email service with default config", () => {
      const service = new EmailService();
      expect(service).toBeDefined();
      service.close();
    });

    test("should create email service with custom config", () => {
      expect(emailService).toBeDefined();
    });

    test("should verify SMTP connection", async () => {
      const isVerified = await emailService.verifyConnection();
      expect(isVerified).toBe(true);
      expect(mockVerify).toHaveBeenCalled();
    });
  });

  describe("Approval Email", () => {
    test("should send approval email successfully", async () => {
      await expect(
        emailService.sendApprovalEmail(mockSubmission, "admin@test.com"),
      ).resolves.not.toThrow();
    });

    test("should include submission details in email", async () => {
      await emailService.sendApprovalEmail(mockSubmission, "admin@test.com");

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "admin@test.com",
          subject: expect.stringContaining("Test Article"),
          html: expect.any(String),
          text: expect.any(String),
        }),
      );
    });

    test("should include approve and reject URLs in HTML", async () => {
      await emailService.sendApprovalEmail(mockSubmission, "admin@test.com");

      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain("/api/approve?post_id=test-123");
      expect(call.html).toContain("/api/reject?post_id=test-123");
      expect(call.html).toContain("Test Article");
      expect(call.html).toContain("writer@test.com");
      expect(call.html).toContain("https://example.com/image.jpg");
    });

    test("should include approve and reject URLs in plain text", async () => {
      await emailService.sendApprovalEmail(mockSubmission, "admin@test.com");

      const call = mockSendMail.mock.calls[0][0];
      expect(call.text).toContain("/api/approve?post_id=test-123");
      expect(call.text).toContain("/api/reject?post_id=test-123");
      expect(call.text).toContain("Test Article");
    });

    test("should handle submission without optional fields", async () => {
      const minimalSubmission: Submission = {
        id: "test-456",
        title: "Minimal Article",
        content: "Short content.",
        status: SubmissionStatus.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await expect(
        emailService.sendApprovalEmail(minimalSubmission, "admin@test.com"),
      ).resolves.not.toThrow();
    });
  });

  describe("Rejection Email", () => {
    test("should send rejection email successfully", async () => {
      await expect(
        emailService.sendRejectionEmail(mockSubmission, "writer@test.com"),
      ).resolves.not.toThrow();
    });

    test("should include submission details in rejection email", async () => {
      await emailService.sendRejectionEmail(mockSubmission, "writer@test.com");

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "writer@test.com",
          subject: expect.stringContaining("Rejected"),
          html: expect.any(String),
          text: expect.any(String),
        }),
      );
    });

    test("should include rejection message in HTML", async () => {
      await emailService.sendRejectionEmail(mockSubmission, "writer@test.com");

      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain("rejected");
      expect(call.html).toContain("Test Article");
    });
  });

  describe("Approval Confirmation Email", () => {
    test("should send approval confirmation email successfully", async () => {
      await expect(
        emailService.sendApprovalConfirmationEmail(
          mockSubmission,
          "writer@test.com",
        ),
      ).resolves.not.toThrow();
    });

    test("should include submission details in confirmation email", async () => {
      await emailService.sendApprovalConfirmationEmail(
        mockSubmission,
        "writer@test.com",
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "writer@test.com",
          subject: expect.stringContaining("Approved"),
          html: expect.any(String),
          text: expect.any(String),
        }),
      );
    });

    test("should include approval message in HTML", async () => {
      await emailService.sendApprovalConfirmationEmail(
        mockSubmission,
        "writer@test.com",
      );

      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain("Approved");
      expect(call.html).toContain("Test Article");
    });
  });

  describe("Error Handling", () => {
    test("should handle email sending failure", async () => {
      mockSendMail.mockRejectedValueOnce(new Error("SMTP connection failed"));

      await expect(
        emailService.sendApprovalEmail(mockSubmission, "admin@test.com"),
      ).rejects.toThrow("Failed to send email");
    });

    test("should handle connection verification failure", async () => {
      mockVerify.mockRejectedValueOnce(new Error("Connection failed"));

      const isVerified = await emailService.verifyConnection();
      expect(isVerified).toBe(false);
    });
  });

  describe("HTML Safety", () => {
    test("should escape HTML in submission title", async () => {
      const maliciousSubmission: Submission = {
        ...mockSubmission,
        title: '<script>alert("XSS")</script>',
        content: "Test content",
      };

      await emailService.sendApprovalEmail(
        maliciousSubmission,
        "admin@test.com",
      );

      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).not.toContain("<script>");
      expect(call.html).toContain("&lt;script&gt;");
    });

    test("should escape HTML in submission content", async () => {
      const maliciousSubmission: Submission = {
        ...mockSubmission,
        content: '<img src=x onerror=alert("XSS")>',
      };

      await emailService.sendApprovalEmail(
        maliciousSubmission,
        "admin@test.com",
      );

      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain("&lt;img");
      expect(call.html).toContain("&gt;");
      expect(call.html).toContain(
        "&lt;img src=x onerror=alert(&quot;XSS&quot;)&gt;",
      );
      expect(call.html).not.toMatch(/<img\s+src=x\s+onerror=/);
    });
  });

  describe("Content Preview", () => {
    test("should truncate long content in preview", async () => {
      const longContent = "A".repeat(500);
      const longSubmission: Submission = {
        ...mockSubmission,
        content: longContent,
      };

      await emailService.sendApprovalEmail(longSubmission, "admin@test.com");

      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain("...");
    });

    test("should not truncate short content", async () => {
      const shortSubmission: Submission = {
        ...mockSubmission,
        content: "Short content",
      };

      await emailService.sendApprovalEmail(shortSubmission, "admin@test.com");

      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain("Short content");
      expect(call.html).not.toContain("Short content...");
    });
  });
});
