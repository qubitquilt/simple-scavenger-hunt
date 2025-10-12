import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Question } from '@/types/question'
import type { Event } from '@/types/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    const questions = await prisma.question.findMany({
      where: eventId ? { eventId } : {},
      orderBy: { createdAt: 'desc' }
    })

    const typedQuestions: Question[] = questions.map(q => ({
      ...q,
      options: q.options as Record<string, string> | undefined,
      expectedAnswer: q.expectedAnswer || '',
      createdAt: q.createdAt.toISOString()
    }))
    return NextResponse.json({ questions: typedQuestions })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { eventId, type, content, options, expectedAnswer, aiThreshold } = await request.json()

    if (!eventId || !content || !expectedAnswer) {
      return NextResponse.json({ error: 'eventId, content, and expectedAnswer are required' }, { status: 400 })
    }

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const questionData = {
      eventId,
      type,
      content,
      options,
      expectedAnswer,
      aiThreshold: Number(aiThreshold) || 8,
    }

    const data = await prisma.question.create({
      data: questionData
    })

    const typedQuestion: Question = {
      ...data,
      options: data.options as Record<string, string> | undefined,
      expectedAnswer: data.expectedAnswer || '',
      createdAt: data.createdAt.toISOString()
    }
    return NextResponse.json({ question: typedQuestion }, { status: 201 })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, eventId, type, content, options, expectedAnswer, aiThreshold } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updateData: Record<string, any> = {
      type,
      content,
      options,
      expectedAnswer,
      aiThreshold: Number(aiThreshold) || 8,
    }

    if (eventId) {
      // Verify event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true }
      })

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      updateData.eventId = eventId
    }

    const data = await prisma.question.update({
      where: { id },
      data: updateData
    })

    const typedQuestion: Question = {
      ...data,
      options: data.options as Record<string, string> | undefined,
      expectedAnswer: data.expectedAnswer || '',
      createdAt: data.createdAt.toISOString()
    }
    return NextResponse.json({ question: typedQuestion })
  } catch (error) {
    console.error('Database error:', error)
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.question.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Question deleted successfully' })
  } catch (error) {
    console.error('Database error:', error)
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}