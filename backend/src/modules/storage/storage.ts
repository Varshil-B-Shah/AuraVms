import fs from "fs";
import path from "path";
import { Submission, SubmissionStatus } from "../../types";

const DATA_FILE = path.join(process.cwd(), "data", "submissions.json");

export class Storage {
  constructor() {
    this.ensureDataFile();
  }

  private ensureDataFile(): void {
    const dir = path.dirname(DATA_FILE);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    }
  }

  private readData(): Submission[] {
    try {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(data);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed as Submission[];
    } catch (error) {
      return [];
    }
  }

  private writeData(data: Submission[]): void {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      throw new Error("Failed to save submission to file");
    }
  }

  saveSubmission(submission: Submission): void {
    const submissions = this.readData();
    submissions.push(submission);
    this.writeData(submissions);
  }

  updateSubmission(submission: Submission): void {
    const submissions = this.readData();
    const index = submissions.findIndex((s) => s.id === submission.id);

    if (index === -1) {
      throw new Error(`Submission with ID ${submission.id} not found`);
    }

    submissions[index] = submission;
    this.writeData(submissions);
  }

  getSubmission(id: string): Submission | null {
    const submissions = this.readData();
    const submission = submissions.find((s) => s.id === id);

    if (submission) {
      return submission;
    }

    return null;
  }

  getAllSubmissions(): Submission[] {
    const submissions = this.readData();

    return submissions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  deleteSubmission(id: string): boolean {
    const submissions = this.readData();
    const initialLength = submissions.length;

    const filtered = submissions.filter((s) => s.id !== id);

    if (filtered.length < initialLength) {
      this.writeData(filtered);
      return true;
    }

    return false;
  }

  getSubmissionsByStatus(status: SubmissionStatus): Submission[] {
    const submissions = this.readData();

    return submissions
      .filter((s) => s.status === status)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  getSubmissionCounts(): {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  } {
    const submissions = this.readData();

    return {
      pending: submissions.filter((s) => s.status === "pending").length,
      approved: submissions.filter((s) => s.status === "approved").length,
      rejected: submissions.filter((s) => s.status === "rejected").length,
      total: submissions.length,
    };
  }

  clearAll(): number {
    const submissions = this.readData();
    const count = submissions.length;
    this.writeData([]);
    return count;
  }

  getDataFilePath(): string {
    return DATA_FILE;
  }
}
