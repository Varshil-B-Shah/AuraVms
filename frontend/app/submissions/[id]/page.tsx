"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Calendar,
  Mail,
  User,
  Image as ImageIcon,
  AlignLeft,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Shield,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { toast } from "sonner";

enum SubmissionStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}

interface Submission {
  id: string;
  title: string;
  content: string;
  imageReference?: string;
  status: SubmissionStatus;
  writerEmail: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

export default function SubmissionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isInitialized } = useAuthStore();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const submissionId = params.id as string;
  const isManager = user?.role === "manager";

  useEffect(() => {
    if (!isInitialized) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const fetchSubmission = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/submissions/${submissionId}`);

        if (response.data.success) {
          setSubmission(response.data.data);
        }
      } catch (error) {
        const err = error as { response?: { data?: { error?: string } } };
        toast.error(
          err.response?.data?.error || "Failed to fetch submission details",
        );
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmission();
  }, [isInitialized, user, router, submissionId]);

  const handleApprove = async () => {
    if (!submission) return;

    setIsProcessing(true);
    try {
      const response = await api.get(`/approve?post_id=${submission.id}`);

      if (response.data.success) {
        toast.success("Submission approved! Email sent to writer.");
        setSubmission({
          ...submission,
          status: SubmissionStatus.Approved,
          reviewedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to approve submission");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!submission) return;

    setIsProcessing(true);
    try {
      const response = await api.get(`/reject?post_id=${submission.id}`);

      if (response.data.success) {
        toast.success("Submission rejected. Email sent to writer.");
        setSubmission({
          ...submission,
          status: SubmissionStatus.Rejected,
          reviewedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to reject submission");
    } finally {
      setIsProcessing(false);
    }
  };

  const getEmailPreview = () => {
    if (!submission) return "";

    const cleanContent = submission.content.replace(/\s+/g, " ").trim();

    return cleanContent.slice(0, 100);
  };

  const getStatusBadge = () => {
    if (!submission) return null;

    const config = {
      [SubmissionStatus.Pending]: {
        variant: "secondary" as const,
        icon: Clock,
        label: "Pending Review",
      },
      [SubmissionStatus.Approved]: {
        variant: "default" as const,
        icon: CheckCircle,
        label: "Approved",
      },
      [SubmissionStatus.Rejected]: {
        variant: "destructive" as const,
        icon: XCircle,
        label: "Rejected",
      },
    };

    const { variant, icon: Icon, label } = config[submission.status];
    return (
      <Badge
        variant={variant}
        className="flex items-center gap-1 text-sm px-3 py-1"
      >
        <Icon className="w-4 h-4" />
        {label}
      </Badge>
    );
  };

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Submission not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              {isManager ? (
                <Shield className="w-5 h-5 text-primary" />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
              <span className="text-sm font-medium text-muted-foreground">
                {isManager ? "Manager" : "Writer"} View
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isManager && submission.status === SubmissionStatus.Pending && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex justify-end gap-4"
          >
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              size="lg"
              className="min-w-32"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ThumbsUp className="w-5 h-5 mr-2" />
                  Approve
                </>
              )}
            </Button>
            <Button
              onClick={handleReject}
              disabled={isProcessing}
              variant="destructive"
              size="lg"
              className="min-w-32"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ThumbsDown className="w-5 h-5 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {submission.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Submission ID: {submission.id}
                </p>
              </div>
              {getStatusBadge()}
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Submitted:{" "}
                  {submission.createdAt
                    ? new Date(submission.createdAt).toLocaleString()
                    : "N/A"}
                </span>
              </div>
              {submission.reviewedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Reviewed: {new Date(submission.reviewedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {isManager && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Writer Information
              </h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{submission.writerEmail}</span>
              </div>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isManager ? 0.3 : 0.2 }}
        >
          <Card className="p-6 mb-6 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Email Preview{" "}
              {isManager ? "(Sent to Manager)" : "(Sent in Notification)"}
            </h2>
            <p className="text-sm text-muted-foreground italic">
              &ldquo;{getEmailPreview()}...&rdquo;
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              This is the 100-character preview that was sent in the
              notification email
            </p>
          </Card>
        </motion.div>

        {submission.imageReference && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: isManager ? 0.4 : 0.3 }}
          >
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                Image Reference
              </h2>
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <Image
                  src={submission.imageReference}
                  alt="Submission attachment"
                  width={800}
                  height={600}
                  className="max-w-full h-auto rounded-lg shadow-md"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Image extracted from the uploaded document
              </p>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isManager ? 0.5 : 0.4 }}
        >
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlignLeft className="w-5 h-5 text-primary" />
              Full Content
            </h2>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {submission.content}
              </p>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
