import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Event } from "@/types/admin";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type EventData = Prisma.EventGetPayload<{
  select: {
    id: true;
    title: true;
    slug: true;
    description: true;
    date: true;
    createdAt: true;
    theme: true;
  };
}>;

export async function GET() {
  try {
    // Temporarily disabled for curl testing
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.admin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const eventsData = await prisma.event.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        date: true,
        createdAt: true,
        theme: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const typedEvents: Event[] = eventsData.map((event: EventData) => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description || null,
      date: event.date,
      createdAt: event.createdAt,
      theme: event.theme,
    }));

    return NextResponse.json({ events: typedEvents });
  } catch (error) {
    console.error("Unexpected error in GET /api/admin/events:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, slug, description, date } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const parsedDate = date ? new Date(date) : new Date("2025-10-14");
    const eventData = await prisma.event.create({
      data: {
        title,
        slug,
        description: description || null,
        date: parsedDate,
      },
    });

    const typedEvent: Event = {
      id: eventData.id,
      title: eventData.title,
      slug: eventData.slug,
      description: eventData.description || null,
      date: eventData.date,
      createdAt: eventData.createdAt,
      theme: eventData.theme,
    };
    return NextResponse.json({ event: typedEvent }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/admin/events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, title, slug, description, date } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const parsedDate = date ? new Date(date) : new Date("2025-10-14");
    const eventData = await prisma.event.update({
      where: { id },
      data: {
        title,
        slug,
        description: description || null,
        date: parsedDate,
      },
    });

    const typedEvent: Event = {
      id: eventData.id,
      title: eventData.title,
      slug: eventData.slug,
      description: eventData.description || null,
      date: eventData.date,
      createdAt: eventData.createdAt,
      theme: eventData.theme,
    };
    return NextResponse.json({ event: typedEvent });
  } catch (error) {
    console.error("Unexpected error in PUT /api/admin/events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const existingEvent = await prisma.event.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/admin/events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
