import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get("userId")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { questionId } = body;

    if (!questionId) {
      return NextResponse.json(
        { error: "questionId is required" },
        { status: 400 },
      );
    }

    // Fetch progress to get progressId and eventId
    const progressData = await prisma.progress.findFirst({
      where: { userId },
      select: { id: true, eventId: true },
    });

    if (!progressData) {
      return NextResponse.json(
        { error: "No progress found for user" },
        { status: 404 },
      );
    }

    const { id: progressId, eventId } = progressData;

    // Fetch question and check if hints are enabled
    const questionData = await prisma.question.findFirst({
      where: {
        id: questionId,
        eventId,
      },
      select: {
        content: true,
        expectedAnswer: true,
        type: true,
        hintEnabled: true,
      },
    });

    if (!questionData) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }

    if (!questionData.hintEnabled) {
      return NextResponse.json(
        { error: "Hints are not enabled for this question" },
        { status: 403 },
      );
    }

    // Check rate limiting: max 2 hints per question
    const existingHints = await prisma.answer.findMany({
      where: {
        progressId,
        questionId,
      },
      select: {
        submission: true,
      },
    });

    // Count hints by looking for hint markers in submission
    let hintCount = 0;
    for (const answer of existingHints) {
      if (
        answer.submission &&
        typeof answer.submission === "object" &&
        "hints" in answer.submission
      ) {
        hintCount = Math.max(hintCount, (answer.submission as any).hints || 0);
      }
    }

    if (hintCount >= 2) {
      return NextResponse.json(
        { error: "Maximum hints reached for this question" },
        { status: 429 },
      );
    }

    // Fetch previous submissions for context
    const previousSubmissions = await prisma.answer.findMany({
      where: {
        progressId,
        questionId,
      },
      select: {
        submission: true,
        aiScore: true,
        status: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 3, // Last 3 submissions for context
    });

    // Prepare context for AI
    const contextSubmissions = previousSubmissions.map((sub) => ({
      submission: sub.submission,
      score: sub.aiScore,
      status: sub.status,
    }));

    // Generate hint using OpenRouter
    const prompt = `You are helping a user with a scavenger hunt question. The question is: "${questionData.content}". The expected answer is: "${questionData.expectedAnswer}".

Previous submissions and their scores (out of 10):
${contextSubmissions.map((sub, i) => `Attempt ${i + 1}: "${JSON.stringify(sub.submission)}" - Score: ${sub.score}, Status: ${sub.status}`).join("\n")}

Provide a helpful hint that guides the user toward the correct answer without giving it away directly. The hint should be contextual based on their previous attempts. Keep it concise and encouraging.

Hint:`;

    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY!}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 150,
        }),
      },
    );

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter API error: ${openRouterResponse.statusText}`);
    }

    const data = await openRouterResponse.json();
    const hint = data.choices[0].message.content.trim();

    // Update or create answer record with hint count
    const existingAnswer = await prisma.answer.findFirst({
      where: {
        progressId,
        questionId,
      },
      select: {
        id: true,
        submission: true,
      },
    });

    const newHintCount = hintCount + 1;
    const submissionData =
      (existingAnswer?.submission as Record<string, any>) || {};
    const updatedSubmission = {
      ...submissionData,
      hints: newHintCount,
    };

    if (existingAnswer) {
      await prisma.answer.update({
        where: { id: existingAnswer.id },
        data: { submission: updatedSubmission },
      });
    } else {
      await prisma.answer.create({
        data: {
          progressId,
          questionId,
          submission: updatedSubmission,
          status: "pending",
        },
      });
    }

    return NextResponse.json({
      hint,
      hintCount: newHintCount,
      maxHints: 2,
    });
  } catch (error) {
    console.error("Hints API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
