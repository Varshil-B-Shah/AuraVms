export enum SubmissionStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}

export interface Submission {
  id: string;
  title: string;
  content: string;
  imageReference?: string;
  embeddedImages?: string[];
  writerEmail?: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedDocument {
  title: string;
  content: string;
  imageReference?: string;
  embeddedImages?: string[];
}

export interface UploadResponse {
  id: string;
  title: string;
  content: string;
  imageReference?: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  title: string;
  contentPreview: string;
  approveLink: string;
  rejectLink: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
