import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function shuffleArray(array: string[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function POST(request: NextRequest) {
  try {
    const { name, eventId } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Check if user exists by name
    let user = await prisma.user.findFirst({
      where: {
        name: name,
      },
    });

    let userId: string;

    if (user) {
      userId = user.id;
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          name: name,
        },
      });
      userId = user.id;
    }

    let targetEventId: string;

    if (eventId) {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true },
      });

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      targetEventId = event.id;
    } else {
      // Fetch default event (first event)
      const event = await prisma.event.findFirst({
        orderBy: { id: "asc" },
        select: { id: true },
      });

      if (!event) {
        return NextResponse.json({ error: "No events found" }, { status: 404 });
      }

      targetEventId = event.id;
    }

    // Fetch questions for the event
    const questions = await prisma.question.findMany({
      where: { eventId: targetEventId },
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
          eventId: targetEventId,
        },
      },
    });

    if (existingProgress) {
      // Update existing
      await prisma.progress.update({
        where: { id: existingProgress.id },
        data: {
          questionOrder: shuffledOrder,
          completed: false,
        },
      });
    } else {
      // Create new progress
      await prisma.progress.create({
        data: {
          userId,
          eventId: targetEventId,
          questionOrder: shuffledOrder,
          completed: false,
        },
      });
    }

    // Set cookie
    const response = NextResponse.json({ userId });
    response.cookies.set("userId", userId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Register route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
