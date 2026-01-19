import { WorkflowManager } from "../src/modules/workflow/workflow";
import { Storage } from "../src/modules/storage/storage";
import { SubmissionStatus } from "../src/types";
import fs from "fs";
import path from "path";

describe("Workflow Module", () => {
  let workflowManager: WorkflowManager;
  let storage: Storage;
  let testDataFile: string;

  beforeEach(() => {
    storage = new Storage();
    workflowManager = new WorkflowManager(storage);
    testDataFile = storage.getDataFilePath();

    storage.clearAll();
  });

  afterAll(() => {
    const dataDir = path.dirname(testDataFile);
    if (fs.existsSync(testDataFile)) {
      fs.unlinkSync(testDataFile);
    }
    if (fs.existsSync(dataDir)) {
      fs.rmdirSync(dataDir);
    }
  });

  describe("Submission Creation", () => {
    test("should create submission with pending status", () => {
      const submission = workflowManager.createSubmission(
        "Test Article",
        "This is test content",
      );

      expect(submission.id).toBeDefined();
      expect(submission.title).toBe("Test Article");
      expect(submission.content).toBe("This is test content");
      expect(submission.status).toBe(SubmissionStatus.Pending);
      expect(submission.createdAt).toBeDefined();
      expect(submission.updatedAt).toBeDefined();
    });

    test("should create submission with optional fields", () => {
      const submission = workflowManager.createSubmission(
        "Article with Image",
        "Content here",
        "https://example.com/image.jpg",
        undefined, // embeddedImages
        "writer@example.com",
      );

      expect(submission.imageReference).toBe("https://example.com/image.jpg");
      expect(submission.writerEmail).toBe("writer@example.com");
      expect(submission.status).toBe(SubmissionStatus.Pending);
    });

    test("should create submission with embedded images", () => {
      const embeddedImages = [
        "data:image/png;base64,iVBORw0KG...",
        "data:image/jpeg;base64,/9j/4AA...",
      ];
      const submission = workflowManager.createSubmission(
        "Article with Embedded Images",
        "Content here",
        undefined,
        embeddedImages,
        "writer@example.com",
      );

      expect(submission.embeddedImages).toBeDefined();
      expect(submission.embeddedImages?.length).toBe(2);
      expect(submission.embeddedImages?.[0]).toContain("data:image/png");
    });

    test("should trim whitespace from title and content", () => {
      const submission = workflowManager.createSubmission(
        "  Title with spaces  ",
        "  Content with spaces  ",
      );

      expect(submission.title).toBe("Title with spaces");
      expect(submission.content).toBe("Content with spaces");
    });

    test("should throw error for empty title", () => {
      expect(() =>
        workflowManager.createSubmission("", "Content here"),
      ).toThrow("Title is required");
    });

    test("should throw error for whitespace-only title", () => {
      expect(() =>
        workflowManager.createSubmission("   ", "Content here"),
      ).toThrow("Title is required");
    });

    test("should throw error for empty content", () => {
      expect(() => workflowManager.createSubmission("Title", "")).toThrow(
        "Content is required",
      );
    });

    test("should throw error for whitespace-only content", () => {
      expect(() => workflowManager.createSubmission("Title", "   ")).toThrow(
        "Content is required",
      );
    });

    test("should generate unique IDs for multiple submissions", () => {
      const submission1 = workflowManager.createSubmission(
        "Title 1",
        "Content 1",
      );
      const submission2 = workflowManager.createSubmission(
        "Title 2",
        "Content 2",
      );

      expect(submission1.id).not.toBe(submission2.id);
    });
  });

  describe("State Transitions", () => {
    test("should transition from pending to approved", () => {
      const submission = workflowManager.createSubmission("Test", "Content");

      const updated = workflowManager.updateSubmissionStatus(
        submission.id,
        SubmissionStatus.Approved,
      );

      expect(updated.status).toBe(SubmissionStatus.Approved);
      expect(updated.updatedAt).not.toBe(submission.updatedAt);
    });

    test("should transition from pending to rejected", () => {
      const submission = workflowManager.createSubmission("Test", "Content");

      const updated = workflowManager.updateSubmissionStatus(
        submission.id,
        SubmissionStatus.Rejected,
      );

      expect(updated.status).toBe(SubmissionStatus.Rejected);
    });

    test("should allow transition from approved to rejected", () => {
      const submission = workflowManager.createSubmission("Test", "Content");

      workflowManager.updateSubmissionStatus(
        submission.id,
        SubmissionStatus.Approved,
      );

      const updated = workflowManager.updateSubmissionStatus(
        submission.id,
        SubmissionStatus.Rejected,
      );

      expect(updated.status).toBe(SubmissionStatus.Rejected);
    });

    test("should allow transition from rejected to approved", () => {
      const submission = workflowManager.createSubmission("Test", "Content");

      workflowManager.updateSubmissionStatus(
        submission.id,
        SubmissionStatus.Rejected,
      );

      const updated = workflowManager.updateSubmissionStatus(
        submission.id,
        SubmissionStatus.Approved,
      );

      expect(updated.status).toBe(SubmissionStatus.Approved);
    });

    test("should throw error when updating non-existent submission", () => {
      expect(() =>
        workflowManager.updateSubmissionStatus(
          "invalid-id",
          SubmissionStatus.Approved,
        ),
      ).toThrow("not found");
    });

    test("should update updatedAt timestamp on status change", async () => {
      const submission = workflowManager.createSubmission("Test", "Content");
      const originalUpdatedAt = submission.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 50));

      const updated = workflowManager.updateSubmissionStatus(
        submission.id,
        SubmissionStatus.Approved,
      );

      expect(updated.updatedAt).not.toBe(originalUpdatedAt);
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime(),
      );
    });
  });

  describe("Convenience Methods", () => {
    test("should approve submission using convenience method", () => {
      const submission = workflowManager.createSubmission("Test", "Content");

      const approved = workflowManager.approveSubmission(submission.id);

      expect(approved.status).toBe(SubmissionStatus.Approved);
    });

    test("should reject submission using convenience method", () => {
      const submission = workflowManager.createSubmission("Test", "Content");

      const rejected = workflowManager.rejectSubmission(submission.id);

      expect(rejected.status).toBe(SubmissionStatus.Rejected);
    });
  });

  describe("Query Operations", () => {
    beforeEach(() => {
      workflowManager.createSubmission("Pending 1", "Content 1");
      workflowManager.createSubmission("Pending 2", "Content 2");

      const approved = workflowManager.createSubmission("Approved", "Content");
      workflowManager.updateSubmissionStatus(
        approved.id,
        SubmissionStatus.Approved,
      );

      const rejected = workflowManager.createSubmission("Rejected", "Content");
      workflowManager.updateSubmissionStatus(
        rejected.id,
        SubmissionStatus.Rejected,
      );
    });

    test("should get all pending submissions", () => {
      const pending = workflowManager.getPendingSubmissions();

      expect(pending.length).toBe(2);
      expect(pending.every((s) => s.status === SubmissionStatus.Pending)).toBe(
        true,
      );
    });

    test("should get all submissions", () => {
      const all = workflowManager.getAllSubmissions();

      expect(all.length).toBe(4);
    });

    test("should get approved submissions", () => {
      const approved = workflowManager.getApprovedSubmissions();

      expect(approved.length).toBe(1);
      expect(approved[0].title).toBe("Approved");
    });

    test("should get rejected submissions", () => {
      const rejected = workflowManager.getRejectedSubmissions();

      expect(rejected.length).toBe(1);
      expect(rejected[0].title).toBe("Rejected");
    });

    test("should get submission by ID", () => {
      const submission = workflowManager.createSubmission("Find Me", "Content");

      const found = workflowManager.getSubmission(submission.id);

      expect(found).not.toBeNull();
      expect(found?.title).toBe("Find Me");
    });

    test("should return null for non-existent ID", () => {
      const found = workflowManager.getSubmission("invalid-id");
      expect(found).toBeNull();
    });

    test("should get submission counts", () => {
      const counts = workflowManager.getSubmissionCounts();

      expect(counts.pending).toBe(2);
      expect(counts.approved).toBe(1);
      expect(counts.rejected).toBe(1);
      expect(counts.total).toBe(4);
    });
  });

  describe("Delete Operations", () => {
    test("should delete submission", () => {
      const submission = workflowManager.createSubmission(
        "To Delete",
        "Content",
      );

      const deleted = workflowManager.deleteSubmission(submission.id);

      expect(deleted).toBe(true);
      expect(workflowManager.getSubmission(submission.id)).toBeNull();
    });

    test("should return false when deleting non-existent submission", () => {
      const deleted = workflowManager.deleteSubmission("invalid-id");
      expect(deleted).toBe(false);
    });
  });

  describe("Integration with Storage", () => {
    test("should persist submissions across workflow instances", () => {
      const submission = workflowManager.createSubmission(
        "Persistent",
        "Content",
      );

      const newWorkflow = new WorkflowManager(storage);
      const retrieved = newWorkflow.getSubmission(submission.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe("Persistent");
    });

    test("should maintain status after retrieval", () => {
      const submission = workflowManager.createSubmission("Test", "Content");
      workflowManager.approveSubmission(submission.id);

      const retrieved = workflowManager.getSubmission(submission.id);
      expect(retrieved?.status).toBe(SubmissionStatus.Approved);
    });
  });
});
