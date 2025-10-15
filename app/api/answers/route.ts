import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import type { Prisma } from '@prisma/client'
import type { Question } from '@/types/question'
import storage from '@/lib/storage'
import { imageUploadSchema, bufferValidationSchema } from '@/lib/validation'
import { normalize } from '@/utils/normalize'
import type { AnswerSubmission, AnswerStatus } from '@/types/answer'
import * as fs from 'fs'
import path from 'path'
import { QuestionType } from '@/types/question';

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif']
const defaultMaxFileSize = 5 * 1024 * 1024 // 5MB


export async function POST(request: NextRequest) {
  let uploadedUrl: string | null = null
  try {
    const session = await getServerSession(authOptions)
    let userId: string | null = null

    if (session?.user?.id) {
      userId = session.user.id
    } else {
      // Fallback to userId cookie for regular users
      const cookieStore = cookies()
      const userIdCookie = cookieStore.get('userId')?.value
      if (userIdCookie) {
        userId = userIdCookie
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let questionId: string
    let submission: string | { url: string }
    let progressId: string
    let eventId: string
    let type: Question['type']
    let expectedAnswer: string
    let aiThreshold: number
    let content: string
    let imageDescription: string
    const contentType = request.headers.get('content-type') || ''
    const isImageUpload = contentType.includes('multipart/form-data')

    // Removed excessive logging - only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Content-Type:', `"${contentType}"`)
      console.log('isImageUpload:', isImageUpload)
    }

    if (isImageUpload) {
      const formData = await request.formData()
      const file = formData.get('file') as File
      questionId = formData.get('questionId') as string

      // Removed excessive logging - only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('File:', !!file, 'questionId:', questionId)
      }

      if (!file || !questionId) {
        return NextResponse.json({ error: 'File and questionId are required for image upload' }, { status: 400 })
      }

      const validation = imageUploadSchema.safeParse({ file, questionId })
      // Removed excessive logging - only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Image upload validation success:', validation.success)
      }
      if (!validation.success) {
        console.log('Validation errors:', validation.error?.issues)
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
      }

      // Fetch progress
      const progressData = await prisma.progress.findFirst({
        where: { userId },
        select: { id: true, eventId: true }
      })
      // Removed excessive logging - only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Progress fetched:', !!progressData, 'eventId:', progressData?.eventId)
      }

      if (!progressData) {
        return NextResponse.json({ error: 'No progress found for user' }, { status: 404 })
      }

      progressId = progressData.id
      eventId = progressData.eventId

      // Fetch question for validation and common fields
      const questionValidationData = await prisma.question.findFirst({
        where: {
          id: questionId,
          eventId
        },
        select: {
          id: true,
          type: true,
          expectedAnswer: true,
          aiThreshold: true,
          content: true,
          allowedFormats: true,
          maxFileSize: true,
          imageDescription: true,
        } satisfies Prisma.QuestionSelect
      })
      // Removed excessive logging - only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Question fetched:', !!questionValidationData, 'type:', questionValidationData?.type)
      }

      if (!questionValidationData || questionValidationData.type !== QuestionType.IMAGE) {
        return NextResponse.json({ error: 'Image question not found' }, { status: 404 })
      }

      const { type: qType, expectedAnswer: qExpected, aiThreshold: qAi, content: qContent, allowedFormats, maxFileSize, imageDescription: qImageDesc } = questionValidationData

      console.log('Fetched question:', { id: questionId, type: qType, expectedAnswer: qExpected })

      // if (qType !== QuestionType.IMAGE && (qExpected == null || (qExpected && qExpected.trim() === ''))) {
      //   return NextResponse.json({ error: 'Question missing expected answer' }, { status: 400 })
      // }

      type = qType as QuestionType
      expectedAnswer = qExpected ?? ''
      aiThreshold = qAi || 0
      content = qContent || ''
      imageDescription = qImageDesc ?? ''

      // Parse allowedFormats
      let questionAllowedFormats: string[]
      if (typeof allowedFormats === 'string') {
        questionAllowedFormats = allowedFormats.split(',').map(f => f.trim())
      } else if (Array.isArray(allowedFormats)) {
        questionAllowedFormats = allowedFormats as string[]
      } else {
        questionAllowedFormats = allowedMimeTypes
      }

      const questionMaxFileSize = maxFileSize || defaultMaxFileSize

      // Get buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Buffer validation
      const bufferValidation = bufferValidationSchema.safeParse({
        buffer,
        mimeType: file.type,
        size: file.size,
        allowedFormats: questionAllowedFormats,
        maxFileSize: questionMaxFileSize
      })
      // Removed excessive logging - only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Buffer validation success:', bufferValidation.success)
      }
      if (!bufferValidation.success) {
        console.log('Buffer validation errors:', bufferValidation.error?.issues)
        return NextResponse.json({ error: 'File validation failed: ' + bufferValidation.error.issues[0].message }, { status: 400 })
      }
      // Removed excessive logging - only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Passed buffer validation, about to fetch event for eventId:', eventId)
      }

      // Fetch event slug
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { slug: true }
      })

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      const { slug: eventSlug } = event

      // Determine extension
      let ext: string
      switch (file.type) {
        case 'image/jpeg':
          ext = 'jpg'
          break
        case 'image/png':
          ext = 'png'
          break
        case 'image/gif':
          ext = 'gif'
          break
        default:
          return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 })
      }

      // Upload
      const { url } = await storage.uploadImage(buffer, ext, questionId, eventSlug)
      uploadedUrl = url
      submission = { url }

      // Set common variables
      type = qType as QuestionType
      expectedAnswer = qExpected ?? ''
      aiThreshold = qAi
      content = qContent
    } else {
      const body = await request.json()
      const { questionId: qId, submission: sub, answer } = body
      questionId = qId
      const submissionValue = answer || sub

      if (!questionId || submissionValue === undefined || submissionValue === null) {
        return NextResponse.json({ error: 'questionId and submission are required' }, { status: 400 })
      }

      submission = submissionValue

      // Fetch progress
      const progressData = await prisma.progress.findFirst({
        where: { userId },
        select: { id: true, eventId: true }
      })

      if (!progressData) {
        return NextResponse.json({ error: 'No progress found for user' }, { status: 404 })
      }

      progressId = progressData.id
      eventId = progressData.eventId

      // Fetch question
      const questionData = await prisma.question.findFirst({
        where: {
          id: questionId,
          eventId
        },
        select: {
          id: true,
          type: true,
          expectedAnswer: true,
          aiThreshold: true,
          content: true,
          imageDescription: true
        }
      })

      if (!questionData) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 })
      }

      const { type: qType, expectedAnswer: qExpected, aiThreshold: qAi, content: qContent, imageDescription: qImageDesc } = questionData

      console.log('Fetched question:', { id: questionId, type: qType, expectedAnswer: qExpected })

      // if (qType !== QuestionType.IMAGE && (qExpected == null || (qExpected && qExpected.trim() === ''))) {
      //   return NextResponse.json({ error: 'Question missing expected answer' }, { status: 400 })
      // }

      type = qType as QuestionType
      expectedAnswer = qExpected ?? ''
      aiThreshold = qAi || 0
      content = qContent || ''
      imageDescription = qImageDesc ?? ''
    }

let status: 'correct' | 'incorrect' | 'pending' = 'correct'
    let aiScore: number | null = 10
    let explanation: string | null = 'Accepted automatically'

    // Prepare submission for storage
    let storedSubmission: string | object = typeof submission === 'string' ? submission : { url: submission.url }

    // Check if answer already exists
    const existingAnswer = await prisma.answer.findFirst({
      where: {
        progressId,
        questionId
      },
      select: {
        id: true,
        status: true,
        aiScore: true
      }
    })





    // Removed excessive logging - only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('AI response parsed, aiScore:', aiScore, 'status:', status)
    }

    // Removed excessive logging - only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('About to start transaction, progressId:', progressId, 'questionId:', questionId)
    }

    // Insert or update answer in transaction
    const transactionResult = await prisma.$transaction(async (tx) => {
      const answerData: Prisma.AnswerCreateInput = {
        progress: {
          connect: { id: progressId }
        },
        question: {
          connect: { id: questionId }
        },
        submission: storedSubmission,
        status,
        ...(aiScore !== null && { aiScore }),
        ...(explanation && { explanation }),
      };

      let answerId: string;
      if (existingAnswer) {
        const updatedAnswer = await tx.answer.update({
          where: { id: existingAnswer.id },
          data: {
            ...answerData,
            // Don't update relations on update if not changing
            progress: undefined,
            question: undefined,
          },
          select: { id: true }
        });
        answerId = updatedAnswer.id;
      } else {
        const newAnswer = await tx.answer.create({
          data: answerData,
          select: { id: true }
        });
        answerId = newAnswer.id;
      }

      console.log(`[ANSWERS POST] User ${userId}, Question ${questionId}, Type ${type}, Submission processed. Status: ${status}, aiScore: ${aiScore}`);
  
      // Check and compute progress correctly.
      // Previously the code used the number of recorded answers as the denominator
      // (i.e. totalQuestions = allAnswers.length) which incorrectly marked an
      // event complete when every recorded answer was correct even if there were
      // remaining unanswered questions. To avoid that race/logic bug we derive
      // the true total number of questions from progress.questionOrder (preferred)
      // or fall back to counting questions by eventId. All reads/updates remain
      // inside the same transaction to preserve atomicity.
      const allAnswers = await tx.answer.findMany({
        where: { progressId },
        select: { status: true }
      })
  
      // Get progress row inside the same tx to read questionOrder or eventId.
      const progressRow = await tx.progress.findUnique({
        where: { id: progressId },
        select: { questionOrder: true, eventId: true }
      })
  
      let totalQuestions = 0
      if (progressRow?.questionOrder && Array.isArray(progressRow.questionOrder)) {
        // questionOrder is stored as JSON array of question IDs
        totalQuestions = (progressRow.questionOrder as any[]).length
      } else if (progressRow?.eventId) {
        // Fallback: count questions for the event
        totalQuestions = await tx.question.count({ where: { eventId: progressRow.eventId } })
      }
  
      const correctCount = allAnswers.filter(a => a.status === 'correct').length
      let completed = false
  
      console.log(`[ANSWERS POST] Progress calc - User ${userId}, Progress ${progressId}: totalQuestions=${totalQuestions}, allAnswers=${allAnswers.length}, correctCount=${correctCount}, newStatus=${status === 'correct' ? 'correct' : 'not correct'}`);
  
      // Only mark completed when the number of correct answers equals the real
      // total number of questions for the event.
      if (totalQuestions > 0 && correctCount === totalQuestions) {
        completed = true
        // Update progress (use tx to keep operation atomic within this transaction)
        await tx.progress.update({
          where: { id: progressId },
          data: { completed: true }
        })
        console.log(`[ANSWERS POST] Setting completed=true for progress ${progressId} (all questions correct)`);
      }
  
      return { answerId, completed, stats: { correctCount, totalQuestions } }
    })

    const { answerId, completed, stats } = transactionResult

    const accepted = status === 'correct'
    const responseStatus: AnswerStatus = status === 'correct' ? 'accepted' : status === 'incorrect' ? 'rejected' : 'pending'

    return NextResponse.json({
      accepted,
      status: responseStatus
    })
  } catch (error) {
    console.error('Answers POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // For users, rely on userId cookie since NextAuth is admin-only
    const cookieStore = cookies()
    const userIdCookie = cookieStore.get('userId')?.value

    if (process.env.NODE_ENV === 'development') {
      console.log('GET /api/answers - userId from cookie:', userIdCookie ? 'Present' : 'Missing')
    }

    if (!userIdCookie) {
      return NextResponse.json({ error: 'Please register to continue' }, { status: 401 })
    }

    const userId = userIdCookie

    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('questionId')

    if (!questionId) {
      return NextResponse.json({ error: 'questionId is required' }, { status: 400 })
    }

    const answer = await prisma.answer.findFirst({
      where: {
        questionId,
        progress: {
          userId
        }
      },
      select: {
        id: true,
        progressId: true,
        questionId: true,
        submission: true,
        aiScore: true,
        status: true,
        createdAt: true
      }
    })

    if (!answer) {
      return NextResponse.json({ answer: null })
    }

    const computedStatus: AnswerStatus = answer.status === 'correct' ? 'accepted' : answer.status === 'incorrect' ? 'rejected' : 'pending'

    const answerWithStatus = {
      ...answer,
      computedStatus
    }

    return NextResponse.json({ answer: answerWithStatus })
  } catch (error) {
    console.error('Answers GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
