"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ParsedDocument } from "@/types";

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<ParsedDocument | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase();
    const validExtensions = [".txt", ".md", ".docx"];
    const hasValidExtension = validExtensions.some((ext) =>
      fileName.endsWith(ext),
    );

    if (!hasValidExtension) {
      toast.error("Invalid file type. Please upload .txt, .md, or .docx files");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    setPreview(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const parsedData: ParsedDocument = {
        title: response.data.data.title,
        content: response.data.data.content,
        imageReference: response.data.data.imageReference,
      };
      setPreview(parsedData);
      toast.success("File uploaded and parsed successfully!");
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to upload file");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!preview) {
      toast.error("Please upload and preview your document first");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/submit", {
        title: preview.title,
        content: preview.content,
        imageReference: preview.imageReference,
      });

      toast.success(
        "Document submitted successfully! Manager will be notified.",
      );
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to submit document");
      console.error("Submit error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-xl font-bold">Upload Document</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {!preview ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Upload Your Document</CardTitle>
                <CardDescription>
                  Supported formats: .txt, .md, .docx (max 10MB)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`
                    relative border-2 border-dashed rounded-lg p-12 transition-all
                    ${
                      dragActive
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                    }
                  `}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <div
                      className={`
                      rounded-full p-4 mb-4 transition-colors
                      ${dragActive ? "bg-primary/20" : "bg-accent"}
                    `}
                    >
                      <Upload
                        className={`h-8 w-8 ${dragActive ? "text-primary" : "text-muted-foreground"}`}
                      />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {dragActive
                        ? "Drop your file here"
                        : "Drag and drop your file"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      or click to browse
                    </p>
                    <Input
                      type="file"
                      accept=".txt,.md,.docx"
                      onChange={handleFileInputChange}
                      className="hidden"
                      id="file-input"
                    />
                    <Label
                      htmlFor="file-input"
                      className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                      Browse Files
                    </Label>
                  </div>
                </div>

                <AnimatePresence>
                  {file && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-accent/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFile}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full gap-2"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Parsing Document...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      Upload & Preview
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Document Preview</CardTitle>
                    <CardDescription>
                      Review your document before submitting
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={clearFile}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">
                    Title
                  </Label>
                  <h2 className="text-2xl font-bold mt-2">{preview.title}</h2>
                </div>

                <Separator />

                {preview.imageReference && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Image Reference
                    </Label>
                    <div className="mt-2 rounded-lg overflow-hidden border border-border">
                      <Image
                        src={preview.imageReference}
                        alt="Document image"
                        width={800}
                        height={600}
                        className="w-full h-auto"
                      />
                    </div>
                  </motion.div>
                )}

                {preview.imageReference && <Separator />}

                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">
                    Content
                  </Label>
                  <div className="mt-2 prose prose-sm max-w-none">
                    <p className="text-foreground whitespace-pre-wrap">
                      {preview.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-linear-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      Ready to Submit?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your document will be sent to the manager for review
                    </p>
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    size="lg"
                    className="gap-2 hover:scale-105 transition-transform"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Submit Document
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
