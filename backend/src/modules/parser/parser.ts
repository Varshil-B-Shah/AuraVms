import fs from "fs";
import path from "path";
import { ParsedDocument } from "../../types";

const IMAGE_REGEX = /^!\[.*?\]\((.*?)\)$/;
const URL_REGEX = /^https?:\/\//;

export async function parseDocument(
  filePath: string,
  fileType: string,
): Promise<ParsedDocument> {
  if (!["txt", "md", "docx"].includes(fileType)) {
    throw new Error(
      `Unsupported file type: .${fileType}. Supported formats: .txt, .md, .docx`,
    );
  }

  let rawContent: string;
  let embeddedImages: string[] = [];

  try {
    if (fileType === "txt" || fileType === "md") {
      rawContent = fs.readFileSync(filePath, "utf-8");
    } else if (fileType === "docx") {
      const mammoth = await import("mammoth");

      const htmlResult = await mammoth.convertToHtml({ path: filePath });

      const imgRegex = /<img[^>]+src="([^"]+)"/g;
      let match;
      while ((match = imgRegex.exec(htmlResult.value)) !== null) {
        embeddedImages.push(match[1]);
      }

      const textResult = await mammoth.extractRawText({ path: filePath });
      rawContent = textResult.value;
    } else {
      throw new Error(`Unsupported file type: .${fileType}`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read file: ${errorMessage}`);
  }

  const lines = rawContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error(
      "Document is empty. Please provide a document with at least a title and content.",
    );
  }

  const firstLine = lines[0];
  let imageReference: string | undefined;
  let titleIndex = 0;
  let contentStartIndex = 1;

  const imageMatch = firstLine.match(IMAGE_REGEX);
  if (imageMatch) {
    imageReference = imageMatch[1];
    titleIndex = 1;
    contentStartIndex = 2;
  } else if (URL_REGEX.test(firstLine)) {
    imageReference = firstLine;
    titleIndex = 1;
    contentStartIndex = 2;
  }

  if (titleIndex >= lines.length) {
    throw new Error(
      "Document must have a title after the image reference. Format: [Image]\n[Title]\n[Content]",
    );
  }

  const title = lines[titleIndex];

  const contentLines = lines.slice(contentStartIndex);
  const content = contentLines.join("\n");

  if (!content.trim()) {
    throw new Error(
      "Document must contain content after the title. Format: [Title]\n[Content]",
    );
  }

  return {
    title,
    content,
    imageReference,
    embeddedImages: embeddedImages.length > 0 ? embeddedImages : undefined,
  };
}

export function validateFile(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase().slice(1);
}
