import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export type ImageUploadResult = { url: string };

export interface StorageService {
  uploadImage(
    fileBuffer: Buffer,
    ext: string,
    questionId: string,
    eventSlug: string,
  ): Promise<ImageUploadResult>;
  cleanupImage(url: string): Promise<void>;
}

const uploadImage = async (
  fileBuffer: Buffer,
  ext: string,
  questionId: string,
  eventSlug: string,
): Promise<ImageUploadResult> => {
  const filename = `${randomUUID()}.${ext}`;
  const filePath = path.join(
    "public",
    "uploads",
    eventSlug,
    questionId,
    filename,
  );
  const uploadDir = path.dirname(filePath);
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(filePath, fileBuffer);
  return { url: `/uploads/${eventSlug}/${questionId}/${filename}` };
};

const cleanupImage = async (url: string): Promise<void> => {
  if (!url.startsWith("/uploads/")) {
    return;
  }
  const relativePath = url.replace("/uploads", "uploads");
  const fullPath = path.join("public", relativePath);
  try {
    await fs.unlink(fullPath);
  } catch (error) {
    console.error("Failed to cleanup image:", error);
  }
};

const storageProvider = process.env.STORAGE_PROVIDER || "local";

let storage: StorageService;

if (storageProvider === "local") {
  storage = { uploadImage, cleanupImage };
} else {
  throw new Error(`Unsupported storage provider: ${storageProvider}`);
}

export default storage;
