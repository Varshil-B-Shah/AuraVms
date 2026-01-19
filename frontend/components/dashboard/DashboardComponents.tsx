import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";

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

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  border: string;
  iconColor: string;
  delay: number;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  border,
  iconColor,
  delay,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className={`p-6 ${gradient} ${border}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
          </div>
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>
      </Card>
    </motion.div>
  );
}

interface StatusBadgeProps {
  status: SubmissionStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    [SubmissionStatus.Pending]: {
      variant: "secondary" as const,
      icon: Clock,
      label: "Pending",
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

  const { variant, icon: Icon, label } = config[status];
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

interface SubmissionActionsProps {
  submission: Submission;
  isManager: boolean;
  isWriter: boolean;
  processingIds: Set<string>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onView: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export function SubmissionActions({
  submission,
  isManager,
  isWriter,
  processingIds,
  onApprove,
  onReject,
  onView,
  onDelete,
}: SubmissionActionsProps) {
  const isProcessing = processingIds.has(submission.id);

  if (isManager && submission.status === SubmissionStatus.Pending) {
    return (
      <div
        className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onApprove(submission.id);
          }}
          disabled={isProcessing}
          className="whitespace-nowrap flex-1 lg:flex-none"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ThumbsUp className="w-4 h-4 mr-2" />
              Approve
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            onReject(submission.id);
          }}
          disabled={isProcessing}
          className="whitespace-nowrap flex-1 lg:flex-none"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ThumbsDown className="w-4 h-4 mr-2" />
              Reject
            </>
          )}
        </Button>
      </div>
    );
  }

  if (isWriter || (isManager && submission.status !== SubmissionStatus.Pending)) {
    return (
      <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto">
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onView(submission.id);
          }}
          className="flex-1 lg:flex-none"
        >
          <Eye className="w-4 h-4 mr-2" />
          View
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => onDelete(submission.id, e)}
          disabled={isProcessing}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 lg:flex-none"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </>
          )}
        </Button>
      </div>
    );
  }

  return null;
}

interface SubmissionMetadataProps {
  submission: Submission;
  isManager: boolean;
}

export function SubmissionMetadata({ submission, isManager }: SubmissionMetadataProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
      {isManager && (
        <>
          <span>Writer: {submission.writerEmail}</span>
          <span>•</span>
        </>
      )}
      <span>
        Submitted:{" "}
        {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : "N/A"}
      </span>
      {submission.reviewedAt && (
        <>
          <span>•</span>
          <span>Reviewed: {new Date(submission.reviewedAt).toLocaleString()}</span>
        </>
      )}
      {submission.imageReference && (
        <>
          <span>•</span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Has Image
          </span>
        </>
      )}
    </div>
  );
}

interface SubmissionCardProps {
  submission: Submission;
  index: number;
  isManager: boolean;
  isWriter: boolean;
  processingIds: Set<string>;
  onCardClick: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export function SubmissionCard({
  submission,
  index,
  isManager,
  isWriter,
  processingIds,
  onCardClick,
  onApprove,
  onReject,
  onDelete,
}: SubmissionCardProps) {
  return (
    <motion.div
      key={submission.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="p-4 sm:p-6 hover:shadow-lg transition-all duration-200 border-border/50 cursor-pointer"
        onClick={() => onCardClick(submission.id)}
      >
        <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {submission.title}
                </h3>
                <p className="text-sm text-muted-foreground">ID: {submission.id}</p>
              </div>
              <StatusBadge status={submission.status} />
            </div>

            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {submission.content}
            </p>

            <SubmissionMetadata submission={submission} isManager={isManager} />
          </div>

          <SubmissionActions
            submission={submission}
            isManager={isManager}
            isWriter={isWriter}
            processingIds={processingIds}
            onApprove={onApprove}
            onReject={onReject}
            onView={onCardClick}
            onDelete={onDelete}
          />
        </div>
      </Card>
    </motion.div>
  );
}

interface EmptyStateProps {
  searchQuery: string;
}

export function EmptyState({ searchQuery }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No submissions found
      </h3>
      <p className="text-muted-foreground">
        {searchQuery
          ? "Try adjusting your search"
          : "No submissions match this filter"}
      </p>
    </div>
  );
}