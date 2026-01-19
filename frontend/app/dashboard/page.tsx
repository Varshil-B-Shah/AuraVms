"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  LogOut,
  Shield,
  RefreshCw,
  Loader2,
  Upload,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  StatCard,
  SubmissionCard,
  EmptyState,
} from "@/components/dashboard/DashboardComponents";

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

export default function DashboardPage() {
  const router = useRouter();
  const { user, isInitialized, logout } = useAuthStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);

  const isManager = user?.role === "manager";
  const isWriter = user?.role === "writer";

  const fetchSubmissions = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const response = await api.get("/submissions");

      if (response.data.success) {
        setSubmissions(response.data.data);
        setLastRefresh(new Date());
      }
    } catch {
      if (!silent) {
        toast.error("Failed to fetch submissions");
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isManager || !autoRefresh) return;

    const interval = setInterval(() => {
      fetchSubmissions(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, isManager]);

  useEffect(() => {
    if (!isInitialized) return;

    if (!user) {
      router.push("/login");
      return;
    }

    fetchSubmissions();
  }, [isInitialized, user, router]);

  const handleApprove = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));

    try {
      const response = await api.get(`/approve?post_id=${id}`);

      if (response.data.success) {
        toast.success("Submission approved! Email sent to writer.");
        fetchSubmissions(true);
      }
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to approve submission");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleReject = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));

    try {
      const response = await api.get(`/reject?post_id=${id}`);

      if (response.data.success) {
        toast.success("Submission rejected. Email sent to writer.");
        fetchSubmissions(true);
      }
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to reject submission");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSubmissionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!submissionToDelete) return;

    setProcessingIds((prev) => new Set(prev).add(submissionToDelete));

    try {
      const response = await api.delete(`/submissions/${submissionToDelete}`);

      if (response.data.success) {
        toast.success("Submission deleted successfully.");
        fetchSubmissions(true);
      }
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to delete submission");
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(submissionToDelete);
        return newSet;
      });
      setDeleteDialogOpen(false);
      setSubmissionToDelete(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;

    if (activeTab !== "all") {
      filtered = filtered.filter((sub) => sub.status === activeTab);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.title.toLowerCase().includes(query) ||
          sub.content.toLowerCase().includes(query) ||
          sub.writerEmail?.toLowerCase().includes(query) ||
          sub.id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [submissions, activeTab, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: submissions.length,
      pending: submissions.filter((s) => s.status === SubmissionStatus.Pending).length,
      approved: submissions.filter((s) => s.status === SubmissionStatus.Approved).length,
      rejected: submissions.filter((s) => s.status === SubmissionStatus.Rejected).length,
    };
  }, [submissions]);

  const statCards = [
    {
      title: "Total Submissions",
      value: stats.total,
      icon: FileText,
      gradient: "bg-linear-to-br from-primary/10 to-primary/5",
      border: "border-primary/20",
      iconColor: "text-primary",
      delay: 0.1,
    },
    {
      title: isManager ? "Pending Review" : "Pending",
      value: stats.pending,
      icon: Clock,
      gradient: "bg-linear-to-br from-yellow-500/10 to-yellow-500/5",
      border: "border-yellow-500/20",
      iconColor: "text-yellow-600",
      delay: 0.2,
    },
    {
      title: "Approved",
      value: stats.approved,
      icon: CheckCircle,
      gradient: "bg-linear-to-br from-green-500/10 to-green-500/5",
      border: "border-green-500/20",
      iconColor: "text-green-600",
      delay: 0.3,
    },
    {
      title: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      gradient: "bg-linear-to-br from-red-500/10 to-red-500/5",
      border: "border-red-500/20",
      iconColor: "text-red-600",
      delay: 0.4,
    },
  ];

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3 sm:h-16 sm:py-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                {isManager ? (
                  <Shield className="w-6 h-6 text-primary-foreground" />
                ) : (
                  <User className="w-6 h-6 text-primary-foreground" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {isManager ? "Manager" : "Writer"} Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto sm:space-x-4">
              {isWriter && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => router.push("/upload")}
                  className="flex-1 sm:flex-none"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="hidden xs:inline">Upload</span>
                </Button>
              )}

              {isManager && (
                <>
                  <Button
                    variant={autoRefresh ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className="flex items-center gap-2 flex-1 sm:flex-none"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`}
                    />
                    {autoRefresh ? "Auto" : "Manual"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchSubmissions()}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex-1 sm:flex-none"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </div>

        {isManager && (
          <div className="mb-4 text-sm text-muted-foreground text-right">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        )}

        <Card className="p-4 sm:p-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) =>
              setActiveTab(v as "all" | "pending" | "approved" | "rejected")
            }
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex">
                <TabsTrigger
                  value="all"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">All </span>({stats.total})
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Pending </span>({stats.pending})
                </TabsTrigger>
                <TabsTrigger
                  value="approved"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Approved </span>({stats.approved})
                </TabsTrigger>
                <TabsTrigger
                  value="rejected"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Rejected </span>({stats.rejected})
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search submissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Separator className="mb-6" />

            <TabsContent value={activeTab} className="space-y-4 mt-0">
              {filteredSubmissions.length === 0 ? (
                <EmptyState searchQuery={searchQuery} />
              ) : (
                filteredSubmissions.map((submission, index) => (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    index={index}
                    isManager={isManager}
                    isWriter={isWriter}
                    processingIds={processingIds}
                    onCardClick={(id) => router.push(`/submissions/${id}`)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onDelete={handleDeleteClick}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </main>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this submission? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={
                submissionToDelete ? processingIds.has(submissionToDelete) : false
              }
            >
              {submissionToDelete && processingIds.has(submissionToDelete) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}