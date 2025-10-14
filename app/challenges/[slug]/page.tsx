import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Question } from "@/types/question";
import type { Event } from "@/types/admin";
import ChallengeView from "@/components/ChallengeView";
import Breadcrumbs from "@/components/Breadcrumbs";

async function getQuestionAndEvent(
  slug: string,
): Promise<{ question: Question; event: Event }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/questions/${slug}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    notFound();
  }

  const data = await response.json();

  if (!data.question) {
    notFound();
  }

  // Transform to match custom types with backward compatibility
  const transformedQuestion: Question = {
    ...data.question,
    title: data.question.title || data.question.content || '',
    content: data.question.content || '',
    options: data.question.options as Record<string, string> | undefined,
    createdAt: data.question.createdAt,
    allowedFormats: data.question.allowedFormats as
      | ("jpg" | "png" | "gif")[]
      | null
      | undefined,
    minResolution: data.question.minResolution as
      | { width: number; height: number }
      | null
      | undefined,
  };

  const transformedEvent: Event = {
    ...data.event,
    description: data.event.description || "",
    date: data.event.date,
    createdAt: data.event.createdAt,
  };

  return {
    question: transformedQuestion,
    event: transformedEvent,
  };
}

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ [key: string]: string | string[] }>;
}) {
  const slug = (await params).slug as string;

  // For users, rely on userId cookie since NextAuth is admin-only
  const cookieStore = cookies()
  const userIdCookie = cookieStore.get('userId')?.value

  if (process.env.NODE_ENV === 'development') {
    console.log('ChallengePage - userId from cookie:', userIdCookie ? 'Present' : 'Missing')
  }

  if (!userIdCookie) {
    if (process.env.NODE_ENV === 'development') {
      console.log('ChallengePage - No userId cookie, redirecting to register')
    }
    redirect('/register')
  }

  const { question, event } = await getQuestionAndEvent(slug);

  return (
    <div>
      <Breadcrumbs />
      <ChallengeView question={question} event={event} />
    </div>
  );
}
