import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Question } from "@/types/question";
import type { Event } from "@/types/admin";
import { createQuestionSchema, updateQuestionSchema } from "@/lib/validation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
const createSlugFromContent = (content: string): string => {
  return content
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // remove special characters except spaces and hyphens
    .replace(/\s+/g, "-") // replace spaces with hyphens
    .replace(/-+/g, "-") // replace multiple hyphens with single
    .trim()
    .replace(/^-|-$/g, ""); // remove leading/trailing hyphens
};

const generateUniqueSlug = async (baseSlug: string): Promise<string> => {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingQuestion = await prisma.question.findUnique({
      where: { slug },
    });

    if (!existingQuestion) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
};

export const dynamic = "force-dynamic";

function parseAllowedFormats(
  allowedFormats: any,
): ("jpg" | "png" | "gif")[] | null {
  if (!allowedFormats) return null;
  if (typeof allowedFormats === "string") {
    try {
      const parsed = JSON.parse(allowedFormats);
      if (Array.isArray(parsed)) {
        return parsed as ("jpg" | "png" | "gif")[];
      }
    } catch {
      return null;
    }
  } else if (Array.isArray(allowedFormats)) {
    return allowedFormats as ("jpg" | "png" | "gif")[];
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    const questions = await prisma.question.findMany({
      where: eventId ? { eventId } : {},
      orderBy: { createdAt: "desc" },
    });

    const typedQuestions: Question[] = questions.map((q) => {
      let options: Record<string, string> | undefined;
      let minResolution: { width: number; height: number } | undefined;
      if (q.type === "multiple_choice" && q.options) {
        options = JSON.parse(q.options as string);
      }
      if (q.type === "image" && q.minResolution) {
        minResolution = JSON.parse(q.minResolution as string);
      }
      return {
        ...q,
        options,
        expectedAnswer: q.expectedAnswer || "",
        createdAt: q.createdAt.toISOString(),
        allowedFormats: parseAllowedFormats(q.allowedFormats),
        minResolution,
      };
    });
    return NextResponse.json({ questions: typedQuestions });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any).admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createQuestionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 },
      );
    }

    const validatedData = result.data;

    const event = await prisma.event.findUnique({
      where: { id: validatedData.eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const createData = validatedData as any;

    if (validatedData.type === "multiple_choice") {
      createData.options = JSON.stringify(validatedData.options);
    }

    if (validatedData.type === "image") {
      createData.allowedFormats = JSON.stringify(validatedData.allowedFormats);
      createData.minResolution = JSON.stringify(validatedData.minResolution);
    }

    // Generate unique slug from question content
    const baseSlug = createSlugFromContent(validatedData.content);
    createData.slug = await generateUniqueSlug(baseSlug);

    const { required, ...questionData } = createData;
    const data = await prisma.question.create({
      data: questionData,
    });

    const typedQuestion = {
      id: data.id,
      eventId: data.eventId,
      type: data.type,
      content: data.content,
      expectedAnswer: data.expectedAnswer || "",
      aiThreshold: data.aiThreshold,
      hintEnabled: data.hintEnabled,
      imageDescription: data.imageDescription,
      maxFileSize: data.maxFileSize,
      required: (validatedData as any).required ?? false,
      options:
        data.type === "multiple_choice" && data.options
          ? JSON.parse(data.options as string)
          : undefined,
      createdAt: new Date(data.createdAt).toISOString(),
      allowedFormats: parseAllowedFormats(data.allowedFormats),
      minResolution:
        data.type === "image" && data.minResolution
          ? JSON.parse(data.minResolution as string)
          : (null as any),
    } as Question;
    return NextResponse.json({ question: typedQuestion }, { status: 201 });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any).admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = updateQuestionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 },
      );
    }

    const validatedData = result.data;
    const { id, ...updateDataBase } = validatedData;

    if (updateDataBase.eventId) {
      const event = await prisma.event.findUnique({
        where: { id: updateDataBase.eventId },
      });

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }
    }

    const updateQuestionData: any = { ...updateDataBase };

    if (validatedData.type === "multiple_choice") {
      if (updateDataBase.options !== undefined) {
        updateQuestionData.options = JSON.stringify(updateDataBase.options);
      }
    }

    if (validatedData.type === "image") {
      if (updateDataBase.allowedFormats !== undefined) {
        updateQuestionData.allowedFormats = JSON.stringify(
          updateDataBase.allowedFormats,
        );
      }
      const anyUpdateBase = updateDataBase as any;
      if (anyUpdateBase.minResolution !== undefined) {
        updateQuestionData.minResolution = JSON.stringify(
          anyUpdateBase.minResolution,
        );
      }
    }

    const data = await prisma.question.update({
      where: { id },
      data: updateQuestionData,
    });

    const typedQuestion: Question = {
      ...data,
      options: data.options as Record<string, string> | undefined,
      expectedAnswer: data.expectedAnswer || "",
      createdAt: new Date(data.createdAt).toISOString(),
      allowedFormats: parseAllowedFormats(data.allowedFormats),
      minResolution:
        data.type === "image" && data.minResolution
          ? JSON.parse(data.minResolution as string)
          : undefined,
      imageDescription: data.imageDescription || undefined,
    };
    return NextResponse.json({ question: typedQuestion });
  } catch (error) {
    console.error("Database error:", error);
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any).admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.question.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Database error:", error);
    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
