import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Question } from '@/types/question'
import type { Event } from '@/types/admin'
import ChallengeView from '@/components/ChallengeView'

async function getQuestionAndEvent(slug: string) {
  const question = await prisma.question.findUnique({
    where: { slug },
    include: {
      event: true
    }
  })

  if (!question) {
    notFound()
  }

  // Transform Prisma types to match custom types
  const transformedQuestion: Question = {
    ...question,
    options: question.options as Record<string, string> | undefined,
    createdAt: question.createdAt.toISOString(),
    allowedFormats: question.allowedFormats as ('jpg' | 'png' | 'gif')[] | null | undefined,
    minResolution: question.minResolution as { width: number; height: number } | null | undefined
  }

  const transformedEvent: Event = {
    ...question.event,
    description: question.event.description || '',
    date: question.event.date,
    createdAt: question.event.createdAt
  }

  return {
    question: transformedQuestion,
    event: transformedEvent
  }
}

export default async function ChallengePage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/register')
  }

  const { question, event } = await getQuestionAndEvent(params.slug)

  return <ChallengeView question={question} event={event} />
}