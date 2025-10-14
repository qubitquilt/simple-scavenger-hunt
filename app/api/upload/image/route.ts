import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { imageUploadSchema } from "@/lib/validation";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const defaultMaxFileSize = 5 * 1024 * 1024; // 5MB

function parseAllowedFormats(allowedFormats: any): string[] {
  if (!allowedFormats) return [];
  if (typeof allowedFormats === "string") {
    try {
      const parsed = JSON.parse(allowedFormats);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return [];
    }
  } else if (Array.isArray(allowedFormats)) {
    return allowedFormats;
  }
  return [];
}

export async function POST(request: NextRequest) {
  let filePath: string | null = null;
  try {
    const userId = request.cookies.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const questionId = formData.get("questionId") as string;

    if (!file || !questionId) {
      return NextResponse.json(
        { error: "File and questionId are required" },
        { status: 400 },
      );
    }

    const validation = imageUploadSchema.safeParse({ file, questionId });

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Fetch progress to get eventId
    const progress = await prisma.progress.findFirst({
      where: { userId },
      select: { id: true, eventId: true },
    });

    if (!progress) {
      return NextResponse.json(
        { error: "No progress found for user" },
        { status: 404 },
      );
    }

    const { eventId } = progress;

    // Fetch question to validate constraints
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        eventId,
      },
      select: {
        type: true,
        allowedFormats: true,
        maxFileSize: true,
      },
    });

    if (!question || question.type !== "image") {
      return NextResponse.json(
        { error: "Image question not found" },
        { status: 404 },
      );
    }

    const questionAllowedFormats = parseAllowedFormats(question.allowedFormats);

    if (questionAllowedFormats.length === 0) {
      return NextResponse.json(
        { error: "No allowed formats specified" },
        { status: 400 },
      );
    }

    const questionMaxFileSize = question.maxFileSize || defaultMaxFileSize;

    // Map extensions to MIME types
    const allowedMimeTypes = questionAllowedFormats.map(
      (ext) => `image/${ext === "jpg" ? "jpeg" : ext}`,
    );

    // Validate file type and size
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file format. Allowed: ${questionAllowedFormats.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (file.size > questionMaxFileSize) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    // Determine extension from MIME type
    let ext: string;
    switch (file.type) {
      case "image/jpeg":
        ext = "jpg";
        break;
      case "image/png":
        ext = "png";
        break;
      case "image/gif":
        ext = "gif";
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported image format" },
          { status: 400 },
        );
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Fetch event slug for path organization
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { slug: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { slug: eventSlug } = event;

    // Create upload directory
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      eventSlug,
      questionId,
    );
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate filename
    const filename = `${randomUUID()}.${ext}`;
    filePath = path.join(uploadDir, filename);

    // Write file
    await fs.writeFile(filePath, buffer);

    const url = `/uploads/${eventSlug}/${questionId}/${filename}`;

    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    // Only log error for debugging purposes - not in production
    if (process.env.NODE_ENV === "development") {
      console.error("Image upload error:", error);
    }

    // Cleanup partial file if it was created
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        // Silently ignore cleanup errors as they're not critical
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to cleanup partial file:", unlinkError);
        }
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
