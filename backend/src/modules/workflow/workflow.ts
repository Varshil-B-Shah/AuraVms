import { Submission, SubmissionStatus } from "../../types";
import { Storage } from "../storage/storage";

export class WorkflowManager {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  createSubmission(
    title: string,
    content: string,
    imageReference?: string,
    embeddedImages?: string[],
    writerEmail?: string,
  ): Submission {
    if (!title || !title.trim()) {
      throw new Error("Title is required and cannot be empty");
    }

    if (!content || !content.trim()) {
      throw new Error("Content is required and cannot be empty");
    }

    const id = Date.now().toString();
    const now = new Date().toISOString();

    const submission: Submission = {
      id,
      title: title.trim(),
      content: content.trim(),
      imageReference,
      embeddedImages,
      writerEmail,
      status: SubmissionStatus.Pending,
      createdAt: now,
      updatedAt: now,
    };

    this.storage.saveSubmission(submission);

    return submission;
  }

  updateSubmissionStatus(
    submissionId: string,
    newStatus: SubmissionStatus,
  ): Submission {
    const submission = this.storage.getSubmission(submissionId);

    if (!submission) {
      throw new Error(`Submission with ID ${submissionId} not found`);
    }

    this.validateStatusTransition(submission.status, newStatus);

    const updatedSubmission: Submission = {
      ...submission,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    this.storage.updateSubmission(updatedSubmission);

    return updatedSubmission;
  }

  private validateStatusTransition(
    currentStatus: SubmissionStatus,
    newStatus: SubmissionStatus,
  ): void {
    if (currentStatus === newStatus) {
      return;
    }
  }

  getPendingSubmissions(): Submission[] {
    const pending = this.storage.getSubmissionsByStatus(
      SubmissionStatus.Pending,
    );
    return pending;
  }

  getAllSubmissions(): Submission[] {
    const all = this.storage.getAllSubmissions();
    return all;
  }

  getApprovedSubmissions(): Submission[] {
    return this.storage.getSubmissionsByStatus(SubmissionStatus.Approved);
  }

  getRejectedSubmissions(): Submission[] {
    return this.storage.getSubmissionsByStatus(SubmissionStatus.Rejected);
  }

  getSubmission(id: string): Submission | null {
    return this.storage.getSubmission(id);
  }

  getSubmissionCounts(): {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  } {
    return this.storage.getSubmissionCounts();
  }

  approveSubmission(submissionId: string): Submission {
    return this.updateSubmissionStatus(submissionId, SubmissionStatus.Approved);
  }

  rejectSubmission(submissionId: string): Submission {
    return this.updateSubmissionStatus(submissionId, SubmissionStatus.Rejected);
  }

  deleteSubmission(submissionId: string): boolean {
    const deleted = this.storage.deleteSubmission(submissionId);
    return deleted;
  }
}
