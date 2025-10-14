import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    if (!slug) {
      return NextResponse.json({ error: "Question slug is required" }, { status: 400 });
    }

    // Find the question by slug and include event data
    const question = await prisma.question.findUnique({
      where: { slug },
      include: {
        event: true, // Include the event data
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Return the question with event data
    return NextResponse.json({
      question,
      event: question.event,
    });
  } catch (error) {
    console.error("Error fetching question:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}