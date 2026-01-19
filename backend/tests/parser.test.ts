import {
  parseDocument,
  getFileExtension,
  validateFile,
} from "../src/modules/parser/parser";
import fs from "fs";
import path from "path";
import os from "os";

describe("Parser Module", () => {
  let testDir: string;

  beforeAll(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "parser-test-"));
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe("Basic Parsing - .txt files", () => {
    test("should parse .txt file with title and content", async () => {
      const filePath = path.join(testDir, "basic.txt");
      fs.writeFileSync(
        filePath,
        "My Article Title\nThis is the first paragraph.\nThis is the second paragraph.",
      );

      const result = await parseDocument(filePath, "txt");

      expect(result.title).toBe("My Article Title");
      expect(result.content).toContain("This is the first paragraph.");
      expect(result.content).toContain("This is the second paragraph.");
      expect(result.imageReference).toBeUndefined();
    });

    test("should parse .txt file with multiple paragraphs", async () => {
      const filePath = path.join(testDir, "multiline.txt");
      fs.writeFileSync(
        filePath,
        "Title\nParagraph 1\nParagraph 2\nParagraph 3\nParagraph 4",
      );

      const result = await parseDocument(filePath, "txt");

      expect(result.title).toBe("Title");
      expect(result.content).toBe(
        "Paragraph 1\nParagraph 2\nParagraph 3\nParagraph 4",
      );
    });

    test("should handle .txt file with extra whitespace", async () => {
      const filePath = path.join(testDir, "whitespace.txt");
      fs.writeFileSync(
        filePath,
        "  Title with spaces  \n\n  Content line 1  \n\n  Content line 2  \n\n",
      );

      const result = await parseDocument(filePath, "txt");

      expect(result.title).toBe("Title with spaces");
      expect(result.content).toBe("Content line 1\nContent line 2");
    });
  });

  describe("Basic Parsing - .md files", () => {
    test("should parse .md file with markdown formatting", async () => {
      const filePath = path.join(testDir, "markdown.md");
      fs.writeFileSync(
        filePath,
        "# My Markdown Title\nThis is **bold** text.\nThis is *italic* text.",
      );

      const result = await parseDocument(filePath, "md");

      expect(result.title).toBe("# My Markdown Title");
      expect(result.content).toContain("This is **bold** text.");
      expect(result.content).toContain("This is *italic* text.");
    });
  });

  describe("Image Reference Detection", () => {
    test("should detect Markdown image syntax in first line", async () => {
      const filePath = path.join(testDir, "with-md-image.txt");
      fs.writeFileSync(
        filePath,
        "![Article Header](https://example.com/header.png)\nDocument Title\nContent paragraph here.",
      );

      const result = await parseDocument(filePath, "txt");

      expect(result.imageReference).toBe("https://example.com/header.png");
      expect(result.title).toBe("Document Title");
      expect(result.content).toBe("Content paragraph here.");
    });

    test("should detect URL as image reference", async () => {
      const filePath = path.join(testDir, "with-url-image.txt");
      fs.writeFileSync(
        filePath,
        "https://example.com/image.jpg\nDocument Title After URL\nContent paragraph.",
      );

      const result = await parseDocument(filePath, "txt");

      expect(result.imageReference).toBe("https://example.com/image.jpg");
      expect(result.title).toBe("Document Title After URL");
      expect(result.content).toBe("Content paragraph.");
    });

    test("should detect http URL as image reference", async () => {
      const filePath = path.join(testDir, "with-http-url.txt");
      fs.writeFileSync(
        filePath,
        "http://example.com/photo.png\nTitle Here\nSome content text.",
      );

      const result = await parseDocument(filePath, "txt");

      expect(result.imageReference).toBe("http://example.com/photo.png");
      expect(result.title).toBe("Title Here");
    });

    test("should handle local file path in Markdown image syntax", async () => {
      const filePath = path.join(testDir, "with-local-image.md");
      fs.writeFileSync(
        filePath,
        "![Description](./images/local-image.png)\nArticle Title\nArticle content.",
      );

      const result = await parseDocument(filePath, "md");

      expect(result.imageReference).toBe("./images/local-image.png");
      expect(result.title).toBe("Article Title");
    });
  });

  describe("Edge Cases - Error Handling", () => {
    test("should throw error for empty file", async () => {
      const filePath = path.join(testDir, "empty.txt");
      fs.writeFileSync(filePath, "");

      await expect(parseDocument(filePath, "txt")).rejects.toThrow("empty");
    });

    test("should throw error for file with only whitespace", async () => {
      const filePath = path.join(testDir, "whitespace-only.txt");
      fs.writeFileSync(filePath, "\n\n   \n\t\n   ");

      await expect(parseDocument(filePath, "txt")).rejects.toThrow("empty");
    });

    test("should throw error for image reference without title", async () => {
      const filePath = path.join(testDir, "image-no-title.txt");
      fs.writeFileSync(filePath, "![alt text](image.jpg)");

      await expect(parseDocument(filePath, "txt")).rejects.toThrow("title");
    });

    test("should throw error for URL without title", async () => {
      const filePath = path.join(testDir, "url-no-title.txt");
      fs.writeFileSync(filePath, "https://example.com/image.png");

      await expect(parseDocument(filePath, "txt")).rejects.toThrow("title");
    });

    test("should throw error for missing content after title", async () => {
      const filePath = path.join(testDir, "no-content.txt");
      fs.writeFileSync(filePath, "Title Only\n\n\n");

      await expect(parseDocument(filePath, "txt")).rejects.toThrow("content");
    });

    test("should throw error for title but no content", async () => {
      const filePath = path.join(testDir, "title-no-body.txt");
      fs.writeFileSync(filePath, "Just A Title");

      await expect(parseDocument(filePath, "txt")).rejects.toThrow("content");
    });

    test("should throw error for unsupported file type", async () => {
      const filePath = path.join(testDir, "document.pdf");
      fs.writeFileSync(filePath, "Content here");

      await expect(parseDocument(filePath, "pdf")).rejects.toThrow(
        "Unsupported",
      );
    });
  });

  describe("Utility Functions", () => {
    test("getFileExtension should extract file extension", () => {
      expect(getFileExtension("document.txt")).toBe("txt");
      expect(getFileExtension("article.md")).toBe("md");
      expect(getFileExtension("report.docx")).toBe("docx");
      expect(getFileExtension("FILE.TXT")).toBe("txt"); // Should be lowercase
    });

    test("validateFile should check if file exists", () => {
      const validFile = path.join(testDir, "valid.txt");
      fs.writeFileSync(validFile, "content");

      expect(validateFile(validFile)).toBe(true);
      expect(validateFile("/nonexistent/file.txt")).toBe(false);
    });
  });
});
