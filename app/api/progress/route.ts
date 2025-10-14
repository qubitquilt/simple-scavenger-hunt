import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { Progress, Question } from "@/types/question";
import type { Answer, AnswerStatus } from "@/types/answer";

export const dynamic = "force-dynamic";

function shuffleArray(array: string[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function POST(request: NextRequest) {
  try {
    const { eventSlug } = await request.json();

    const userId = request.cookies.get("userId")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 401 },
      );
    }

    if (!eventSlug) {
      return NextResponse.json(
        { error: "eventSlug is required" },
        { status: 400 },
      );
    }

    // Fetch event by slug
    const event = await prisma.event.findUnique({
      where: { slug: eventSlug },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch questions for the event
    const questions = await prisma.question.findMany({
      where: { eventId: event.id },
      select: { id: true },
    });

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: "No questions found for this event" },
        { status: 404 },
      );
    }

    const questionIds = questions.map((q) => q.id);
    const shuffledOrder = shuffleArray([...questionIds]);

    // Check if progress exists
    const existingProgress = await prisma.progress.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId: event.id,
        },
      },
    });

    let progressId: string;

    if (existingProgress) {
      // Update existing
      const updatedProgress = await prisma.progress.update({
        where: { id: existingProgress.id },
        data: {
          questionOrder: shuffledOrder,
          completed: false,
        },
        select: { id: true },
      });
      progressId = updatedProgress.id;
    } else {
      // Create new
      const newProgress = await prisma.progress.create({
        data: {
          userId,
          eventId: event.id,
          questionOrder: shuffledOrder,
          completed: false,
        },
        select: { id: true },
      });
      progressId = newProgress.id;
    }

    return NextResponse.json({ progressId, questionOrder: shuffledOrder });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  console.log("Progress GET API called");
  try {
    const session = await getServerSession(authOptions);
    console.log("Session from getServerSession:", session);

    const userId = request.cookies.get("userId")?.value;
    console.log("UserId from cookies:", userId);

    // Determine userId from session or cookie
    let finalUserId: string | undefined;
    let isAdmin = false;

    if (session?.user?.id) {
      // Admin user with NextAuth session
      finalUserId = session.user.id;
      isAdmin = session.user.admin || finalUserId === 'admin';
      console.log("Using NextAuth session userId:", finalUserId, "Is admin:", isAdmin);
    } else if (userId) {
      // Regular user with cookie
      finalUserId = userId;
      console.log("Using cookie userId:", finalUserId);
    } else {
      console.log("No authentication found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Handle admin sessions gracefully - admins don't have personal progress
    if (isAdmin) {
      console.log("Admin session detected - returning no progress");
      return NextResponse.json(
        { error: "Admins do not have personal progress" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    let targetEventId: string;

    if (eventId) {
      // Verify event exists and user is registered
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true },
      });

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      // Check if user has progress for this event (i.e., registered)
      const userProgress = await prisma.progress.findUnique({
        where: {
          userId_eventId: {
            userId: finalUserId,
            eventId: event.id,
          },
        },
        select: { id: true },
      });

      if (!userProgress) {
        return NextResponse.json(
          { error: "User not registered for this event" },
          { status: 403 },
        );
      }

      targetEventId = event.id;
    } else {
      // Fetch default event (first event) and check registration
      const event = await prisma.event.findFirst({
        orderBy: { id: "asc" },
        select: { id: true },
      });

      if (!event) {
        return NextResponse.json({ error: "No events found" }, { status: 404 });
      }

      const userProgress = await prisma.progress.findUnique({
        where: {
          userId_eventId: {
            userId: finalUserId,
            eventId: event.id,
          },
        },
        select: { id: true },
      });

      if (!userProgress) {
        return NextResponse.json(
          { error: "User not registered for default event" },
          { status: 403 },
        );
      }

      targetEventId = event.id;
    }

    // Fetch progress with answers including submission
    const progressData = await prisma.progress.findUnique({
      where: {
        userId_eventId: {
          userId: finalUserId,
          eventId: targetEventId,
        },
      },
      include: {
        answers: {
          where: {
            question: {
              eventId: targetEventId,
            },
          },
          select: {
            id: true,
            questionId: true,
            submission: true,
            aiScore: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!progressData) {
      return NextResponse.json(
        { error: "No progress found for user" },
        { status: 404 },
      );
    }

    // Fetch questions for the event
    const questionsData = await prisma.question.findMany({
      where: { eventId: targetEventId },
      select: {
        id: true,
        eventId: true,
        type: true,
        title: true,
        content: true,
        options: true,
        expectedAnswer: true,
        aiThreshold: true,
        hintEnabled: true,
        imageDescription: true,
        minResolution: true,
        allowedFormats: true,
        maxFileSize: true,
        createdAt: true,
        slug: true,
      },
    });

    console.log(
      "Questions data with slugs:",
      questionsData.map((q) => ({ id: q.id, slug: q.slug })),
    );

    const answersMap = new Map(
      progressData.answers.map((a) => [a.questionId, a]),
    );

    interface QuestionWithStatus extends Question {
      answered?: boolean;
      computedStatus?: AnswerStatus;
      aiScore?: number;
      submission?: any;
    }

    const questionsWithStatus: QuestionWithStatus[] = questionsData.map((q) => {
      const userAnswer = answersMap.get(q.id);
      const computedStatus: AnswerStatus = userAnswer
        ? userAnswer.status === "correct"
          ? "accepted"
          : userAnswer.status === "incorrect"
            ? "rejected"
            : "pending"
        : "pending";

      const { answers: _, ...questionBase } = q as any; // Exclude relation if present, but since select doesn't include, safe

      return {
        ...questionBase,
        answered: !!userAnswer,
        computedStatus,
        aiScore: userAnswer?.aiScore ?? undefined,
        submission: userAnswer?.submission,
      };
    });

    // Compute progress stats
    const totalQuestions = questionsWithStatus.length;
    const completedQuestions = questionsWithStatus.filter(
      (q) => q.computedStatus === "accepted",
    ).length;
    const isCompleted = completedQuestions === totalQuestions;

    console.log(`[PROGRESS GET] User ${finalUserId}, Event ${targetEventId}: totalQuestions=${totalQuestions}, completedQuestions=${completedQuestions}, isCompleted=${isCompleted}, accepted questions: ${questionsWithStatus.filter(q => q.computedStatus === "accepted").map(q => q.id).join(', ')}`);

    return NextResponse.json({
      progress: {
        completed: isCompleted,
      },
      questions: questionsWithStatus,
      stats: {
        completedCount: completedQuestions,
        totalCount: totalQuestions,
      },
    });
  } catch (error) {
    console.error("Progress API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
