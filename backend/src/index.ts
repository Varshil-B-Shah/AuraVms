import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { parseDocument } from "./modules/parser/parser";
import { WorkflowManager } from "./modules/workflow/workflow";
import { Storage } from "./modules/storage/storage";
import { EmailService } from "./modules/emailer/emailer";

dotenv.config({ path: ".env.local" });
dotenv.config();

const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET =
  process.env.JWT_SECRET || "default-secret-key-change-in-production";
const EMAIL_SECRET =
  process.env.EMAIL_SECRET || "email-secret-key-for-secure-links";

const generateEmailToken = (
  submissionId: string,
  action: "approve" | "reject",
): string => {
  const data = `${submissionId}:${action}:${Date.now()}`;
  const signature = crypto
    .createHmac("sha256", EMAIL_SECRET)
    .update(data)
    .digest("hex");
  return Buffer.from(`${data}:${signature}`).toString("base64url");
};

const verifyEmailToken = (
  token: string,
): { submissionId: string; action: "approve" | "reject" } | null => {
  try {
    const data = Buffer.from(token, "base64url").toString();
    const parts = data.split(":");
    if (parts.length !== 4) return null;

    const [submissionId, action, timestamp, signature] = parts;
    const expectedData = `${submissionId}:${action}:${timestamp}`;
    const expectedSignature = crypto
      .createHmac("sha256", EMAIL_SECRET)
      .update(expectedData)
      .digest("hex");

    if (signature !== expectedSignature) return null;
    if (action !== "approve" && action !== "reject") return null;

    return { submissionId, action: action as "approve" | "reject" };
  } catch {
    return null;
  }
};

const USERS = {
  writer: {
    email: process.env.WRITER_EMAIL || "writer@example.com",
    password: process.env.WRITER_PASSWORD || "writer123",
    role: "writer",
  },
  manager: {
    email: process.env.MANAGER_EMAIL_AUTH || "manager@example.com",
    password: process.env.MANAGER_PASSWORD || "manager123",
    role: "manager",
  },
};

const tokenBlacklist = new Set<string>();

declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        role: string;
      };
    }
  }
}

const storage = new Storage();
const workflow = new WorkflowManager(storage);
const emailService = new EmailService({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://aura-vms.vercel.app",
      process.env.FRONTEND_URL,
    ].filter((origin): origin is string => Boolean(origin)),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use /tmp on Vercel (serverless), local uploads directory in development
const uploadsDir = process.env.NODE_ENV === 'production'
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, "..", "uploads");
  
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage_multer,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".txt", ".md", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `File type not allowed. Only ${allowedExtensions.join(", ")} files are accepted.`,
        ),
      );
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token =
    req.headers["authorization"]?.split(" ")[1] || req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  if (tokenBlacklist.has(token)) {
    return res
      .status(401)
      .json({ error: "Token has been invalidated. Please login again." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      email: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

const authenticateWriter = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.role !== "writer") {
    return res
      .status(403)
      .json({ error: "Access denied. Writer role required." });
  }
  next();
};

const authenticateManager = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.role !== "manager") {
    return res
      .status(403)
      .json({ error: "Access denied. Manager role required." });
  }
  next();
};

app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

app.post("/api/login", (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    let user = null;
    if (email === USERS.writer.email && password === USERS.writer.password) {
      user = USERS.writer;
    } else if (
      email === USERS.manager.email &&
      password === USERS.manager.password
    ) {
      user = USERS.manager;
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/logout", authenticateToken, (req: Request, res: Response) => {
  try {
    const token =
      req.headers["authorization"]?.split(" ")[1] || req.cookies.token;

    if (token) {
      tokenBlacklist.add(token);
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    res.status(500).json({ error: "Logout failed" });
  }
});

app.get("/api/me", authenticateToken, (req: Request, res: Response) => {
  res.json({
    success: true,
    user: req.user,
  });
});

app.get("/api/email/approve", async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).send(`
        <html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #e74c3c;">❌ Invalid Link</h2>
          <p>The approval link is missing required information.</p>
        </body></html>
      `);
    }

    const tokenData = verifyEmailToken(token);
    if (!tokenData || tokenData.action !== "approve") {
      return res.status(400).send(`
        <html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #e74c3c;">❌ Invalid or Expired Link</h2>
          <p>This approval link is invalid or has expired.</p>
        </body></html>
      `);
    }

    const { submissionId } = tokenData;

    const submission = workflow.getSubmission(submissionId);
    if (!submission) {
      return res.status(404).send(`
        <html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #e74c3c;">📄 Submission Not Found</h2>
          <p>The submission could not be found.</p>
        </body></html>
      `);
    }

    if (submission.status !== "pending") {
      return res.send(`
        <html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #f39c12;">⚠️ Already Processed</h2>
          <p>This submission has already been <strong>${submission.status}</strong>.</p>
          <div style="margin: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <h3>${submission.title}</h3>
            <p><strong>Status:</strong> ${submission.status.toUpperCase()}</p>
            <p><strong>Updated:</strong> ${new Date(submission.updatedAt).toLocaleString()}</p>
          </div>
        </body></html>
      `);
    }

    const updatedSubmission = workflow.approveSubmission(submissionId);

    // Send confirmation email asynchronously
    if (process.env.FROM_EMAIL) {
      emailService.sendApprovalConfirmationEmail(
        updatedSubmission,
        process.env.FROM_EMAIL,
      ).catch((emailError) => {
        console.error("Failed to send approval confirmation email:", emailError);
      });
    }

    res.send(`
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .content { padding: 30px; }
          .status-banner { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center; }
          .status-banner h2 { color: #155724; margin: 0 0 10px 0; font-size: 22px; }
          .status-banner p { color: #155724; margin: 0; font-size: 16px; }
          .submission-details { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .detail-label { font-weight: 600; color: #495057; }
          .detail-value { color: #6c757d; }
          .footer { padding: 20px; background: #f8f9fa; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>📄 Document Approval System</h1>
          </div>
          <div class="content">
            <div class="status-banner">
              <h2>✅ Submission Approved!</h2>
              <p>The document has been successfully approved and the writer has been notified.</p>
            </div>
            
            <div class="submission-details">
              <div class="detail-row">
                <span class="detail-label">Title:</span>
                <span class="detail-value">${updatedSubmission.title}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Submission ID:</span>
                <span class="detail-value">${updatedSubmission.id}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">APPROVED</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Approved at:</span>
                <span class="detail-value">${new Date().toLocaleString()}</span>
              </div>
            </div>
            
            <p style="color: #6c757d; text-align: center; margin: 0;">
              ✉️ A confirmation email has been sent to the writer.
            </p>
          </div>
          <div class="footer">
            This action was completed successfully. You can close this window.
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
        <h2 style="color: #e74c3c;">❌ Server Error</h2>
        <p>Failed to process the approval request.</p>
      </body></html>
    `);
  }
});

app.get("/api/email/reject", async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).send(`
        <html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #e74c3c;">❌ Invalid Link</h2>
          <p>The rejection link is missing required information.</p>
        </body></html>
      `);
    }

    const tokenData = verifyEmailToken(token);
    if (!tokenData || tokenData.action !== "reject") {
      return res.status(400).send(`
        <html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #e74c3c;">❌ Invalid or Expired Link</h2>
          <p>This rejection link is invalid or has expired.</p>
        </body></html>
      `);
    }

    const { submissionId } = tokenData;

    const submission = workflow.getSubmission(submissionId);
    if (!submission) {
      return res.status(404).send(`
        <html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #e74c3c;">📄 Submission Not Found</h2>
          <p>The submission could not be found.</p>
        </body></html>
      `);
    }

    if (submission.status !== "pending") {
      return res.send(`
        <html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #f39c12;">⚠️ Already Processed</h2>
          <p>This submission has already been <strong>${submission.status}</strong>.</p>
          <div style="margin: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <h3>${submission.title}</h3>
            <p><strong>Status:</strong> ${submission.status.toUpperCase()}</p>
            <p><strong>Updated:</strong> ${new Date(submission.updatedAt).toLocaleString()}</p>
          </div>
        </body></html>
      `);
    }

    const updatedSubmission = workflow.rejectSubmission(submissionId);

    // Send rejection email asynchronously
    if (process.env.FROM_EMAIL) {
      emailService.sendRejectionEmail(
        updatedSubmission,
        process.env.FROM_EMAIL,
      ).catch((emailError) => {
        console.error("Failed to send rejection email:", emailError);
      });
    }

    res.send(`
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .content { padding: 30px; }
          .status-banner { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center; }
          .status-banner h2 { color: #721c24; margin: 0 0 10px 0; font-size: 22px; }
          .status-banner p { color: #721c24; margin: 0; font-size: 16px; }
          .submission-details { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .detail-label { font-weight: 600; color: #495057; }
          .detail-value { color: #6c757d; }
          .footer { padding: 20px; background: #f8f9fa; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>📄 Document Approval System</h1>
          </div>
          <div class="content">
            <div class="status-banner">
              <h2>❌ Submission Rejected</h2>
              <p>The document has been rejected and the writer has been notified.</p>
            </div>
            
            <div class="submission-details">
              <div class="detail-row">
                <span class="detail-label">Title:</span>
                <span class="detail-value">${updatedSubmission.title}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Submission ID:</span>
                <span class="detail-value">${updatedSubmission.id}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">REJECTED</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Rejected at:</span>
                <span class="detail-value">${new Date().toLocaleString()}</span>
              </div>
            </div>
            
            <p style="color: #6c757d; text-align: center; margin: 0;">
              ✉️ A rejection notification has been sent to the writer.
            </p>
          </div>
          <div class="footer">
            This action was completed successfully. You can close this window.
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
        <h2 style="color: #e74c3c;">❌ Server Error</h2>
        <p>Failed to process the rejection request.</p>
      </body></html>
    `);
  }
});

app.post(
  "/api/upload",
  authenticateToken,
  authenticateWriter,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const filePath = req.file.path;
      const fileExtension = path
        .extname(req.file.originalname)
        .toLowerCase()
        .slice(1);

      const parsedData = await parseDocument(filePath, fileExtension);

      fs.unlinkSync(filePath);

      const cleanPreview = parsedData.content
        .replace(/#{1,6}\s+/g, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`{3}[\s\S]*?`{3}/g, "[code block]")
        .replace(/`(.+?)`/g, "$1")
        .replace(/^\s*[-*+]\s+/gm, "")
        .replace(/\n+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();

      const contentPreview =
        cleanPreview.length > 300
          ? cleanPreview.substring(0, 300) + "..."
          : cleanPreview;

      res.json({
        success: true,
        message: "File uploaded and parsed successfully",
        data: {
          title: parsedData.title,
          preview: contentPreview,
          statistics: {
            contentLength: parsedData.content.length,
            wordCount: parsedData.content
              .split(/\s+/)
              .filter((w) => w.length > 0).length,
            paragraphs: parsedData.content
              .split(/\n\n/)
              .filter((p) => p.trim().length > 0).length,
          },
          hasImage: !!parsedData.imageReference,
          imageReference: parsedData.imageReference,
          originalFilename: req.file.originalname,
          contentLines: parsedData.content.split("\n").slice(0, 10),
          content: parsedData.content,
        },
      });
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload and parse file",
      });
    }
  },
);

app.post(
  "/api/submit",
  authenticateToken,
  authenticateWriter,
  async (req: Request, res: Response) => {
    try {
      const { title, content, imageReference, embeddedImages } = req.body;

      if (!title || !content) {
        return res
          .status(400)
          .json({ error: "Title and content are required" });
      }

      const writerEmail = req.user?.email;

      const submission = workflow.createSubmission(
        title,
        content,
        imageReference,
        embeddedImages,
        writerEmail,
      );

      // Send email asynchronously (fire-and-forget) to avoid blocking the response
      const managerEmail = process.env.MANAGER_EMAIL;
      if (managerEmail) {
        const approveToken = generateEmailToken(submission.id, "approve");
        const rejectToken = generateEmailToken(submission.id, "reject");

        // Don't await - send email in background
        emailService.sendApprovalEmailWithTokens(
          submission,
          managerEmail,
          approveToken,
          rejectToken,
        ).catch((emailError) => {
          console.error("Failed to send approval email:", emailError);
          // Email failure doesn't affect submission success
        });
      }

      // Respond immediately without waiting for email
      res.status(201).json({
        success: true,
        message: "Submission created successfully",
        data: submission,
      });
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to create submission",
      });
    }
  },
);

app.get(
  "/api/submissions/pending",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userEmail = req.user?.email;
      const userRole = req.user?.role;

      let pendingSubmissions = workflow.getPendingSubmissions();

      if (userRole === "writer") {
        pendingSubmissions = pendingSubmissions.filter(
          (sub) => sub.writerEmail === userEmail,
        );
      }

      res.json({
        success: true,
        count: pendingSubmissions.length,
        data: pendingSubmissions,
      });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch pending submissions",
      });
    }
  },
);

app.get(
  "/api/submissions",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const userEmail = req.user?.email;
      const userRole = req.user?.role;

      let submissions;
      if (status) {
        if (
          status !== "pending" &&
          status !== "approved" &&
          status !== "rejected"
        ) {
          return res.status(400).json({
            error: "Invalid status. Must be: pending, approved, or rejected",
          });
        }
        if (status === "pending") {
          submissions = workflow.getPendingSubmissions();
        } else if (status === "approved") {
          submissions = workflow.getApprovedSubmissions();
        } else {
          submissions = workflow.getRejectedSubmissions();
        }
      } else {
        submissions = workflow.getAllSubmissions();
      }

      if (userRole === "writer") {
        submissions = submissions.filter(
          (sub) => sub.writerEmail === userEmail,
        );
      }

      const counts =
        userRole === "writer"
          ? {
              total: submissions.length,
              pending: submissions.filter((s) => s.status === "pending").length,
              approved: submissions.filter((s) => s.status === "approved")
                .length,
              rejected: submissions.filter((s) => s.status === "rejected")
                .length,
            }
          : workflow.getSubmissionCounts();

      res.json({
        success: true,
        count: submissions.length,
        counts: counts,
        data: submissions,
      });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch submissions",
      });
    }
  },
);

app.get(
  "/api/submissions/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const userEmail = req.user?.email;
      const userRole = req.user?.role;

      const submission = workflow.getSubmission(id);

      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      if (userRole === "writer" && submission.writerEmail !== userEmail) {
        return res
          .status(403)
          .json({
            error: "Access denied. You can only view your own submissions.",
          });
      }

      res.json({
        success: true,
        data: submission,
      });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to fetch submission",
      });
    }
  },
);

app.get(
  "/api/approve",
  authenticateToken,
  authenticateManager,
  async (req: Request, res: Response) => {
    try {
      const postId = req.query.post_id as string;

      if (!postId) {
        return res
          .status(400)
          .json({ error: "post_id query parameter is required" });
      }

      const submission = workflow.getSubmission(postId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const updatedSubmission = workflow.approveSubmission(postId);

      // Send confirmation email asynchronously
      if (process.env.FROM_EMAIL) {
        emailService.sendApprovalConfirmationEmail(
          updatedSubmission,
          process.env.FROM_EMAIL,
        ).catch((emailError) => {
          console.error("Failed to send approval confirmation email:", emailError);
        });
      }

      res.json({
        success: true,
        message: "Submission approved successfully",
        data: updatedSubmission,
      });
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to approve submission",
      });
    }
  },
);

app.get(
  "/api/reject",
  authenticateToken,
  authenticateManager,
  async (req: Request, res: Response) => {
    try {
      const postId = req.query.post_id as string;

      if (!postId) {
        return res
          .status(400)
          .json({ error: "post_id query parameter is required" });
      }

      const submission = workflow.getSubmission(postId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const updatedSubmission = workflow.rejectSubmission(postId);

      // Send rejection email asynchronously
      if (process.env.FROM_EMAIL) {
        emailService.sendRejectionEmail(
          updatedSubmission,
          process.env.FROM_EMAIL,
        ).catch((emailError) => {
          console.error("Failed to send rejection email:", emailError);
        });
      }

      res.json({
        success: true,
        message: "Submission rejected successfully",
        data: updatedSubmission,
      });
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to reject submission",
      });
    }
  },
);

app.delete(
  "/api/submissions/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const userEmail = req.user?.email;
      const userRole = req.user?.role;

      const submission = workflow.getSubmission(id);

      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      if (userRole === "writer" && submission.writerEmail !== userEmail) {
        return res
          .status(403)
          .json({
            error: "Access denied. You can only delete your own submissions.",
          });
      }

      const deleted = workflow.deleteSubmission(id);

      if (deleted) {
        res.json({
          success: true,
          message: "Submission deleted successfully",
        });
      } else {
        res.status(404).json({ error: "Submission not found" });
      }
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete submission",
      });
    }
  },
);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File too large. Maximum size is 10MB" });
    }
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({
    error: err.message || "Internal server error",
  });
});

// Only run the server in local development (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, async () => {
    console.log(`Server running on ${BASE_URL}`);
    try {
      await emailService.verifyConnection();
      console.log('Email service connected');
    } catch (error) {
      console.error('Email service connection failed:', error);
    }
  });

  const gracefulShutdown = async () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
    });

    try {
      await emailService.close();
    } catch (error) {
      console.error('Error closing email service:', error);
    }

    process.exit(0);
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}

export default app;
