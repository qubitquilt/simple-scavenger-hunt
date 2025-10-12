import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Progress, Question } from '@/types/question'
import type { Answer } from '@/types/answer'

export const dynamic = 'force-dynamic'

function shuffleArray(array: string[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json()

    const userId = request.cookies.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 })
    }

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    // Fetch questions for the event
    const questions = await prisma.question.findMany({
      where: { eventId },
      select: { id: true }
    })

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions found for this event' }, { status: 404 })
    }

    const questionIds = questions.map(q => q.id)
    const shuffledOrder = shuffleArray([...questionIds])

    // Check if progress exists
    const existingProgress = await prisma.progress.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId
        }
      }
    })

    let progressId: string

    if (existingProgress) {
      // Update existing
      const updatedProgress = await prisma.progress.update({
        where: { id: existingProgress.id },
        data: {
          questionOrder: shuffledOrder,
          completed: false
        },
        select: { id: true }
      })
      progressId = updatedProgress.id
    } else {
      // Create new
      const newProgress = await prisma.progress.create({
        data: {
          userId,
          eventId,
          questionOrder: shuffledOrder,
          completed: false
        },
        select: { id: true }
      })
      progressId = newProgress.id
    }

    return NextResponse.json({ progressId, questionOrder: shuffledOrder })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    let targetEventId: string

    if (eventId) {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true }
      })

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      targetEventId = event.id
    } else {
      // Fetch default event (first event)
      const event = await prisma.event.findFirst({
        orderBy: { id: 'asc' },
        select: { id: true }
      })

      if (!event) {
        return NextResponse.json({ error: 'No events found' }, { status: 404 })
      }

      targetEventId = event.id
    }

    // Fetch progress
    const progressData = await prisma.progress.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId: targetEventId
        }
      },
      select: {
        id: true,
        questionOrder: true,
        completed: true,
        createdAt: true
      }
    })

    if (!progressData) {
      return NextResponse.json({ error: 'No progress found for user' }, { status: 404 })
    }

    const progress: Progress = {
      id: progressData.id,
      userId,
      eventId: targetEventId,
      questionOrder: progressData.questionOrder as string[],
      completed: progressData.completed,
      createdAt: progressData.createdAt.toISOString()
    }

    // Fetch answers for this progress
    const answersData = await prisma.answer.findMany({
      where: { progressId: progress.id },
      select: {
        questionId: true,
        status: true,
        aiScore: true
      }
    })

    // Compute stats
    const completedCount = answersData.filter(a => a.status === 'correct').length
    const totalCount = progress.questionOrder.length
    const stats = { completedCount, totalCount }

    if (progress.completed) {
      console.log('Returning completed progress response with stats:', { hasStats: !!stats, stats })
      return NextResponse.json({ progress, questions: [], stats })
    }

    // Fetch questions in order with full details
    const questionsData = await prisma.question.findMany({
      where: {
        id: { in: progress.questionOrder }
      },
      select: {
        id: true,
        type: true,
        content: true,
        options: true,
        expectedAnswer: true,
        aiThreshold: true,
        hintEnabled: true
      }
    })

    const answersMap = new Map(
      answersData.map(a => [a.questionId, { status: a.status, aiScore: a.aiScore }])
    )

    const questions: (Question & { answered?: boolean; status?: 'pending' | 'correct' | 'incorrect'; aiScore?: number })[] =
      questionsData.map(q => {
        const answer = answersMap.get(q.id)
        return {
          id: q.id,
          eventId: targetEventId,
          type: q.type,
          content: q.content,
          options: q.options as Record<string, string> | undefined,
          expectedAnswer: q.expectedAnswer || '',
          aiThreshold: q.aiThreshold,
          hintEnabled: q.hintEnabled,
          createdAt: new Date().toISOString(),
          answered: !!answer,
          status: answer?.status,
          aiScore: answer?.aiScore || undefined
        }
      })

    console.log('Returning non-completed progress response with stats:', { hasStats: !!stats, stats })
    return NextResponse.json({
      progress,
      questions,
      stats
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}