import { Storage } from "../src/modules/storage/storage";
import { Submission, SubmissionStatus } from "../src/types";
import fs from "fs";
import path from "path";

describe("Storage Module", () => {
  let storage: Storage;
  let testDataFile: string;

  beforeEach(() => {
    storage = new Storage();
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

  describe("Initialization", () => {
    test("should create data directory and file on initialization", () => {
      const dataDir = path.dirname(testDataFile);
      expect(fs.existsSync(dataDir)).toBe(true);
      expect(fs.existsSync(testDataFile)).toBe(true);
    });

    test("should initialize with empty array", () => {
      const submissions = storage.getAllSubmissions();
      expect(submissions).toEqual([]);
      expect(submissions.length).toBe(0);
    });
  });

  describe("Create Operations", () => {
    test("should save a new submission", () => {
      const submission: Submission = {
        id: "123",
        title: "Test Article",
        content: "Test content here",
        status: SubmissionStatus.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      storage.saveSubmission(submission);
      const retrieved = storage.getSubmission("123");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe("Test Article");
      expect(retrieved?.status).toBe(SubmissionStatus.Pending);
    });

    test("should save submission with optional fields", () => {
      const submission: Submission = {
        id: "456",
        title: "Article with Image",
        content: "Content here",
        imageReference: "https://example.com/image.jpg",
        writerEmail: "writer@example.com",
        status: SubmissionStatus.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      storage.saveSubmission(submission);
      const retrieved = storage.getSubmission("456");

      expect(retrieved?.imageReference).toBe("https://example.com/image.jpg");
      expect(retrieved?.writerEmail).toBe("writer@example.com");
    });

    test("should save multiple submissions", () => {
      const submission1: Submission = {
        id: "1",
        title: "First",
        content: "Content 1",
        status: SubmissionStatus.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const submission2: Submission = {
        id: "2",
        title: "Second",
        content: "Content 2",
        status: SubmissionStatus.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      storage.saveSubmission(submission1);
      storage.saveSubmission(submission2);

      const all = storage.getAllSubmissions();
      expect(all.length).toBe(2);
    });
  });

  describe("Read Operations", () => {
    beforeEach(() => {
      const submission1: Submission = {
        id: "100",
        title: "Article 1",
        content: "Content 1",
        status: SubmissionStatus.Pending,
        createdAt: "2026-01-18T10:00:00.000Z",
        updatedAt: "2026-01-18T10:00:00.000Z",
      };

      const submission2: Submission = {
        id: "200",
        title: "Article 2",
        content: "Content 2",
        status: SubmissionStatus.Approved,
        createdAt: "2026-01-18T11:00:00.000Z",
        updatedAt: "2026-01-18T11:00:00.000Z",
      };

      storage.saveSubmission(submission1);
      storage.saveSubmission(submission2);
    });

    test("should retrieve submission by ID", () => {
      const retrieved = storage.getSubmission("100");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe("100");
      expect(retrieved?.title).toBe("Article 1");
    });

    test("should return null for non-existent ID", () => {
      const retrieved = storage.getSubmission("999");
      expect(retrieved).toBeNull();
    });

    test("should get all submissions", () => {
      const all = storage.getAllSubmissions();

      expect(all.length).toBe(2);
      expect(all[0].id).toBe("200"); // Newest first
      expect(all[1].id).toBe("100");
    });

    test("should get submissions by status", () => {
      const pending = storage.getSubmissionsByStatus(SubmissionStatus.Pending);
      const approved = storage.getSubmissionsByStatus(
        SubmissionStatus.Approved,
      );

      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe("100");

      expect(approved.length).toBe(1);
      expect(approved[0].id).toBe("200");
    });

    test("should get submission counts", () => {
      const counts = storage.getSubmissionCounts();

      expect(counts.total).toBe(2);
      expect(counts.pending).toBe(1);
      expect(counts.approved).toBe(1);
      expect(counts.rejected).toBe(0);
    });
  });

  describe("Update Operations", () => {
    test("should update existing submission", () => {
      const submission: Submission = {
        id: "300",
        title: "Original Title",
        content: "Original content",
        status: SubmissionStatus.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      storage.saveSubmission(submission);

      submission.status = SubmissionStatus.Approved;
      submission.updatedAt = new Date().toISOString();
      storage.updateSubmission(submission);

      const retrieved = storage.getSubmission("300");
      expect(retrieved?.status).toBe(SubmissionStatus.Approved);
    });

    test("should throw error when updating non-existent submission", () => {
      const submission: Submission = {
        id: "999",
        title: "Non-existent",
        content: "Content",
        status: SubmissionStatus.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(() => storage.updateSubmission(submission)).toThrow("not found");
    });
  });

  describe("Delete Operations", () => {
    test("should delete submission by ID", () => {
      const submission: Submission = {
        id: "400",
        title: "To Delete",
        content: "Content",
        status: SubmissionStatus.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      storage.saveSubmission(submission);
      expect(storage.getSubmission("400")).not.toBeNull();

      const deleted = storage.deleteSubmission("400");
      expect(deleted).toBe(true);
      expect(storage.getSubmission("400")).toBeNull();
    });

    test("should return false when deleting non-existent submission", () => {
      const deleted = storage.deleteSubmission("999");
      expect(deleted).toBe(false);
    });

    test("should clear all submissions", () => {
      const submission1: Submission = {
        id: "500",
        title: "Article 1",
        content: "Content",
        status: SubmissionStatus.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const submission2: Submission = {
        id: "600",
        title: "Article 2",
        content: "Content",
        status: SubmissionStatus.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      storage.saveSubmission(submission1);
      storage.saveSubmission(submission2);

      const count = storage.clearAll();
      expect(count).toBe(2);
      expect(storage.getAllSubmissions().length).toBe(0);
    });
  });

  describe("Data Persistence", () => {
    test("should persist data across storage instances", () => {
      const submission: Submission = {
        id: "700",
        title: "Persistent Article",
        content: "This should persist",
        status: SubmissionStatus.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      storage.saveSubmission(submission);

      const newStorage = new Storage();
      const retrieved = newStorage.getSubmission("700");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe("Persistent Article");
    });
  });
});
