import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { UserProgress, AdminMetrics } from "@/types/admin";
import type { User } from "@/types/user";
import type { Answer } from "@/types/answer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const completed = searchParams.get("completed") === "true";
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 },
      );
    }

    // Validate eventId is a valid UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return NextResponse.json(
        { error: "Invalid eventId format" },
        { status: 400 },
      );
    }

    const usersData = await prisma.user.findMany({
      where: {
        progress: {
          some: {
            eventId,
            ...(completed !== undefined && { completed }),
          },
        },
      },
      include: {
        progress: {
          where: { eventId },
          include: {
            answers: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const users: UserProgress[] = usersData.map((user) => {
      const progress = user.progress[0];
      const mappedAnswers: Answer[] = (progress.answers || []).map((a) => ({
        id: a.id,
        progressId: progress.id,
        questionId: a.questionId,
        submission: a.submission as any,
        aiScore: a.aiScore || undefined,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
      }));
      const completedQuestions = mappedAnswers.filter(
        (a) => a.status === "correct",
      ).length;
      const totalQuestions = mappedAnswers.length;

      return {
        id: user.id,
        userId: user.id,
        name: user.name,
        eventId: progress.eventId,
        eventTitle: "", // Would need to join with events if needed
        completed: progress.completed,
        completedQuestions,
        totalQuestions,
        createdAt: progress.createdAt.toISOString(),
        answers: mappedAnswers,
      };
    });

    // Compute metrics
    const totalUsers = users.length;
    const completedUsers = users.filter((u) => u.completed).length;
    const completionRate =
      totalUsers > 0 ? Math.round((completedUsers / totalUsers) * 100) : 0;

    // Average completion time (simplified: from created_at to now for completed)
    const avgCompletionTime =
      users
        .filter((u) => u.completed)
        .reduce((sum, u) => {
          const created = new Date(u.createdAt);
          const now = new Date();
          const diff = (now.getTime() - created.getTime()) / (1000 * 60); // minutes
          return sum + diff;
        }, 0) / (completedUsers || 1);

    const topUsers = users
      .filter((u) => u.completed)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    const metrics: AdminMetrics = {
      totalUsers,
      completedUsers,
      completionRate,
      averageCompletionTime: Math.round(avgCompletionTime),
      topUsers,
    };

    return NextResponse.json({ users, metrics });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
