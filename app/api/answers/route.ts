import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { Question } from '@/types/question'
import storage from '@/lib/storage'
import { imageUploadSchema, bufferValidationSchema } from '@/lib/validation'
import type { AnswerSubmission } from '@/types/answer'
import type { Question } from '@/types/question'

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif']
const defaultMaxFileSize = 5 * 1024 * 1024 // 5MB


export async function POST(request: NextRequest) {
  let uploadedUrl: string | null = null
  try {
    const userId = request.cookies.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 })
    }

    let questionId: string
    let submission: string | { url: string }
    let progressId: string
    let eventId: string
let uploadedUrl: string | null = null
let type: Question['type']
let expectedAnswer: string
let aiThreshold: number
let content: string
const contentType = request.headers.get('content-type') || ''
    const isImageUpload = contentType.includes('multipart/form-data')

    if (isImageUpload) {
      const formData = await request.formData()
      const file = formData.get('file') as File
      questionId = formData.get('questionId') as string

      if (!file || !questionId) {
        return NextResponse.json({ error: 'File and questionId are required for image upload' }, { status: 400 })
      }

      const validation = imageUploadSchema.safeParse({ file, questionId })
      if (!validation.success) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
      }

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

      // Fetch question for validation and common fields
      const questionValidationData = await prisma.question.findFirst({
        where: {
          id: questionId,
          eventId
        },
        select: {
          type: true,
          expectedAnswer: true,
          aiThreshold: true,
          content: true,
          allowedFormats: true,
          maxFileSize: true,
        } satisfies Prisma.QuestionSelect
      })

      if (!questionValidationData || questionValidationData.type !== 'image') {
        return NextResponse.json({ error: 'Image question not found' }, { status: 404 })
      }

      const { type: qType, expectedAnswer: qExpected, aiThreshold: qAi, content: qContent, allowedFormats, maxFileSize } = questionValidationData

type = qType
expectedAnswer = qExpected
aiThreshold = qAi || 0
content = qContent

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

      if (!bufferValidation.success) {
        return NextResponse.json({ error: 'File validation failed: ' + bufferValidation.error.issues[0].message }, { status: 400 })
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
      type = qType
      expectedAnswer = qExpected
      aiThreshold = qAi
      content = qContent
    } else {
      const body: AnswerSubmission & { progressId?: string } = await request.json()
      const { questionId: qId, submission: sub } = body
      questionId = qId
      submission = sub

      if (!questionId || submission === undefined || submission === null) {
        return NextResponse.json({ error: 'questionId and submission are required' }, { status: 400 })
      }

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
          type: true,
          expectedAnswer: true,
          aiThreshold: true,
          content: true
        }
      })

      if (!questionData) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 })
      }

      const { type: qType, expectedAnswer: qExpected, aiThreshold: qAi, content: qContent } = questionData

type = qType
expectedAnswer = qExpected
aiThreshold = qAi || 0
content = qContent
      type = qType
      expectedAnswer = qExpected
      aiThreshold = qAi
      content = qContent
    }

    let status: 'correct' | 'incorrect' | 'pending' = 'pending'
    let aiScore: number | null = null

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

    // AI analysis for all types: text, multiple_choice, image
    let messages: any[] = []
    let explanation = 'Validation completed'

    const imageUrl = typeof submission === 'string' ? submission : submission.url

    if (type === 'image') {
      const prompt = `The challenge is: "${content}". The expected description is: "${expectedAnswer}". Analyze the image at URL: ${imageUrl} to see if it matches the expected answer. Rate the similarity on a scale of 0 to 10. Provide a brief explanation of why you gave that score.

Respond in this exact format:

Score: [number 0-10]

Explanation: [brief explanation]`

      messages = [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }]
    } else {
      // text or multiple_choice
      const answerType = type === 'multiple_choice' ? 'multiple choice selection' : 'text answer'
      const userInputTerm = type === 'multiple_choice' ? 'selection' : 'answer'
      const prompt = `The challenge is a ${answerType}: "${content}". The expected ${userInputTerm} is: "${expectedAnswer}". The user's ${userInputTerm}: "${submission}". Rate the similarity between the user's ${userInputTerm} and the expected one on a scale of 0 to 10. Provide a brief explanation of why you gave that score.

Respond in this exact format:

Score: [number 0-10]

Explanation: [brief explanation]`

      messages = [{ role: 'user', content: prompt }]
    }

    console.log('API Key Loaded:', !!process.env.OPENROUTER_API_KEY ? 'Yes (masked)' : 'No');
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages,
        temperature: 0,
      }),
    })

    if (!openRouterResponse.ok) {
      const responseText = await openRouterResponse.text();
      console.log('OpenRouter Response:', responseText);
      throw new Error(`OpenRouter API error: ${openRouterResponse.statusText}`)
    }

    const data = await openRouterResponse.json()
    const text = data.choices[0].message.content.trim()

    // Parse score and explanation
    const scoreMatch = text.match(/Score:\s*(\d+)/i)
    const explanationMatch = text.match(/Explanation:\s*(.+)$/i, 'm')

    aiScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0
    explanation = explanationMatch ? explanationMatch[1].trim() : 'Unable to parse AI response'

    if (isNaN(aiScore) || aiScore < 0 || aiScore > 10) {
      aiScore = 0
    }

    if (aiScore >= aiThreshold) {
      status = 'correct'
    } else {
      status = 'incorrect'
    }

    // Insert or update answer in transaction
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Insert or update answer
      const answerData = {
        progressId,
        questionId,
        submission: storedSubmission,
        aiScore,
        status
      }

      let answerId: string

      if (existingAnswer) {
        // Update
        const updatedAnswer = await tx.answer.update({
          where: { id: existingAnswer.id },
          data: answerData,
          select: { id: true }
        })
        answerId = updatedAnswer.id
      } else {
        // Insert
        const newAnswer = await tx.answer.create({
          data: answerData,
          select: { id: true }
        })
        answerId = newAnswer.id
      }

      // Check if all questions completed
      const allAnswers = await tx.answer.findMany({
        where: { progressId },
        select: { status: true }
      })

      const totalQuestions = allAnswers.length
      const correctCount = allAnswers.filter(a => a.status === 'correct').length

      let completed = false
      if (totalQuestions > 0 && correctCount === totalQuestions) {
        completed = true
        // Update progress
        await tx.progress.update({
          where: { id: progressId },
          data: { completed: true }
        })
      }

      return { answerId, completed, stats: { correctCount, totalQuestions } }
    })

    const { answerId, completed, stats } = transactionResult

    return NextResponse.json({
      answerId,
      status,
      aiScore,
      explanation,
      completed,
      stats
    })
  } catch (error) {
    console.error('Answers API error:', error)
    if (uploadedUrl) {
      await storage.cleanupImage(uploadedUrl)
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}