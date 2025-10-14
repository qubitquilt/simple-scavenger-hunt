import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Question, QuestionType } from "@/types/question";
import type { Event } from "@/types/admin";
import ChallengeView from "@/components/ChallengeView";
import Breadcrumbs from "@/components/Breadcrumbs";

async function getQuestionAndEvent(
  slug: string,
): Promise<{ question: Question; event: Event }> {
  const { prisma } = await import("@/lib/prisma");
  const question = await prisma.question.findUnique({
    where: { slug },
    include: {
      event: true,
    },
  });

  if (!question) {
    notFound();
  }

  // Transform to match custom types with backward compatibility
  const transformedQuestion: Question = {
    ...question,
    type: question.type as any as QuestionType,
    title: question.title || question.content || '',
    content: question.content || '',
    options: question.options as Record<string, string> | undefined,
    createdAt: question.createdAt.toISOString(),
    allowedFormats: question.allowedFormats as
      | ("jpg" | "png" | "gif")[]
      | null
      | undefined,
    minResolution: question.minResolution as
      | { width: number; height: number }
      | null
      | undefined,
  };

  const transformedEvent: Event = {
    ...question.event,
    description: question.event?.description || "",
    date: question.event?.date,
    createdAt: question.event?.createdAt,
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
