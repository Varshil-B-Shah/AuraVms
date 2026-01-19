export enum SubmissionStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected'
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

export interface User {
  email: string;
  role: 'writer' | 'manager';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
